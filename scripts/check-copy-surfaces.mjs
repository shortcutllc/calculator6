/**
 * check-copy-surfaces.mjs — enforce that every customer-facing COPY surface draws
 * from the brain (positioning.js, the machine twin of memory/messaging_spine.md)
 * instead of hardcoding the service menu / proof / voice inline.
 *
 * Born 2026-07-07: the founder-note engine silently forked from the brain for a
 * whole project — it hardcoded a stale service list (causing sameness + fragments)
 * and never learned Shortcut serves remote teams via the virtual track. Prose
 * guardrails in memory didn't prevent it; this code guardrail does.
 *
 * Run:  node scripts/check-copy-surfaces.mjs   (exit 1 on any violation)
 * Add to CI / pre-deploy so a drafting surface can never drift off-brain again.
 */
import { readFileSync } from 'fs';

// Files that generate customer-facing copy and MUST import positioning.js.
const COPY_SURFACES = [
  'netlify/functions/lib/founder-note.js',
  'netlify/functions/draft-outreach.js',
];

let failed = false;
for (const rel of COPY_SURFACES) {
  let src;
  try { src = readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8'); }
  catch { console.error(`  MISSING  ${rel} (listed as a copy surface but not found)`); failed = true; continue; }

  // The one durable guarantee: the surface IMPORTS the brain twin and injects it.
  // (A one-line "what Shortcut is" descriptor alongside this is fine — draft-outreach
  // does exactly that. The failure mode we prevent is a surface that owns its OWN
  // stale positioning instead of the brain's, which this catches.)
  const importsBrain = /from ['"][^'"]*positioning\.js['"]/.test(src) && /buildPositioningBlock/.test(src);
  if (!importsBrain) {
    console.error(`  OFF-BRAIN  ${rel} does NOT import positioning.js / buildPositioningBlock — wire it to the brain (see CLAUDE.md "Copy surfaces MUST use the brain").`);
    failed = true;
  }
}

if (failed) { console.error('\ncheck-copy-surfaces: FAIL — a copy surface drifted from the brain.'); process.exit(1); }
console.log(`check-copy-surfaces: OK — ${COPY_SURFACES.length} copy surfaces wired to positioning.js.`);
