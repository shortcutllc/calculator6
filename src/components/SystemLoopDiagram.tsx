import React from 'react';

// Self-contained SVG (inline styles, no external CSS) of the cold-engine loop:
// six built stages (green) cycling weekly + three remaining (amber), with the
// human doors and the self-improvement note. Mirrors the brain's loop status.
const GREEN = { fill: '#dcfce7', stroke: '#16a34a' };
const AMBER = { fill: '#fef3c7', stroke: '#d97706' };
const INK = '#1e293b';
const MUTE = '#475569';
const ARROW = '#64748b';

function Box({ x, y, tone, title, sub }: { x: number; y: number; tone: typeof GREEN; title: string; sub: string }) {
  return (
    <g>
      <rect x={x} y={y} width={180} height={58} rx={8} fill={tone.fill} stroke={tone.stroke} strokeWidth={1.5} />
      <text x={x + 90} y={y + 24} textAnchor="middle" fontSize={14} fontWeight={600} fill={INK}>{title}</text>
      <text x={x + 90} y={y + 42} textAnchor="middle" fontSize={12} fill={MUTE}>{sub}</text>
    </g>
  );
}

export default function SystemLoopDiagram() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-shortcut-navy-blue mb-1">Cold engine loop</h2>
      <p className="text-sm text-gray-500 mb-4">How the system finds, verifies, and converts cold leads, and how it gets better each week. Green is built, amber is remaining.</p>
      <svg width="100%" viewBox="0 0 680 372" role="img" aria-label="Cold engine loop diagram" style={{ maxWidth: 720 }}>
        <defs>
          <marker id="loopArrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6" fill="none" stroke={ARROW} strokeWidth={1.5} />
          </marker>
        </defs>

        <text x={40} y={26} fontSize={14} fontWeight={600} fill={INK}>The loop, live today (green = built)</text>

        <Box x={40} y={40} tone={GREEN} title="1 · Discover" sub="CRM state + belief model" />
        <Box x={250} y={40} tone={GREEN} title="2 · Pull + verify" sub="Apollo to MillionVerifier" />
        <Box x={460} y={40} tone={GREEN} title="3 · Skeptic" sub="ok-only, park catch-all" />

        <line x1={220} y1={69} x2={248} y2={69} stroke={ARROW} strokeWidth={1.5} markerEnd="url(#loopArrow)" />
        <line x1={430} y1={69} x2={458} y2={69} stroke={ARROW} strokeWidth={1.5} markerEnd="url(#loopArrow)" />
        <line x1={550} y1={98} x2={550} y2={122} stroke={ARROW} strokeWidth={1.5} markerEnd="url(#loopArrow)" />

        <Box x={460} y={124} tone={GREEN} title="4 · Compose" sub="v3 copy + copy-evaluator" />
        <Box x={250} y={124} tone={GREEN} title="5 · Launch ⛬" sub="Smartlead draft, human starts" />
        <Box x={40} y={124} tone={GREEN} title="6 · Track" sub="replies to Play B" />

        <line x1={460} y1={153} x2={432} y2={153} stroke={ARROW} strokeWidth={1.5} markerEnd="url(#loopArrow)" />
        <line x1={250} y1={153} x2={222} y2={153} stroke={ARROW} strokeWidth={1.5} markerEnd="url(#loopArrow)" />
        <path d="M130 124 L130 100" fill="none" stroke={ARROW} strokeWidth={1.5} markerEnd="url(#loopArrow)" />
        <text x={138} y={116} fontSize={12} fill={MUTE}>weekly</text>

        <text x={40} y={216} fontSize={14} fontWeight={600} fill={INK}>Remaining to close + fully automate (amber)</text>

        <Box x={40} y={228} tone={AMBER} title="Graduate replies ⛬" sub="reply to personal lane" />
        <Box x={250} y={228} tone={AMBER} title="Self-improve" sub="belief loop updates" />
        <Box x={460} y={228} tone={AMBER} title="Schedule" sub="weekly cron, autonomy" />

        <text x={40} y={312} fontSize={12} fill={MUTE}>⛬ Human doors (permanent): cold launch + every real reply are human-approved.</text>
        <text x={40} y={332} fontSize={12} fill={MUTE}>Self-improvement: each reply updates the belief model (Wilson floor); spend ~80% proven / ~20% new bets.</text>
        <text x={40} y={352} fontSize={12} fill={MUTE}>Recycle: no-reply past cooldown re-engages; catch-all parked for a future tool; bounce/DNC auto-suppress.</text>
      </svg>
    </div>
  );
}
