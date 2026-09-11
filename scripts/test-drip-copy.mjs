const B = new URL('../netlify/functions/lib/', import.meta.url).href;
const { renderBody } = await import(B+'drip-engine.js');
const { STEPS, LOCKED_LINES, step1For } = await import(B+'drip-copy.js');
const T=(n,ok,extra='')=>console.log((ok?'PASS  ':'FAIL  ')+n+(extra?'\n        '+extra:''));
const r=(l)=>renderBody(step1For(l).replace(/\{\{sign_off\}\}/g,'Jaimie'), l);

// THE BUG THIS SPLIT EXISTS TO PREVENT
const noSvc = { email:'a@b.com', first_name:'Dana', company_name:'Exos' };
const outNo = r(noSvc);
T('lead with no service NEVER gets the "we were in for" claim', !/we were in for/.test(outNo));
T('lead with no service NEVER gets "we last worked together"', !/last worked together/.test(outNo));
T('lead with no service gets "since we last spoke"', /since we last spoke/.test(outNo));

// booked path
const booked = { email:'c@d.com', first_name:'Kate', booked_before:true, custom_fields:{last_service:'chair massage'} };
const outB = r(booked);
T('booked lead names the real service', /we were in for chair massage\./.test(outB));
// option 3 removed the second time-clause; the booked lead's ONLY history claim
// is now in the opener, which is what we assert instead.
T('booked lead makes its history claim exactly once', (outB.match(/we were in for/g)||[]).length===1);

// booked_before true but service missing -> must fall back, never render blank
const halfBooked = { email:'e@f.com', first_name:'Sam', booked_before:true };
const outH = r(halfBooked);
T('booked flag WITHOUT a service falls back to the safe variant', /since we last spoke/.test(outH) && !/we were in for/.test(outH));

// no empty merge artifacts anywhere
const cases=[noSvc, booked, halfBooked, {email:'g@h.com'}];
T('no unresolved merge tokens in any case', cases.every(c=>!/\{\{/.test(r(c))));
T('no dangling punctuation from an empty merge', cases.every(c=>!/ \.|,\s*\.|for \./.test(r(c))));
T('missing first_name degrades to "there"', /^Hi there,/.test(r({email:'g@h.com'})));

// approved copy is byte-identical in BOTH variants
for (const L of LOCKED_LINES) {
  T(`locked line identical in both variants: "${L.slice(0,46)}..."`, outB.includes(L) && outNo.includes(L));
}

// links intact
T('site link present in both', [outB,outNo].every(o=>o.includes('](https://www.getshortcut.co/)')));
T('campaign link present in both', [outB,outNo].every(o=>o.includes('mental-health-day)')));

// formatting matches the screenshot: 5 service lines, bold labels, no blank lines between
const svcBlock = outNo.split('or a mix of both:\n\n')[1].split(/\n\nWe['\u2019]re also/)[0];
T('service list is 5 consecutive lines, no blank lines between', svcBlock.split('\n').length===5, svcBlock.split('\n').map(s=>s.slice(0,28)).join(' | '));
T('every service label is bold', svcBlock.split('\n').every(l=>/^\*\*[^*]+:\*\*/.test(l)));

// subject spin: body must never vary
const bodies=new Set(), subjects=new Set();
for(let i=0;i<300;i++){ const l={email:`u${i}@x.com`,first_name:'X'}; bodies.add(r(l)); subjects.add(renderBody(STEPS[1].subject,l)); }
T('body is byte-identical across 300 leads (no body spintax)', bodies.size===1);
T(`subject varies (${subjects.size} of 4)`, subjects.size>=3, [...subjects].join(' | '));

// follow-ups
[2,3].forEach(n=>{
  const b=renderBody(STEPS[n].body.replace(/\{\{sign_off\}\}/g,'Jaimie'), noSvc);
  T(`touch ${n} resolves cleanly and is threaded (no subject)`, !/\{\{/.test(b) && STEPS[n].subject==='');
});

// option 3: the time clause must appear exactly ONCE, in the opener
const bodyB = r(booked), bodyS = r(noSvc);
T('no "since we last connected" anywhere', ![bodyB,bodyS].some(b=>/since we last connected/.test(b)));
T('booked: time clause appears once', (bodyB.match(/since we (were in for|last spoke|last worked together)/g)||[]).length===1);
T('spoke: time clause appears once', (bodyS.match(/since we (were in for|last spoke|last worked together)/g)||[]).length===1);
T('approved line restored', [bodyB,bodyS].every(b=>b.includes('Shortcut looks different, and does more. New site, new services.')));
// below the opener the two variants must be byte-identical
const belowB = bodyB.split('\n').slice(3).join('\n'), belowS = bodyS.split('\n').slice(3).join('\n');
T('variants byte-identical below the opener', belowB===belowS);
