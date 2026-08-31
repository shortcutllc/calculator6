// dave query helper — read-only. Usage: node tools/q.mjs '<js body using sb>'
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const DAVE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO = path.join(DAVE_DIR, '..');
for (const f of [path.join(REPO, '.env'), path.join(DAVE_DIR, '.env'), path.join(process.env.HOME||'','.shortcut-cron.env')]) {
  try { for (const line of fs.readFileSync(f,'utf8').split('\n')) { const m=line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/); if(m && !(m[1] in process.env)) process.env[m[1]]=m[2].trim(); } } catch {}
}
const { createClient } = await import(path.join(REPO,'node_modules','@supabase/supabase-js','dist','main','index.js')).catch(()=>import('@supabase/supabase-js'));
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false} });
const body = process.argv[2];
const fn = new Function('sb','console',`return (async()=>{ ${body} })()`);
await fn(sb, console);
