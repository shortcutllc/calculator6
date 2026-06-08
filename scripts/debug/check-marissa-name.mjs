import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { leadPicture } = await import('../../netlify/functions/lib/lead-picture.js');
const pic = await leadPicture(sb, { email: 'marissacreyes10@gmail.com' });
console.log('identity:', JSON.stringify(pic.identity, null, 2));
console.log('workhuman exists?', !!pic.workhuman);
console.log('workhuman.name:', JSON.stringify(pic.workhuman?.name));
