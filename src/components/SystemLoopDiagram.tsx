import React from 'react';

// Self-contained SVG (inline styles, no external CSS) of the cold-engine brain as
// it runs today: a weekly BUILD lane and a daily RUN lane, joined into one loop by
// the feedback arrow (every outcome updates the belief model). Below: the gates the
// work passes through (verification waterfall, three-tier copy gate) and the two
// permanent human doors. Green = built + on cron; amber = the one open item
// (real-estate lead pulls, parked on an ICP pick).
const GREEN = { fill: '#dcfce7', stroke: '#16a34a' };
const BLUE = { fill: '#e0edff', stroke: '#2563eb' };
const AMBER = { fill: '#fef3c7', stroke: '#d97706' };
const INK = '#1e293b';
const MUTE = '#475569';
const ARROW = '#64748b';

function Box({ x, y, w = 158, tone, title, sub, time, door }:
  { x: number; y: number; w?: number; tone: typeof GREEN; title: string; sub: string; time?: string; door?: boolean }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={56} rx={8} fill={tone.fill} stroke={tone.stroke} strokeWidth={1.5} />
      {time && (
        <g>
          <rect x={x + w - 44} y={y + 7} width={37} height={16} rx={8} fill="#fff" stroke={tone.stroke} strokeWidth={1} opacity={0.9} />
          <text x={x + w - 25.5} y={y + 18.5} textAnchor="middle" fontSize={10} fontWeight={600} fill={MUTE}>{time}</text>
        </g>
      )}
      <text x={x + w / 2} y={y + 26} textAnchor="middle" fontSize={13.5} fontWeight={600} fill={INK}>{door ? `${title} ⛬` : title}</text>
      <text x={x + w / 2} y={y + 44} textAnchor="middle" fontSize={11} fill={MUTE}>{sub}</text>
    </g>
  );
}

const Arrow = ({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) => (
  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={ARROW} strokeWidth={1.5} markerEnd="url(#loopArrow)" />
);

// 5 evenly spaced columns
const COL = [30, 208, 386, 564, 742];
const BW = 158;

export default function SystemLoopDiagram() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-shortcut-navy-blue mb-1">The cold engine, end to end</h2>
      <p className="text-sm text-gray-500 mb-4">
        One self-improving loop. The daily lane manufactures and routes warm replies; the weekly lane rebuilds the lead pool and learns
        from every outcome. Green is built and on cron, amber is the one open item. Both human doors are permanent.
      </p>
      <svg width="100%" viewBox="0 0 930 632" role="img" aria-label="Cold engine loop diagram" style={{ maxWidth: 940 }}>
        <defs>
          <marker id="loopArrow" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6" fill="none" stroke={ARROW} strokeWidth={1.5} />
          </marker>
        </defs>

        {/* ===================== DAILY RUN LANE ===================== */}
        <text x={30} y={22} fontSize={13} fontWeight={700} fill={INK}>Daily run — every morning</text>

        <Box x={COL[0]} y={32} tone={GREEN} title="1 · Pull replies" sub="Smartlead + Gmail" time="6:05" />
        <Box x={COL[1]} y={32} tone={GREEN} title="2 · Enrich" sub="classify replies" time="6:30" />
        <Box x={COL[2]} y={32} tone={GREEN} title="3 · Sync state" sub="bounce + membership" time="6:50" />
        <Box x={COL[3]} y={32} tone={GREEN} title="4 · Plays" sub="rebuild lists" time="6:45" />
        <Box x={COL[4]} y={32} tone={BLUE} title="5 · Graduate" sub="positive → personal" time="7:05" door />

        <Arrow x1={COL[0] + BW} y1={60} x2={COL[1] - 2} y2={60} />
        <Arrow x1={COL[1] + BW} y1={60} x2={COL[2] - 2} y2={60} />
        <Arrow x1={COL[2] + BW} y1={60} x2={COL[3] - 2} y2={60} />
        <Arrow x1={COL[3] + BW} y1={60} x2={COL[4] - 2} y2={60} />

        {/* graduate -> the 28x payoff */}
        <Arrow x1={COL[4] + BW / 2} y1={88} x2={COL[4] + BW / 2} y2={112} />
        <Box x={COL[4] - 12} y={114} w={182} tone={BLUE} title="Auto-draft + Slack ping" sub="rep reviews, rep sends ⛬" />
        <text x={COL[4] + BW / 2 + 79} y={150} textAnchor="end" fontSize={10.5} fill="#2563eb">personal lane ≈ 28× cold</text>

        {/* ===================== WEEKLY BUILD LANE ===================== */}
        <text x={30} y={214} fontSize={13} fontWeight={700} fill={INK}>Weekly build — Monday</text>

        <Box x={COL[0]} y={224} tone={GREEN} title="A · Belief model" sub="Wilson floor" time="7:30" />
        <Box x={COL[1]} y={224} tone={GREEN} title="B · Improve loop" sub="80% exploit / 20% explore" time="7:30" />
        <Box x={COL[2]} y={224} w={336} tone={GREEN} title="C · Cold engine builds next batch" sub="pull → verify → skeptic → compose → judge" time="8:00" />
        <Box x={COL[4]} y={224} tone={BLUE} title="D · Smartlead DRAFT" sub="human clicks Start ⛬" />

        <Arrow x1={COL[0] + BW} y1={252} x2={COL[1] - 2} y2={252} />
        <Arrow x1={COL[1] + BW} y1={252} x2={COL[2] - 2} y2={252} />
        <Arrow x1={COL[2] + 336} y1={252} x2={COL[4] - 2} y2={252} />

        {/* segments feeding the cold engine */}
        <text x={COL[2]} y={302} fontSize={11} fontWeight={600} fill={MUTE}>Segments (own copy + pull):</text>
        <g>
          <rect x={COL[2] + 132} y={291} width={66} height={18} rx={9} fill={GREEN.fill} stroke={GREEN.stroke} />
          <text x={COL[2] + 165} y={303.5} textAnchor="middle" fontSize={10.5} fill={INK}>Direct</text>
          <rect x={COL[2] + 204} y={291} width={70} height={18} rx={9} fill={GREEN.fill} stroke={GREEN.stroke} />
          <text x={COL[2] + 239} y={303.5} textAnchor="middle" fontSize={10.5} fill={INK}>Law · CLE</text>
          <rect x={COL[2] + 280} y={291} width={56} height={18} rx={9} fill={AMBER.fill} stroke={AMBER.stroke} />
          <text x={COL[2] + 308} y={303.5} textAnchor="middle" fontSize={10.5} fill={INK}>Real est.</text>
        </g>
        <text x={COL[2] + 132} y={326} fontSize={10} fill={MUTE}>Real-estate pulls parked pending the ICP sub-segment pick.</text>

        {/* ===================== THE LOOP: feedback ===================== */}
        {/* daily graduate/track outcomes curve back up-left into the belief model */}
        <path d="M40 224 C 10 180, 10 110, 24 60" fill="none" stroke="#9333ea" strokeWidth={1.75} strokeDasharray="5 4" markerEnd="url(#loopArrow)" />
        <text x={14} y={166} fontSize={10.5} fontWeight={600} fill="#9333ea" transform="rotate(-90 14 166)">every outcome → beliefs</text>

        {/* ===================== GATES BAND ===================== */}
        <line x1={30} y1={356} x2={900} y2={356} stroke="#e2e8f0" strokeWidth={1} />
        <text x={30} y={380} fontSize={13} fontWeight={700} fill={INK}>The gates every batch passes</text>

        {/* verification waterfall */}
        <text x={30} y={406} fontSize={11.5} fontWeight={600} fill={MUTE}>Verification waterfall (ships ok-only)</text>
        <g>
          <rect x={30} y={414} width={150} height={34} rx={7} fill={GREEN.fill} stroke={GREEN.stroke} />
          <text x={105} y={435} textAnchor="middle" fontSize={11} fill={INK}>Apollo email_status</text>
          <rect x={196} y={414} width={150} height={34} rx={7} fill={GREEN.fill} stroke={GREEN.stroke} />
          <text x={271} y={429} textAnchor="middle" fontSize={11} fill={INK}>MillionVerifier</text>
          <text x={271} y={442} textAnchor="middle" fontSize={9.5} fill={MUTE}>ok / catch-all / bad</text>
          <rect x={362} y={414} width={170} height={34} rx={7} fill={GREEN.fill} stroke={GREEN.stroke} />
          <text x={447} y={429} textAnchor="middle" fontSize={11} fill={INK}>BounceBan</text>
          <text x={447} y={442} textAnchor="middle" fontSize={9.5} fill={MUTE}>resolves catch-alls</text>
          <Arrow x1={180} y1={431} x2={194} y2={431} />
          <Arrow x1={346} y1={431} x2={360} y2={431} />
        </g>

        {/* three-tier copy gate */}
        <text x={566} y={406} fontSize={11.5} fontWeight={600} fill={MUTE}>Three-tier copy gate</text>
        <g>
          <rect x={566} y={414} width={104} height={34} rx={7} fill={GREEN.fill} stroke={GREEN.stroke} />
          <text x={618} y={429} textAnchor="middle" fontSize={11} fill={INK}>copy-evaluator</text>
          <text x={618} y={442} textAnchor="middle" fontSize={9.5} fill={MUTE}>rules</text>
          <rect x={686} y={414} width={104} height={34} rx={7} fill={GREEN.fill} stroke={GREEN.stroke} />
          <text x={738} y={429} textAnchor="middle" fontSize={11} fill={INK}>LLM judge</text>
          <text x={738} y={442} textAnchor="middle" fontSize={9.5} fill={MUTE}>strategic fit</text>
          <rect x={806} y={414} width={94} height={34} rx={7} fill={BLUE.fill} stroke={BLUE.stroke} />
          <text x={853} y={429} textAnchor="middle" fontSize={11} fill={INK}>Human ⛬</text>
          <text x={853} y={442} textAnchor="middle" fontSize={9.5} fill={MUTE}>clicks Start</text>
          <Arrow x1={670} y1={431} x2={684} y2={431} />
          <Arrow x1={790} y1={431} x2={804} y2={431} />
        </g>

        {/* ===================== FOOTNOTES ===================== */}
        <line x1={30} y1={474} x2={900} y2={474} stroke="#e2e8f0" strokeWidth={1} />
        <text x={30} y={498} fontSize={11.5} fill={MUTE}>
          <tspan fontWeight={700} fill={INK}>⛬ Two human doors (permanent):</tspan> the cold launch (Start in Smartlead) and every real reply send. The system drafts and pings, never sends.
        </text>
        <text x={30} y={520} fontSize={11.5} fill={MUTE}>
          <tspan fontWeight={700} fill="#2563eb">Blue</tspan> = a human-approval step. <tspan fontWeight={700} fill="#16a34a">Green</tspan> = built and running on cron. <tspan fontWeight={700} fill="#d97706">Amber</tspan> = open (real-estate pulls).
        </text>
        <text x={30} y={542} fontSize={11.5} fill={MUTE}>
          <tspan fontWeight={700} fill={INK}>The loop:</tspan> cold targeting tops out near 1% positive, so the engine's real job is to manufacture warm replies cheaply, then graduate them to the personal lane (~28×).
        </text>
        <text x={30} y={564} fontSize={11.5} fill={MUTE}>
          <tspan fontWeight={700} fill={INK}>Learning:</tspan> each reply updates the belief model (Wilson lower-bound, so small samples sink); spend stays ~80% on proven cells, ~20% on bounded new bets.
        </text>
        <text x={30} y={586} fontSize={11.5} fill={MUTE}>
          <tspan fontWeight={700} fill={INK}>Recycle:</tspan> no-reply past cooldown re-engages; catch-alls park for BounceBan; bounce / unsubscribe / DNC auto-suppress.
        </text>
        <text x={30} y={608} fontSize={11.5} fill={MUTE}>
          <tspan fontWeight={700} fill={INK}>Provenance guard:</tspan> only Apollo-sourced, verified leads ever reach a campaign. Guessed-pattern (sheet) emails are refused unless BounceBan clears them.
        </text>
      </svg>
    </div>
  );
}
