import React from 'react';

// Plain-language explainer of the cold outreach system for someone who doesn't
// work on it. Two parts: (1) an SVG of the flow — a weekly routine that builds and
// launches a batch, and a daily routine that handles the replies, joined into a
// loop — and (2) a separate written explainer of "the brain" (how it decides who to
// email and what works). Green = runs automatically; blue = a person must act.
const GREEN = { fill: '#dcfce7', stroke: '#16a34a' };
const BLUE = { fill: '#dbeafe', stroke: '#2563eb' };
const AMBER = { fill: '#fef3c7', stroke: '#d97706' };
const INK = '#1e293b';
const MUTE = '#475569';
const ARROW = '#64748b';

function Box({ x, y, w = 150, tone, title, sub, door }:
  { x: number; y: number; w?: number; tone: typeof GREEN; title: string; sub: string; door?: boolean }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={58} rx={8} fill={tone.fill} stroke={tone.stroke} strokeWidth={1.5} />
      <text x={x + w / 2} y={y + 25} textAnchor="middle" fontSize={13.5} fontWeight={600} fill={INK}>{door ? `${title} 🔒` : title}</text>
      <text x={x + w / 2} y={y + 43} textAnchor="middle" fontSize={11} fill={MUTE}>{sub}</text>
    </g>
  );
}

const Arrow = ({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) => (
  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={ARROW} strokeWidth={1.5} markerEnd="url(#loopArrow)" />
);

const COL = [40, 220, 400, 580, 760];
const BW = 150;

function BrainCard({ n, title, body }: { n: string; title: string; body: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-shortcut-navy-blue text-white text-xs font-semibold flex items-center justify-center">{n}</span>
        <h4 className="text-sm font-semibold text-shortcut-navy-blue">{title}</h4>
      </div>
      <p className="text-sm text-gray-600 leading-relaxed">{body}</p>
    </div>
  );
}

export default function SystemLoopDiagram() {
  return (
    <div className="space-y-6">
      {/* ============ PART 1: THE FLOW ============ */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-shortcut-navy-blue mb-1">How the cold outreach works</h2>
        <p className="text-sm text-gray-500 mb-4 max-w-3xl">
          Two routines run on their own. <span className="font-medium text-gray-700">Every Monday</span> the system builds and
          prepares a new batch of cold emails. <span className="font-medium text-gray-700">Every morning</span> it handles the
          replies that come back. A person never has to do the busywork &mdash; they only step in at the two
          <span className="font-medium text-gray-700"> 🔒 locked steps</span>, where a human decides to send.
        </p>
        <svg width="100%" viewBox="0 0 920 372" role="img" aria-label="Cold outreach flow diagram" style={{ maxWidth: 940 }}>
          <defs>
            <marker id="loopArrow" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6" fill="none" stroke={ARROW} strokeWidth={1.5} />
            </marker>
          </defs>

          {/* ---- WEEKLY ROUTINE (top) ---- */}
          <text x={40} y={20} fontSize={13} fontWeight={700} fill={INK}>Every Monday &mdash; build and prepare a new batch</text>

          <Box x={COL[0]} y={30} tone={GREEN} title="Learn" sub="what worked last week" />
          <Box x={COL[1]} y={30} tone={GREEN} title="Plan" sub="proven + a few tests" />
          <Box x={COL[2]} y={30} w={330} tone={GREEN} title="Build the batch" sub="find people, check emails, write, quality-check" />
          <Box x={COL[4]} y={30} tone={BLUE} title="Ready" sub="a person clicks Send" door />

          <Arrow x1={COL[0] + BW} y1={59} x2={COL[1] - 2} y2={59} />
          <Arrow x1={COL[1] + BW} y1={59} x2={COL[2] - 2} y2={59} />
          <Arrow x1={COL[2] + 330} y1={59} x2={COL[4] - 2} y2={59} />

          {/* ---- DAILY ROUTINE (bottom) ---- */}
          <text x={40} y={170} fontSize={13} fontWeight={700} fill={INK}>Every morning &mdash; handle the replies</text>

          <Box x={COL[0]} y={182} tone={GREEN} title="Read replies" sub="check every inbox" />
          <Box x={COL[1]} y={182} tone={GREEN} title="Sort them" sub="interested? no? bounced?" />
          <Box x={COL[2]} y={182} tone={GREEN} title="Clean up" sub="drop dead + opted-out" />
          <Box x={COL[3]} y={182} tone={GREEN} title="Refresh lists" sub="update the sales view" />
          <Box x={COL[4]} y={182} tone={BLUE} title="Hand off" sub="hot lead → a person" door />

          <Arrow x1={COL[0] + BW} y1={211} x2={COL[1] - 2} y2={211} />
          <Arrow x1={COL[1] + BW} y1={211} x2={COL[2] - 2} y2={211} />
          <Arrow x1={COL[2] + BW} y1={211} x2={COL[3] - 2} y2={211} />
          <Arrow x1={COL[3] + BW} y1={211} x2={COL[4] - 2} y2={211} />

          {/* hand-off payoff */}
          <Arrow x1={COL[4] + BW / 2} y1={240} x2={COL[4] + BW / 2} y2={262} />
          <Box x={COL[4] - 32} y={264} w={182} tone={BLUE} title="Draft reply + alert the rep" sub="the rep reviews and sends 🔒" />

          {/* ---- THE LOOP (daily results feed Monday's Learn) ---- */}
          <path d="M28 182 C 6 150, 6 95, 24 60" fill="none" stroke="#9333ea" strokeWidth={1.75} strokeDasharray="5 4" markerEnd="url(#loopArrow)" />
          <text x={16} y={150} fontSize={10.5} fontWeight={600} fill="#9333ea" transform="rotate(-90 16 150)">replies teach the system</text>
        </svg>

        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
          <span><span className="inline-block w-3 h-3 rounded-sm align-middle mr-1" style={{ background: GREEN.fill, border: `1px solid ${GREEN.stroke}` }} /> Runs automatically</span>
          <span><span className="inline-block w-3 h-3 rounded-sm align-middle mr-1" style={{ background: BLUE.fill, border: `1px solid ${BLUE.stroke}` }} /> 🔒 A person decides to send</span>
          <span className="text-gray-400">The computer drafts and alerts; a human always clicks the final Send.</span>
        </div>
      </div>

      {/* ============ PART 2: THE BRAIN ============ */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-shortcut-navy-blue mb-1">The brain: how it decides who to email</h2>
        <p className="text-sm text-gray-500 mb-4 max-w-3xl">
          Behind the routines is a simple idea: keep score of what actually gets replies, and put more effort there over time.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <BrainCard n="1" title="It keeps a scorecard"
            body={<>For every kind of prospect &mdash; their industry, company size, job title and city &mdash; it tracks how often that group actually replies. Nothing is hard-coded; the scorecard is built from real results.</>} />
          <BrainCard n="2" title="It isn't fooled by small wins"
            body={<>One reply from a tiny group isn't proof. The brain judges each group by its realistic worst case, so big, consistent results outrank lucky flukes and it never chases a one-off.</>} />
          <BrainCard n="3" title="It spends 80 / 20"
            body={<>Each week roughly 80% of the effort goes to the prospect types that have proven they reply, and about 20% tests new ideas &mdash; so it keeps improving without betting everything on a hunch.</>} />
          <BrainCard n="4" title="The honest truth it found"
            body={<>Cold email tops out near <span className="font-medium text-gray-700">1% interested</span> no matter how good the targeting. So its real job isn't to win at cold email &mdash; it's to cheaply produce warm replies, then hand each one to a real person, because a 1-to-1 human follow-up converts about <span className="font-medium text-gray-700">28× better</span>.</>} />
        </div>
        <div className="mt-4 rounded-lg bg-blue-50 border border-blue-100 p-4 text-sm text-gray-700 leading-relaxed">
          <span className="font-semibold text-shortcut-navy-blue">In one sentence:</span> the machine does all the finding, checking, writing and sorting so that the few people who reply land in front of a human, ready for a personal conversation &mdash; which is where deals actually happen.
        </div>
      </div>
    </div>
  );
}
