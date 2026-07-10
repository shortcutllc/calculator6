import { useEffect, useRef } from 'react';

/**
 * Carrier Wellness Funds one-pager — public marketing page at /wellness-funds.
 * High-fidelity recreation of the design handoff (design_handoff_wellness_funds_onepager).
 * Scoped under `.wfop` so its bespoke CSS never leaks into the app shell.
 * Assets live in public/wellness-funds/. Copy is spine-checked (messaging_spine v3).
 */

// 19 coverage-map city dots, viewBox 960×593 (from the design spec).
const MAP_DOTS: [number, number][] = [
  [150.2, 77.6], [134.7, 114.7], [96.9, 259.7], [141, 345.7], [151.9, 374.7],
  [234.5, 376.7], [357.6, 270.2], [476.1, 411.1], [460.1, 459.3], [499.4, 469.3],
  [525.9, 174.6], [607.5, 229.7], [670.9, 213.8], [630.3, 338.9], [672.4, 381.2],
  [763.7, 522.9], [767.6, 264.6], [803.4, 221], [836.4, 179.8],
];

const A = '/wellness-funds';
// Gallery uses only massage + mindfulness assets (Will 2026-07-11): the same videos the
// book-a-call page uses — self-hosted massage clip + Courtney's mindfulness (Sanity CDN) —
// plus real massage photos for the rest. No text baked into any of them.
const MASSAGE_VIDEO = '/landing-videos/massage.mp4';
const MINDFULNESS_VIDEO = 'https://cdn.sanity.io/files/7qf1r87p/production/e94281566161c5674ab843b72e54b5ea39364609.mp4';
// Will's Google Calendar appointment schedule (SENDER_TO_CALENDAR in workhumanOutreachTemplates).
const WILL_CALENDAR = 'https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ32vKfzSRhuWGXuzgv0w3x21bOQnmWva5xVuPtCsMF3iq25Oh_vInOsmmHr13npkewS-GnsQRqu';

const CSS = `
.wfop { --brand:#003756; --brand-deep:#003C5E; --teal:#018EA2; --cyan:#9EFAFF; --coral:#FF5050;
  --ink:#032232; --ink-soft:#45596A; --ground:#FFFFFF; --panel:#FFFFFF; --tint:#F1F6F5; --line:#E2E9E8;
  --shadow:0 1px 2px rgba(3,34,50,.05),0 10px 30px rgba(3,34,50,.06);
  --font:'Outfit',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
  background:var(--ground); color:var(--ink); font-family:var(--font); line-height:1.55;
  -webkit-font-smoothing:antialiased; min-height:100vh; }
.wfop *{ box-sizing:border-box; }
.wfop .sheet{ max-width:1140px; margin:0 auto; padding:52px 48px 40px; }
.wfop .top{ display:flex; align-items:center; justify-content:space-between; gap:16px; margin-bottom:44px; }
.wfop .top .logo, .wfop .top .logo svg{ height:30px; width:auto; display:block; }
.wfop .top .tag{ font-size:12.5px; color:var(--ink-soft); letter-spacing:.02em; text-align:right; }
.wfop .eyebrow{ font-size:12px; font-weight:700; letter-spacing:.14em; text-transform:uppercase; color:var(--coral); margin:0 0 16px; }
.wfop h1{ font-weight:800; font-size:clamp(32px,5vw,46px); line-height:1.03; letter-spacing:-.035em; text-wrap:balance; margin:0 0 18px; color:var(--brand); }
.wfop .lede{ font-size:18px; line-height:1.5; color:var(--ink-soft); max-width:60ch; margin:0; }
.wfop .lede strong{ color:var(--ink); font-weight:600; }
.wfop .divider{ height:1px; background:var(--line); margin:40px 0; border:0; }
.wfop section{ margin:34px 0; }
.wfop .label{ font-family:var(--font); font-size:12px; font-weight:700; letter-spacing:.09em; text-transform:uppercase; color:var(--ink-soft); margin:0 0 16px; display:flex; align-items:center; gap:9px; }
.wfop .label::before{ content:""; width:7px; height:7px; border-radius:50%; background:var(--coral); flex:none; }
.wfop h2{ font-weight:800; font-size:24px; letter-spacing:-.02em; margin:0 0 12px; color:var(--brand); }
.wfop p{ margin:0 0 12px; color:var(--ink-soft); font-size:16px; }
.wfop .note{ font-size:15.5px; color:var(--ink-soft); max-width:60ch; }
.wfop .note b{ color:var(--ink); font-weight:600; }
.wfop .funds{ display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin:2px 0 16px; }
.wfop .fund{ background:var(--panel); border:1px solid var(--line); border-top:3px solid var(--coral); border-radius:16px; padding:20px; box-shadow:var(--shadow); }
.wfop .fund .carrier{ font-weight:700; font-size:18px; color:var(--brand); margin:0 0 3px; }
.wfop .fund .prog{ font-size:13.5px; color:var(--ink-soft); margin:0; }
.wfop .statement{ font-size:34px; font-weight:800; letter-spacing:-.03em; line-height:1.05; margin:0; color:var(--brand); }
.wfop .op-gallery{ display:grid; grid-template-columns:1.5fr 1fr 1fr; grid-template-rows:1fr 1fr; gap:8px; height:512px; border-radius:20px; overflow:hidden; margin:26px 0 34px; box-shadow:var(--shadow); }
.wfop .op-gtile{ position:relative; overflow:hidden; background:var(--tint); }
.wfop .op-gtile img, .wfop .op-gtile video{ width:100%; height:100%; object-fit:cover; object-position:66% center; display:block; transition:transform 600ms ease; }
.wfop .op-gtile:hover img, .wfop .op-gtile:hover video{ transform:scale(1.04); }
.wfop .op-gtile.main{ grid-row:1 / 3; grid-column:1; }
.wfop .op-gtag{ position:absolute; left:12px; bottom:12px; background:#fff; color:var(--brand); font-weight:700; font-size:12px; border-radius:999px; padding:6px 13px; box-shadow:0 2px 8px rgba(9,54,79,.18); }
.wfop .svc-tiles{ display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin:2px 0 14px; }
.wfop .svc-tile{ border-radius:16px; overflow:hidden; border:1px solid var(--line); background:var(--panel); box-shadow:var(--shadow); display:flex; flex-direction:column; }
.wfop .svc-tile .ph{ aspect-ratio:5 / 4; overflow:hidden; }
.wfop .svc-tile .ph img{ width:100%; height:100%; object-fit:cover; display:block; }
.wfop .svc-tile .cap{ padding:12px 15px; font-weight:600; font-size:15px; color:var(--brand); }
.wfop .svc-tile .sub{ display:block; font-weight:400; font-size:12.5px; line-height:1.4; margin-top:4px; color:var(--ink-soft); }
.wfop .svc-tile.nutri .ph{ background:#55BA90; display:flex; align-items:center; justify-content:center; }
.wfop .svc-tile.nutri .ph img{ width:auto; height:82%; object-fit:contain; }
.wfop .svc-tile.zoom .ph{ background:var(--cyan); display:flex; align-items:center; justify-content:center; }
.wfop .svc-tile.zoom .zicon{ width:52px; height:52px; border-radius:14px; background:#fff; display:flex; align-items:center; justify-content:center; box-shadow:0 3px 10px rgba(3,34,50,.14); }
.wfop .svc-tile.zoom .zicon svg{ width:28px; height:28px; }
.wfop .svc-tile.zoom .cap{ color:#003756; } .wfop .svc-tile.zoom .sub{ color:#175071; }
.wfop ol.steps{ list-style:none; counter-reset:s; margin:2px 0 0; padding:0; display:grid; gap:15px; }
.wfop ol.steps li{ counter-increment:s; display:grid; grid-template-columns:38px 1fr; gap:15px; align-items:start; }
.wfop ol.steps li::before{ content:counter(s); font-weight:700; font-size:16px; color:#fff; background:var(--coral); width:38px; height:38px; display:grid; place-items:center; border-radius:10px; font-variant-numeric:tabular-nums; }
.wfop ol.steps .st{ font-size:16px; padding-top:6px; } .wfop ol.steps .st b{ color:var(--ink); font-weight:600; } .wfop ol.steps .st span{ color:var(--ink-soft); }
.wfop .feat4{ display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-top:24px; }
.wfop .feat{ border-radius:20px; padding:26px 28px 0; min-height:360px; display:flex; flex-direction:column; overflow:hidden; box-shadow:var(--shadow); }
.wfop .feat-kick{ font-size:11px; font-weight:700; letter-spacing:.14em; text-transform:uppercase; margin:0 0 10px; }
.wfop .feat-h{ font-size:23px; font-weight:800; letter-spacing:-.02em; line-height:1.04; margin:0 0 8px; }
.wfop .feat-p{ font-size:13.5px; line-height:1.5; margin:0; }
.wfop .feat.sky{ background:#9EFBFF; } .wfop .feat.sky .feat-kick{ color:#018EA2; } .wfop .feat.sky .feat-h{ color:#003756; } .wfop .feat.sky .feat-p{ color:rgba(3,34,50,.72); }
.wfop .feat.sky .guy{ width:100%; height:215px; object-fit:contain; object-position:center bottom; display:block; margin-top:auto; }
.wfop .feat.coralg{ background:linear-gradient(160deg,#FF6A5A,#FF5050); } .wfop .feat.coralg .feat-kick{ color:rgba(255,255,255,.85); } .wfop .feat.coralg .feat-h{ color:#fff; } .wfop .feat.coralg .feat-p{ color:rgba(255,255,255,.88); }
.wfop .feat.navy{ background:linear-gradient(160deg,#0A3E5C,#06293D); padding-bottom:20px; }
.wfop .feat.navy .feat-kick{ color:#9EFAFF; } .wfop .feat.navy .feat-h{ color:#fff; } .wfop .feat.navy .feat-h span{ color:#9EFAFF; } .wfop .feat.navy .feat-p{ color:rgba(255,255,255,.72); }
.wfop .mapwrap{ position:relative; margin-top:auto; padding-top:12px; }
.wfop .feat.navy .usmap{ width:100%; height:auto; display:block; }
.wfop .mapdots{ position:absolute; left:0; right:0; bottom:0; top:12px; width:100%; height:calc(100% - 12px); overflow:visible; }
.wfop .mapdots g{ transform:scale(0); transition:transform .55s cubic-bezier(.22,1.5,.5,1); }
.wfop .feat.navy.in .mapdots g{ transform:scale(1); }
.wfop .feat.aquag{ background:linear-gradient(160deg,#9EFAFF,#6FE9F0); padding-bottom:22px; }
.wfop .feat.aquag .feat-kick{ color:#018EA2; } .wfop .feat.aquag .feat-h{ color:#003756; } .wfop .feat.aquag .feat-p{ color:rgba(3,34,50,.72); }
.wfop .phonewrap{ display:flex; justify-content:center; margin-top:auto; padding-top:16px; }
.wfop .mini-phone{ width:192px; background:#fff; border-radius:18px 18px 0 0; padding:12px 12px 14px; box-shadow:0 -6px 24px rgba(3,34,50,.18); }
.wfop .mp-bar{ font-size:10.5px; font-weight:700; color:#032232; display:flex; align-items:center; gap:6px; padding-bottom:8px; border-bottom:1px solid #eef2f4; margin-bottom:8px; }
.wfop .mp-logo{ width:16px; height:16px; border-radius:50%; background:#FF5050; color:#fff; display:grid; place-items:center; font-size:9px; font-weight:700; }
.wfop .mp-step{ margin-left:auto; color:#9ab1ba; font-weight:600; }
.wfop .mp-opt{ display:flex; justify-content:space-between; align-items:center; font-size:11px; font-weight:600; color:#032232; border:1.5px solid #E2E9E8; border-radius:9px; padding:7px 9px; margin-bottom:6px; }
.wfop .mp-opt i{ width:12px; height:12px; border-radius:50%; border:1.5px solid #cfd9d8; }
.wfop .mp-opt.sel{ border-color:#FF5050; background:rgba(255,80,80,.06); }
.wfop .mp-opt.sel i{ border-color:#FF5050; background:#FF5050; box-shadow:inset 0 0 0 2.5px #fff; }
.wfop .mp-cta{ background:#FF5050; color:#fff; text-align:center; font-size:11px; font-weight:700; border-radius:9px; padding:8px; margin-top:2px; }
.wfop .mp-eyebrow{ font-size:9.5px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:#9ab1ba; margin:0 0 6px; }
.wfop .mp-stage{ position:relative; height:114px; }
.wfop .mp-screen{ position:absolute; inset:0; opacity:0; transition:opacity .45s ease; pointer-events:none; }
.wfop .mp-screen.on{ opacity:1; }
.wfop .mp-slots{ display:grid; grid-template-columns:1fr 1fr; gap:5px; margin-bottom:6px; }
.wfop .mp-slots span{ font-size:10.5px; font-weight:700; color:#032232; border:1.5px solid #E2E9E8; border-radius:8px; padding:6px 0; text-align:center; }
.wfop .mp-slots span.taken{ opacity:.35; text-decoration:line-through; }
.wfop .mp-slots span.sel{ background:#FF5050; border-color:#FF5050; color:#fff; }
.wfop .mp-check{ width:30px; height:30px; border-radius:50%; background:#55BA90; margin:10px auto 9px; display:flex; align-items:center; justify-content:center; }
.wfop .mp-check svg{ width:14px; height:14px; stroke:#fff; stroke-width:3; fill:none; }
.wfop .mp-done{ text-align:center; font-size:13px; font-weight:800; color:#032232; }
.wfop .mp-sub2{ text-align:center; font-size:10px; color:#7d939e; margin-top:3px; }
.wfop .stat-big{ font-size:46px; font-weight:800; letter-spacing:-.03em; color:#003756; line-height:1; }
.wfop .stat-lbl{ font-size:13px; font-weight:600; color:#175071; margin-top:4px; }
.wfop .stat-bar{ height:10px; border-radius:999px; background:rgba(3,34,50,.14); overflow:hidden; margin-top:10px; }
.wfop .stat-bar i{ display:block; height:100%; width:92%; border-radius:999px; background:#FF5050; }
.wfop .stat-wrap{ margin-top:auto; padding-top:18px; }
.wfop .stat-mini{ display:flex; gap:10px; margin-top:14px; }
.wfop .stat-mini > div{ flex:1; background:rgba(255,255,255,.6); border-radius:12px; padding:10px 12px; }
.wfop .stat-mini b{ font-size:20px; font-weight:800; color:#003756; display:block; }
.wfop .stat-mini span{ font-size:11px; font-weight:600; color:#175071; }
.wfop .receipt{ background:linear-gradient(160deg,#0A3E5C,#06293D); border:0; border-radius:20px; padding:32px 34px; box-shadow:var(--shadow); }
.wfop .receipt .rc-logo{ height:24px; width:auto; filter:brightness(0) invert(1); opacity:.92; margin:0 0 18px; display:block; }
.wfop .receipt p{ font-weight:700; font-size:23px; line-height:1.32; letter-spacing:-.02em; color:#fff; margin:0; text-wrap:balance; }
.wfop .receipt .rc-who{ display:flex; align-items:center; gap:13px; margin-top:22px; }
.wfop .receipt .rc-av{ width:46px; height:46px; border-radius:50%; object-fit:cover; border:2px solid rgba(158,250,255,.4); flex:none; }
.wfop .receipt .rc-who b{ display:block; color:#fff; font-size:15px; font-weight:700; }
.wfop .receipt .rc-who span{ display:block; color:rgba(255,255,255,.7); font-size:13px; margin-top:2px; }
.wfop .ask{ background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:20px 24px; box-shadow:var(--shadow); }
.wfop .ask .q{ font-weight:600; font-size:18px; line-height:1.45; color:var(--ink); margin:8px 0 0; }
.wfop h2.cta-h{ margin-bottom:8px; }
.wfop .cta-band{ background:linear-gradient(160deg,#FF6A5A,#FF5050); border-radius:24px; padding:38px 40px; box-shadow:var(--shadow); }
.wfop .cta-band h2{ color:#fff; }
.wfop .cta-band .note{ color:rgba(255,255,255,.92); max-width:52ch; } .wfop .cta-band .note b{ color:#fff; }
.wfop .cta{ display:flex; flex-wrap:wrap; align-items:center; gap:14px 22px; margin-top:18px; }
.wfop .cta .primary{ display:inline-block; background:var(--cyan); color:#003756; text-decoration:none; font-weight:700; font-size:15px; padding:13px 26px; border-radius:12px; }
.wfop .cta .alt{ font-size:15px; color:rgba(255,255,255,.85); }
.wfop footer{ margin-top:34px; padding-top:18px; border-top:1px solid var(--line); display:flex; flex-wrap:wrap; justify-content:space-between; gap:10px; font-size:13px; color:var(--ink-soft); }
.wfop footer .trust b{ color:var(--ink); font-weight:600; }
.wfop footer a{ color:var(--teal); text-decoration:none; font-weight:600; }
@media (max-width:560px){ .wfop .sheet{ padding:34px 22px; } .wfop .funds{ grid-template-columns:1fr; } .wfop .svc-tiles{ grid-template-columns:repeat(2,1fr); } .wfop .feat4{ grid-template-columns:1fr; } .wfop .op-gallery{ height:auto; grid-template-columns:1fr 1fr; grid-template-rows:auto; } .wfop .op-gtile{ height:150px; } .wfop .op-gtile.main{ grid-column:1 / 3; grid-row:auto; height:200px; } .wfop .statement{ font-size:27px; } .wfop .top .tag{ display:none; } }
@media print{ .wfop{ background:#fff; } .wfop .sheet{ max-width:100%; padding:22px; } .wfop .fund,.wfop .chip,.wfop .ask,.wfop .cta .primary{ box-shadow:none; } .wfop .mapdots g{ transform:scale(1) !important; } }
@media (prefers-reduced-motion:reduce){ .wfop .mapdots g{ transition:none; transform:scale(1); } .wfop .op-gtile img{ transition:none; } }
`;

export default function WellnessFundsOnePager() {
  const navyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = 'Shortcut · Carrier Wellness Funds';
    // Kick muted autoplay on the gallery videos (some browsers hold it until nudged).
    document.querySelectorAll<HTMLVideoElement>('.wfop .op-gtile video').forEach((v) => {
      v.muted = true;
      v.play().catch(() => { /* autoplay blocked — poster/first frame still shows */ });
    });
    // Phone: cycle the 3 booking screens + step counter
    const screens = Array.from(document.querySelectorAll('.wfop .mp-screen'));
    const step = document.querySelector('.wfop .mp-step');
    let i = 0;
    const timer = window.setInterval(() => {
      i = (i + 1) % screens.length;
      screens.forEach((s, j) => s.classList.toggle('on', j === i));
      if (step) step.textContent = `${i + 1}/${screens.length}`;
    }, 2400);
    // Coverage map: pop dots in when the box enters the viewport
    const nb = navyRef.current;
    let io: IntersectionObserver | undefined;
    if (nb && 'IntersectionObserver' in window) {
      io = new IntersectionObserver((es) => {
        es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io?.unobserve(e.target); } });
      }, { threshold: 0.3 });
      io.observe(nb);
    } else if (nb) { nb.classList.add('in'); }
    return () => { window.clearInterval(timer); io?.disconnect(); };
  }, []);

  return (
    <div className="wfop">
      <style>{CSS}</style>
      <div className="sheet">
        <div className="top">
          <span className="logo">
            <svg width="300" height="60" viewBox="0 0 300 60" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M66.3655 36.0468C66.0413 38.8847 65.1718 41.6677 63.5267 44.0384C59.6388 49.6416 52.9422 51.5122 46.3263 49.4718C39.7968 47.458 33.4645 41.7578 29 32.5209L35.1071 29.5692C38.9952 37.6134 44.0685 41.6771 48.3253 42.99C52.4957 44.2761 55.9662 43.0361 57.9539 40.1715C58.3082 39.6609 58.6128 39.0838 58.8647 38.4481C58.4821 38.469 58.0993 38.4758 57.7167 38.4686C53.3154 38.3863 49.2862 36.4763 46.254 33.8446C43.2423 31.2308 40.9302 27.6576 40.256 23.8648C39.5518 19.9037 40.6843 15.7358 44.4833 12.8244C46.2611 11.462 48.2112 10.6534 50.2623 10.497C52.3079 10.3411 54.2183 10.8516 55.8959 11.7507C59.1586 13.4992 61.6954 16.7797 63.4274 20.2988C64.5244 22.5278 65.3754 25.0044 65.9039 27.5488C68.9511 24.2883 72.2654 22.3492 75.0708 21.2597C76.5203 20.6968 77.8542 20.3526 78.973 20.172C79.9539 20.0137 81.1383 19.9183 82.1251 20.146L80.5999 26.7554C80.7176 26.7825 80.7806 26.792 80.7806 26.792C80.7802 26.797 80.5573 26.7871 80.054 26.8684C79.4204 26.9706 78.5465 27.1865 77.5263 27.5827C75.4942 28.3718 72.9611 29.8447 70.6113 32.4508C69.2721 33.9361 67.8462 35.1281 66.3655 36.0468ZM59.6515 31.5327C59.397 28.6954 58.5657 25.7815 57.3415 23.2941C55.9463 20.4593 54.2323 18.5548 52.6919 17.7293C51.968 17.3414 51.3388 17.2177 50.778 17.2604C50.2228 17.3028 49.4998 17.5258 48.6093 18.2083C47.0716 19.3867 46.6158 20.8859 46.9343 22.6776C47.2827 24.6377 48.6043 26.903 50.7 28.7219C52.7752 30.5229 55.3272 31.6397 57.8435 31.6867C58.4302 31.6977 59.0348 31.6513 59.6515 31.5327Z" fill="#FF5050" />
              <path fillRule="evenodd" clipRule="evenodd" d="M76.2969 23.05C73.0466 22.027 70.6121 19.9327 68.5865 17.6431L73.7638 13.0629C75.3858 14.8964 76.8142 15.9661 78.3723 16.4565C79.894 16.9354 81.999 17.0038 85.2365 15.9237L88.0518 22.1993C85.656 23.5754 84.3307 25.8167 83.7037 28.1354C83.3908 29.2923 83.2731 30.4032 83.2786 31.3063C83.2841 32.2171 83.4116 32.6805 83.4272 32.7373C83.4285 32.7422 83.4286 32.7431 83.4286 32.7431L77.0654 35.4434C76.5629 34.2592 76.3747 32.7616 76.3662 31.348C76.3572 29.8493 76.5482 28.1158 77.0309 26.3309C77.2825 25.4006 77.6191 24.4385 78.0574 23.4796C77.4588 23.3743 76.8723 23.2312 76.2969 23.05Z" fill="#FF5050" />
              <path d="M258.576 46.1066V15.827H265.319V46.1066H258.576ZM253.727 30.4159V24.6861H270.167V30.4159H253.727Z" fill="#175071" />
              <path d="M240.067 46.5908C238.098 46.5908 236.35 46.1941 234.822 45.4007C233.324 44.578 232.148 43.4614 231.296 42.051C230.444 40.6113 230.018 38.9658 230.018 37.1146V24.6855H236.762V37.0265C236.762 37.7611 236.879 38.3928 237.114 38.9217C237.379 39.4506 237.761 39.862 238.26 40.1558C238.76 40.4497 239.362 40.5966 240.067 40.5966C241.066 40.5966 241.86 40.288 242.447 39.671C243.035 39.0246 243.329 38.1431 243.329 37.0265V24.6855H250.072V37.0706C250.072 38.9511 249.646 40.6113 248.794 42.051C247.942 43.4614 246.767 44.578 245.268 45.4007C243.769 46.1941 242.036 46.5908 240.067 46.5908Z" fill="#175071" />
              <path d="M218.272 46.591C216.068 46.591 214.07 46.1062 212.277 45.1366C210.485 44.1669 209.075 42.83 208.046 41.1257C207.018 39.4215 206.504 37.5116 206.504 35.396C206.504 33.251 207.018 31.3411 208.046 29.6662C209.104 27.962 210.529 26.6251 212.322 25.6554C214.114 24.6858 216.127 24.2009 218.36 24.2009C220.035 24.2009 221.563 24.4948 222.944 25.0824C224.354 25.6407 225.603 26.4928 226.69 27.6388L222.371 31.9581C221.871 31.3998 221.283 30.9885 220.608 30.724C219.961 30.4596 219.212 30.3274 218.36 30.3274C217.39 30.3274 216.523 30.5477 215.759 30.9885C215.025 31.3998 214.437 31.9875 213.996 32.7515C213.585 33.4861 213.379 34.3529 213.379 35.3519C213.379 36.3509 213.585 37.2324 213.996 37.9964C214.437 38.7604 215.04 39.3627 215.803 39.8035C216.567 40.2442 217.42 40.4646 218.36 40.4646C219.241 40.4646 220.02 40.3177 220.696 40.0239C221.401 39.7006 222.003 39.2599 222.503 38.7016L226.778 43.021C225.662 44.1963 224.398 45.0925 222.988 45.7095C221.577 46.2972 220.005 46.591 218.272 46.591Z" fill="#175071" />
              <path d="M192.861 46.1066V15.827H199.605V46.1066H192.861ZM188.013 30.4159V24.6861H204.453V30.4159H188.013Z" fill="#175071" />
              <path d="M168.953 46.1061V24.6856H175.696V46.1061H168.953ZM175.696 34.3381L172.875 32.1343C173.434 29.6367 174.374 27.6974 175.696 26.3164C177.018 24.9354 178.855 24.2449 181.206 24.2449C182.234 24.2449 183.13 24.4065 183.894 24.7297C184.687 25.0235 185.378 25.4937 185.966 26.1401L181.955 31.2087C181.661 30.8855 181.294 30.6358 180.853 30.4595C180.412 30.2832 179.913 30.195 179.354 30.195C178.238 30.195 177.342 30.5476 176.666 31.2528C176.019 31.9286 175.696 32.957 175.696 34.3381Z" fill="#175071" />
              <path d="M153.871 46.591C151.668 46.591 149.67 46.1062 147.877 45.1366C146.114 44.1375 144.719 42.7859 143.69 41.0817C142.662 39.3774 142.147 37.4675 142.147 35.3519C142.147 33.2363 142.662 31.3411 143.69 29.6662C144.719 27.9914 146.114 26.6691 147.877 25.6995C149.64 24.7004 151.638 24.2009 153.871 24.2009C156.105 24.2009 158.103 24.6858 159.866 25.6554C161.629 26.6251 163.024 27.962 164.053 29.6662C165.081 31.3411 165.595 33.2363 165.595 35.3519C165.595 37.4675 165.081 39.3774 164.053 41.0817C163.024 42.7859 161.629 44.1375 159.866 45.1366C158.103 46.1062 156.105 46.591 153.871 46.591ZM153.871 40.4646C154.841 40.4646 155.693 40.2589 156.428 39.8476C157.162 39.4068 157.721 38.8045 158.103 38.0405C158.514 37.2471 158.72 36.3509 158.72 35.3519C158.72 34.3529 158.514 33.4861 158.103 32.7515C157.691 31.9875 157.118 31.3998 156.384 30.9885C155.678 30.5477 154.841 30.3274 153.871 30.3274C152.931 30.3274 152.094 30.5477 151.359 30.9885C150.625 31.3998 150.052 31.9875 149.64 32.7515C149.229 33.5154 149.023 34.3969 149.023 35.396C149.023 36.3656 149.229 37.2471 149.64 38.0405C150.052 38.8045 150.625 39.4068 151.359 39.8476C152.094 40.2589 152.931 40.4646 153.871 40.4646Z" fill="#175071" />
              <path d="M132.023 46.106V33.8972C132.023 32.7807 131.671 31.8845 130.966 31.2087C130.29 30.5035 129.423 30.1509 128.365 30.1509C127.631 30.1509 126.984 30.3125 126.426 30.6357C125.868 30.9295 125.427 31.3703 125.104 31.9579C124.78 32.5162 124.619 33.1626 124.619 33.8972L122.018 32.6191C122.018 30.9442 122.371 29.475 123.076 28.2116C123.781 26.9481 124.766 25.9784 126.029 25.3026C127.293 24.5974 128.747 24.2448 130.393 24.2448C132.068 24.2448 133.537 24.5974 134.8 25.3026C136.064 25.9784 137.033 26.9334 137.709 28.1675C138.414 29.3722 138.767 30.7826 138.767 32.3987V46.106H132.023ZM117.875 46.106V14.1075H124.619V46.106H117.875Z" fill="#175071" />
              <path d="M105.182 46.6348C103.919 46.6348 102.67 46.4732 101.436 46.15C100.231 45.8268 99.1001 45.3713 98.0423 44.7837C97.0139 44.1666 96.1324 43.4614 95.3978 42.6681L99.2324 38.7895C99.9376 39.5534 100.775 40.1558 101.745 40.5966C102.714 41.0079 103.772 41.2136 104.918 41.2136C105.711 41.2136 106.314 41.0961 106.725 40.861C107.166 40.6259 107.386 40.3027 107.386 39.8914C107.386 39.3625 107.122 38.9658 106.593 38.7013C106.093 38.4075 105.447 38.1577 104.654 37.9521C103.86 37.717 103.023 37.4672 102.141 37.2028C101.26 36.9383 100.422 36.571 99.629 36.1009C98.8357 35.6308 98.1892 34.9843 97.6897 34.1616C97.1902 33.3095 96.9405 32.237 96.9405 30.9441C96.9405 29.5631 97.2931 28.3731 97.9983 27.374C98.7035 26.3456 99.7025 25.5376 100.995 24.9499C102.288 24.3623 103.801 24.0684 105.535 24.0684C107.357 24.0684 109.032 24.3916 110.56 25.0381C112.117 25.6551 113.38 26.5807 114.35 27.8148L110.516 31.6934C109.84 30.9 109.076 30.3418 108.224 30.0185C107.401 29.6953 106.593 29.5337 105.8 29.5337C105.036 29.5337 104.463 29.6513 104.081 29.8863C103.699 30.092 103.508 30.4005 103.508 30.8119C103.508 31.2526 103.757 31.6052 104.257 31.8697C104.756 32.1341 105.403 32.3692 106.196 32.5749C106.99 32.7806 107.827 33.0303 108.708 33.3242C109.59 33.618 110.427 34.0147 111.221 34.5142C112.014 35.0137 112.661 35.6895 113.16 36.5417C113.66 37.3644 113.909 38.4516 113.909 39.8032C113.909 41.8894 113.116 43.5496 111.529 44.7837C109.972 46.0178 107.856 46.6348 105.182 46.6348Z" fill="#175071" />
            </svg>
          </span>
          <span className="tag">Wellness your team actually uses</span>
        </div>

        <p className="eyebrow">For companies with Cigna, Aetna, or Anthem</p>
        <h1>There is wellness money in your health plan. Most companies leave it on the table.</h1>

        <div className="op-gallery">
          <div className="op-gtile main"><video src={MASSAGE_VIDEO} autoPlay muted loop playsInline /><span className="op-gtag">Massage @ PwC</span></div>
          <div className="op-gtile"><video src={MINDFULNESS_VIDEO} autoPlay muted loop playsInline /><span className="op-gtag">Mindfulness @ Betterment</span></div>
          <div className="op-gtile"><img src="/wellness-funds/gallery/draftkings.jpg" alt="Onsite chair massage at DraftKings" /><span className="op-gtag">Massage @ DraftKings</span></div>
          <div className="op-gtile"><video src="/wellness-funds/gallery/bcg.mp4" autoPlay muted loop playsInline /><span className="op-gtag">Massage @ BCG</span></div>
          <div className="op-gtile"><img src="/wellness-funds/gallery/wix.png" alt="Onsite chair massage at Wix" /><span className="op-gtag">Massage @ Wix.com</span></div>
        </div>

        <p className="lede">If your medical carrier is Cigna, Aetna, or Anthem, your plan most likely includes an <strong>employer wellness fund</strong>. It resets every year. We help you spend it on a day your team actually shows up for.</p>

        <section>
          <p className="label">Three carriers, three funds</p>
          <div className="funds">
            <div className="fund"><p className="carrier">Cigna</p><p className="prog">Health Improvement Fund</p></div>
            <div className="fund"><p className="carrier">Aetna</p><p className="prog">Wellness Allowance</p></div>
            <div className="fund"><p className="carrier">Anthem</p><p className="prog">Wellness Fund</p></div>
          </div>
          <p className="note">This is not your budget. It is money your carrier already set aside for wellness, and it resets every plan year, so <b>whatever you do not use, you lose.</b> Most companies never use it. They do not know it is there, or they cannot find an easy partner to run it. That is the part we handle.</p>
        </section>

        <section>
          <p className="label">What the fund covers</p>
          <div className="svc-tiles">
            <div className="svc-tile"><div className="ph"><img src={`${A}/services/massage.png`} alt="Massage" /></div><div className="cap">Massage<span className="sub">Chair &amp; table options</span></div></div>
            <div className="svc-tile"><div className="ph"><img src={`${A}/services/assisted-stretch.png`} alt="Assisted stretch" /></div><div className="cap">Assisted stretch<span className="sub">Guided one-on-one sessions</span></div></div>
            <div className="svc-tile"><div className="ph"><img src={`${A}/services/sound-bath.png`} alt="Sound bath" /></div><div className="cap">Sound bath<span className="sub">Group relaxation sessions</span></div></div>
            <div className="svc-tile"><div className="ph"><img src={`${A}/services/mindfulness.png`} alt="Mindfulness session" /></div><div className="cap">Mindfulness<span className="sub">Guided meditation &amp; breathwork</span></div></div>
            <div className="svc-tile nutri"><div className="ph"><img src={`${A}/onepager/nutrition-avocado.png`} alt="Nutrition coaching" /></div><div className="cap">Nutrition coaching<span className="sub">1:1 &amp; group sessions</span></div></div>
            <div className="svc-tile zoom"><div className="ph"><span className="zicon"><svg viewBox="0 0 24 24" fill="none"><rect x="2" y="6.5" width="13.5" height="11" rx="3" fill="#003756" /><path d="M17 10.2 L22 7 V17 L17 13.8 Z" fill="#003756" /></svg></span></div><div className="cap">Also on Zoom<span className="sub">Mindfulness, sound bath &amp; nutrition run remote</span></div></div>
          </div>
          <p className="note">Delivered onsite by <b>licensed, vetted pros</b>, one team running the whole day, and your remote employees are covered too.</p>
        </section>

        <section>
          <p className="label">A day with Shortcut</p>
          <h2 className="statement">Real pros. Real care.<br />Right at your office.</h2>
          <div className="feat4">
            <div className="feat sky">
              <p className="feat-kick">The Shortcut pros</p>
              <h3 className="feat-h">Pros you&rsquo;d<br />book yourself.</h3>
              <p className="feat-p">Licensed, vetted and insured, professional, personal, reliable.</p>
              <img className="guy" src={`${A}/onepager/pros-guy-flush.png`} alt="A Shortcut pro" />
            </div>
            <div className="feat coralg">
              <p className="feat-kick">Seamless tech</p>
              <h3 className="feat-h">Booking in<br />three taps.</h3>
              <p className="feat-p">Employees pick their own slot, no spreadsheets, no chasing.</p>
              <div className="phonewrap">
                <div className="mini-phone">
                  <div className="mp-bar"><span className="mp-logo">A</span>Wellness Day<span className="mp-step">1/3</span></div>
                  <div className="mp-stage">
                    <div className="mp-screen on">
                      <p className="mp-eyebrow" style={{ marginTop: 0 }}>Pick your service</p>
                      <div className="mp-opt sel">Chair massage<i></i></div>
                      <div className="mp-opt">Table massage<i></i></div>
                      <div className="mp-cta">Next</div>
                    </div>
                    <div className="mp-screen">
                      <p className="mp-eyebrow" style={{ marginTop: 0 }}>Pick your time</p>
                      <div className="mp-slots"><span>11:00</span><span className="taken">11:20</span><span className="sel">11:40</span><span>12:00</span></div>
                      <div className="mp-cta">Book my slot</div>
                    </div>
                    <div className="mp-screen">
                      <div className="mp-check"><svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5" /></svg></div>
                      <div className="mp-done">You&rsquo;re booked!</div>
                      <div className="mp-sub2">Chair massage · 11:40 AM</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="feat navy" ref={navyRef}>
              <p className="feat-kick">Nationwide coverage</p>
              <h3 className="feat-h">One vendor. <span>Every office.</span></h3>
              <p className="feat-p">One vetted network across all 50 states, one team to call.</p>
              <div className="mapwrap">
                <img className="usmap" src={`${A}/onepager/us-map.svg`} alt="Shortcut coverage across the US" />
                <svg className="mapdots" viewBox="0 0 960 593" aria-hidden="true">
                  {MAP_DOTS.map(([cx, cy], idx) => (
                    <g key={idx} style={{ transformOrigin: `${cx}px ${cy}px`, transitionDelay: `${(0.4 + idx * 0.06).toFixed(2)}s` }}>
                      <circle cx={cx} cy={cy} r="16" fill="#FF5050" opacity=".25" />
                      <circle cx={cx} cy={cy} r="7" fill="#FF5050" />
                    </g>
                  ))}
                </svg>
              </div>
            </div>
            <div className="feat aquag">
              <p className="feat-kick">We fill every slot</p>
              <h3 className="feat-h">Turnout,<br />handled.</h3>
              <p className="feat-p">Digital invites and onsite signage fill the calendar for you.</p>
              <div className="stat-wrap">
                <div className="stat-big">92%</div>
                <div className="stat-lbl">of booked slots get used</div>
                <div className="stat-bar"><i></i></div>
                <div className="stat-mini">
                  <div><b>87%</b><span>of companies rebook</span></div>
                  <div><b>0</b><span>admin work for you</span></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section>
          <p className="label">We handle the paperwork</p>
          <ol className="steps">
            <li><p className="st"><b>Pre-approval.</b> <span>We send your carrier consultant the event details before the day, in the language they approve.</span></p></li>
            <li><p className="st"><b>The day.</b> <span>We run it onsite, open to your whole team. You approve a date and do nothing else.</span></p></li>
            <li><p className="st"><b>Documentation.</b> <span>We format the invoice and the participation summary exactly the way your carrier needs.</span></p></li>
            <li><p className="st"><b>Reimbursed.</b> <span>The fund pays. With Aetna, it often pays us directly, so your team never fronts the cash.</span></p></li>
          </ol>
        </section>

        <section>
          <div className="receipt">
            <img className="rc-logo" src={`${A}/onepager/draftkings.svg`} alt="DraftKings" />
            <p>Shortcut has become an extension of the DraftKings family.</p>
            <div className="rc-who">
              <img className="rc-av" src={`${A}/onepager/christian.jpeg`} alt="" />
              <div><b>Christian W.</b><span>Head of Workplace Experience, DraftKings</span></div>
            </div>
          </div>
        </section>

        <section>
          <div className="ask">
            <p className="label" style={{ margin: 0 }}>One question to ask your carrier</p>
            <p className="q">What is our current wellness-fund balance, when does our plan year end, and who is our wellness consultant?</p>
          </div>
        </section>

        <section>
          <div className="cta-band">
            <h2 className="cta-h">Ready when you are</h2>
            <p className="note">Grab a few minutes with me and we&rsquo;ll walk through how a day would work for your team.</p>
            <div className="cta">
              <a className="primary" href={WILL_CALENDAR} target="_blank" rel="noopener noreferrer">Grab 15 minutes</a>
            </div>
          </div>
        </section>

        <footer>
          <span className="trust">Trusted by <b>500+ companies</b>, including BCG and DraftKings. <b>87%</b> rebook, and over <b>90%</b> of booked slots get used.</span>
          <a href="https://getshortcut.co">getshortcut.co</a>
        </footer>
      </div>
    </div>
  );
}
