import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const DAVE = path.dirname(fileURLToPath(import.meta.url)); const REPO = path.join(DAVE,'..','..');
for (const f of [path.join(REPO,'.env'), path.join(DAVE,'..','.env')]) { try { for (const line of fs.readFileSync(f,'utf8').split('\n')){const m=line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/); if(m&&!(m[1] in process.env))process.env[m[1]]=m[2].trim();}}catch{} }
const { createClient } = await import(path.join(REPO,'node_modules','@supabase/supabase-js','dist','index.mjs'));
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const gmail = await import(path.join(REPO,'netlify','functions','lib','gmail.js'));
const token = await gmail.getAccessToken(sb, 'will@getshortcut.co');
if(!token){console.log('NO TOKEN');process.exit(0);}
for(const q of process.argv.slice(2)){
  const msgs = await gmail.searchMessages(token, `{from:${q} to:${q}}`, 25);
  console.log(`=== ${q} : ${msgs.length} msgs ===`);
  for(const m of msgs){
    const full = await gmail.getMessageFull(token, m); if(!full){console.log("   (null msg)");continue;}
    const hdrs = Object.fromEntries((full.payload?.headers||[]).map(h=>[h.name.toLowerCase(),h.value]));
    const from=(hdrs.from||''); const local=q.split('@')[0].toLowerCase();
    const inbound = from.toLowerCase().includes(q.toLowerCase()) || from.toLowerCase().includes(local);
    console.log((inbound?'<< INBOUND ':'>> sent    ')+'| '+(hdrs.date||'')+' | from: '+from.slice(0,45)+' | '+(hdrs.subject||'').slice(0,45));
  }
}
