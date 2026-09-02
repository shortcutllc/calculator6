// Run lib/pipeline-board.js against prod data for one rep, print stage counts + top rows.
// usage: node scripts/debug/pipeline-board-local.mjs "Marc Levitan"
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { buildBoard } from '../../netlify/functions/lib/pipeline-board.js';
const env = Object.fromEntries(readFileSync('.env','utf8').split(/\r?\n/).filter(l=>l&&!l.startsWith('#')&&l.includes('=')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i),l.slice(i+1).replace(/^"|"$/g,'')]}));
const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false}});
const t0=Date.now(); const b=await buildBoard(sb, process.argv[2]||'Marc Levitan');
console.log(b.rep, `${Date.now()-t0}ms`, JSON.stringify(b.counts));
for(const st of ['won','proposal_sent','active','discovery','future']) console.log(' ',st, b.rows.filter(r=>r.stage===st).slice(0,6).map(r=>`${r.company||'?'}${r.name?' / '+r.name:''}`).join(' | '));
