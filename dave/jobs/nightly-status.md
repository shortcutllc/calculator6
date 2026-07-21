Dave, send the nightly status one-liner. This exists so silence is always a bug, never calm.

1. Read state/budget.json and state/logs/runs.log (today's entries only).
2. DM Will ONE line via node tools/slack-dm.mjs:
   "Dave nightly: N calls (~$X at API rates), jobs run: [names], errors: [none | short list]."
3. If any job errored today or a watermark shows a job silently didn't run, add ONE more line
   naming it plainly.

Nothing else. No analysis, no suggestions — those belong to the morning brief. Under 40 words.
