/**
 * heartbeat — a job stamps "I ran successfully" into cron_heartbeats.
 *
 * Called at the END of each critical cron job (local script or Netlify fn). The
 * always-on Netlify cron-heartbeat-monitor reads these rows and alerts if any
 * job goes stale. FAIL-SAFE BY DESIGN: this never throws — telemetry must never
 * be able to break the job it is measuring.
 *
 * Usage:  await stampHeartbeat(sb, 'enrich-replies', { host: 'local-mac', note: `${n} classified` });
 */
export async function stampHeartbeat(sb, jobName, { status = 'ok', note = null, host = null } = {}) {
  try {
    await sb.from('cron_heartbeats').upsert(
      {
        job_name: jobName,
        last_run_at: new Date().toISOString(),
        status,
        note: note ? String(note).slice(0, 500) : null,
        host,
      },
      { onConflict: 'job_name' },
    );
  } catch (e) {
    // Swallow — a heartbeat failure must not fail the job.
    try { console.warn(`[heartbeat] stamp failed for ${jobName}: ${e.message}`); } catch { /* noop */ }
  }
}
