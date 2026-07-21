#!/bin/zsh
# Dave job runner — fired by launchd. Catch-up-safe and budget-guarded.
# Usage: run-job.sh <job-name>   (job prompt lives at dave/jobs/<job-name>.md)
#
# Cost rules enforced here, BEFORE any model call:
#  1. Watermark: each job has a minimum interval; if it ran recently, exit silently ($0).
#  2. Budget: if the daily job cap is spent, exit and log ($0).
# launchd StartCalendarInterval fires missed jobs on wake, so a sleeping Mac delays work
# instead of losing it — jobs must therefore be idempotent "do everything due since last run".

set -u
JOB="${1:?usage: run-job.sh <job-name>}"
DAVE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
STATE="$DAVE_DIR/state"
LOGS="$STATE/logs"
mkdir -p "$LOGS"
PROMPT_FILE="$DAVE_DIR/jobs/$JOB.md"
[ -f "$PROMPT_FILE" ] || { echo "no job prompt: $PROMPT_FILE" >> "$LOGS/$JOB.err"; exit 1; }

# Environment: nvm (claude CLI + node), repo secrets, Dave's Slack tokens.
export NVM_DIR="$HOME/.nvm"; [ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"
[ -f "$HOME/.shortcut-cron.env" ] && { set -a; source "$HOME/.shortcut-cron.env"; set +a; }
[ -f "$DAVE_DIR/.env" ] && { set -a; source "$DAVE_DIR/.env"; set +a; }

# --- 1. Day guard + watermark (min interval hours per job; default 20h ≈ once daily) ---
DOW=$(date +%u)  # 1=Mon .. 7=Sun
case "$JOB" in
  monday-strategy) [ "$DOW" -le 2 ] || exit 0; MIN_H=100 ;;  # Mon (or Tue catch-up), weekly
  influence-scan)  [ "$DOW" -ge 4 ] || exit 0; MIN_H=100 ;;  # Thu/Fri-ish, weekly
  nightly-status) MIN_H=12 ;;
  *) MIN_H=20 ;;
esac
WM="$STATE/watermark-$JOB"
if [ -f "$WM" ]; then
  LAST=$(cat "$WM" 2>/dev/null || echo 0)
  NOW=$(date +%s)
  ELAPSED_H=$(( (NOW - LAST) / 3600 ))
  [ "$ELAPSED_H" -lt "$MIN_H" ] && exit 0   # ran recently — skip, zero cost
fi

# --- 2. Budget gate ---
node -e "import('$DAVE_DIR/gateway/budget.mjs').then(b => process.exit(b.canSpend('job').ok ? 0 : 3))" \
  || { echo "$(date '+%F %T') $JOB refused: budget" >> "$LOGS/budget-refusals.log"; exit 0; }

# --- 3. Run the job (ephemeral session, fresh context, job prompt as input) ---
cd "$DAVE_DIR"
OUT=$(claude -p "$(cat "$PROMPT_FILE")" \
  --output-format json \
  --model "${DAVE_MODEL:-claude-opus-4-8}" \
  --allowedTools "Read,Grep,Glob,WebSearch,WebFetch,Write,Edit,Bash" \
  --max-turns 40 \
  2>> "$LOGS/$JOB.err")
RC=$?
echo "$OUT" > "$STATE/last-$JOB.json"

# --- 4. Record spend + watermark + dead-man's ping ---
COST=$(echo "$OUT" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{console.log(JSON.parse(d).total_cost_usd||0)}catch{console.log(0)}})")
node -e "import('$DAVE_DIR/gateway/budget.mjs').then(b => b.record('job', $COST))"
[ $RC -eq 0 ] && date +%s > "$WM"
[ $RC -eq 0 ] && [ -n "${HEALTHCHECKS_URL:-}" ] && curl -fsS -m 10 "$HEALTHCHECKS_URL" > /dev/null 2>&1
echo "$(date '+%F %T') $JOB rc=$RC cost=\$$COST" >> "$LOGS/runs.log"
exit $RC
