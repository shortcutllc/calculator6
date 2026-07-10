import React from 'react';

// Plain-language explainer of the whole outreach system for someone who doesn't
// work on it. Four parts:
//   1. THE THREE LANES — the three ways an email goes out (cold engine, founder
//      lane, sales reps), colour-coded by who acts.
//   2. THE REPLY PIPELINE — every reply, from any lane, is handled the same way.
//   3. THE BRAIN — how it decides who to email and learns what works.
//   4. WHEN IT RUNS — the schedule, in plain terms.
// Colour key: GREEN = runs automatically; BLUE = a person sends; AMBER = a
// safety gate / automatic stop.
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

function LaneLabel({ x, y, text }: { x: number; y: number; text: string }) {
  return <text x={x} y={y} fontSize={12.5} fontWeight={700} fill={INK}>{text}</text>;
}

function ScheduleRow({ when, what }: { when: string; what: string }) {
  return (
    <div className="flex gap-3 py-1.5 border-b border-gray-100 last:border-0">
      <span className="flex-shrink-0 w-40 text-xs font-semibold text-shortcut-navy-blue">{when}</span>
      <span className="text-sm text-gray-600">{what}</span>
    </div>
  );
}

export default function SystemLoopDiagram() {
  return (
    <div className="space-y-6">
      {/* ============ PART 1: THE THREE LANES ============ */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-shortcut-navy-blue mb-1">The three ways we reach people</h2>
        <p className="text-sm text-gray-500 mb-4 max-w-3xl">
          Email goes out through three separate lanes. The only lane that sends without a person is Will&apos;s
          <span className="font-medium text-gray-700"> follow-ups</span> &mdash; and those <span className="font-medium text-gray-700">stop the instant anyone replies</span>.
          Everywhere else, a human clicks the final <span className="font-medium text-gray-700">🔒 Send</span>.
        </p>
        <svg width="100%" viewBox="0 0 920 300" role="img" aria-label="The three outreach lanes" style={{ maxWidth: 940 }}>
          <defs>
            <marker id="loopArrow" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6" fill="none" stroke={ARROW} strokeWidth={1.5} />
            </marker>
          </defs>

          {/* ---- LANE A: COLD ENGINE ---- */}
          <LaneLabel x={40} y={16} text="Cold engine · bulk outreach · every Monday" />
          <Box x={COL[0]} y={26} tone={GREEN} title="Learn" sub="what worked" />
          <Box x={COL[1]} y={26} tone={GREEN} title="Plan" sub="proven + a few tests" />
          <Box x={COL[2]} y={26} tone={GREEN} title="Build & verify" sub="find, check, write" />
          <Box x={COL[3]} y={26} tone={AMBER} title="Launch" sub="goes live via Smartlead" />
          <Arrow x1={COL[0] + BW} y1={55} x2={COL[1] - 2} y2={55} />
          <Arrow x1={COL[1] + BW} y1={55} x2={COL[2] - 2} y2={55} />
          <Arrow x1={COL[2] + BW} y1={55} x2={COL[3] - 2} y2={55} />

          {/* ---- LANE B: FOUNDER ---- */}
          <LaneLabel x={40} y={116} text="Founder lane · Will's 1-to-1 outreach · weekdays" />
          <Box x={COL[0]} y={126} tone={GREEN} title="Draft note" sub="researched, in voice" />
          <Box x={COL[1]} y={126} tone={BLUE} title="Will sends #1" sub="by hand" door />
          <Box x={COL[2]} y={126} tone={GREEN} title="Follow-ups 2–4" sub="auto: day 3 / 7 / 12" />
          <Box x={COL[3]} y={126} tone={AMBER} title="Hard-stop" sub="halts on any reply" />
          <Arrow x1={COL[0] + BW} y1={155} x2={COL[1] - 2} y2={155} />
          <Arrow x1={COL[1] + BW} y1={155} x2={COL[2] - 2} y2={155} />
          <Arrow x1={COL[2] + BW} y1={155} x2={COL[3] - 2} y2={155} />

          {/* ---- LANE C: REPS ---- */}
          <LaneLabel x={40} y={206} text="Sales reps · 1-to-1 from their own Gmail · on demand" />
          <Box x={COL[0]} y={216} tone={BLUE} title="Rep drafts" sub="edits the copy" />
          <Box x={COL[1]} y={216} tone={AMBER} title="Safety gate" sub="blocks clients / opt-outs" />
          <Box x={COL[2]} y={216} tone={BLUE} title="Rep sends" sub="clicks send" door />
          <Arrow x1={COL[0] + BW} y1={245} x2={COL[1] - 2} y2={245} />
          <Arrow x1={COL[1] + BW} y1={245} x2={COL[2] - 2} y2={245} />

          <text x={40} y={288} fontSize={11.5} fontStyle="italic" fill={MUTE}>
            Every reply, from all three lanes, flows into the same pipeline below ↓
          </text>
        </svg>

        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
          <span><span className="inline-block w-3 h-3 rounded-sm align-middle mr-1" style={{ background: GREEN.fill, border: `1px solid ${GREEN.stroke}` }} /> Runs automatically</span>
          <span><span className="inline-block w-3 h-3 rounded-sm align-middle mr-1" style={{ background: BLUE.fill, border: `1px solid ${BLUE.stroke}` }} /> 🔒 A person sends</span>
          <span><span className="inline-block w-3 h-3 rounded-sm align-middle mr-1" style={{ background: AMBER.fill, border: `1px solid ${AMBER.stroke}` }} /> Safety gate / auto-stop</span>
        </div>
      </div>

      {/* ============ PART 2: THE REPLY PIPELINE ============ */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-shortcut-navy-blue mb-1">Every reply is handled the same way</h2>
        <p className="text-sm text-gray-500 mb-4 max-w-3xl">
          No matter which lane sent it, one pipeline catches every reply, reads what it means, removes anyone who
          opted out, and puts the interested ones in front of a person &mdash; ready to reply.
        </p>
        <svg width="100%" viewBox="0 0 920 210" role="img" aria-label="The shared reply pipeline" style={{ maxWidth: 940 }}>
          <defs>
            <marker id="pipeArrow" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6" fill="none" stroke={ARROW} strokeWidth={1.5} />
            </marker>
          </defs>

          <Box x={COL[0]} y={20} tone={GREEN} title="Catch replies" sub="hourly, every inbox" />
          <Box x={COL[1]} y={20} tone={GREEN} title="Sort them" sub="interested? no? away?" />
          <Box x={COL[2]} y={20} tone={GREEN} title="Clean up" sub="drop dead + opted-out" />
          <Box x={COL[3]} y={20} tone={GREEN} title="Refresh lists" sub="update the sales view" />
          <Box x={COL[4]} y={20} tone={BLUE} title="Hand off" sub="hot lead → a person" door />

          <line x1={COL[0] + BW} y1={49} x2={COL[1] - 2} y2={49} stroke={ARROW} strokeWidth={1.5} markerEnd="url(#pipeArrow)" />
          <line x1={COL[1] + BW} y1={49} x2={COL[2] - 2} y2={49} stroke={ARROW} strokeWidth={1.5} markerEnd="url(#pipeArrow)" />
          <line x1={COL[2] + BW} y1={49} x2={COL[3] - 2} y2={49} stroke={ARROW} strokeWidth={1.5} markerEnd="url(#pipeArrow)" />
          <line x1={COL[3] + BW} y1={49} x2={COL[4] - 2} y2={49} stroke={ARROW} strokeWidth={1.5} markerEnd="url(#pipeArrow)" />

          {/* hand-off payoff */}
          <line x1={COL[4] + BW / 2} y1={78} x2={COL[4] + BW / 2} y2={104} stroke={ARROW} strokeWidth={1.5} markerEnd="url(#pipeArrow)" />
          <Box x={COL[4] - 32} y={106} w={182} tone={BLUE} title="Draft reply + alert the rep" sub="the rep reviews and sends 🔒" />

          {/* feedback note: these results feed the brain (Part 3, below) */}
          <text x={40} y={150} fontSize={11.5} fontStyle="italic" fill="#9333ea">
            Everything this pipeline sorts becomes the scorecard the brain learns from ↓
          </text>
        </svg>

        <div className="mt-4 text-xs text-gray-400">
          The computer drafts and alerts; a human always clicks the final Send. Incoming email is never trusted to act on its own.
        </div>
      </div>

      {/* ============ PART 3: THE BRAIN ============ */}
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

      {/* ============ PART 4: WHEN IT RUNS ============ */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-shortcut-navy-blue mb-1">When it runs</h2>
        <p className="text-sm text-gray-500 mb-4 max-w-3xl">
          Two clocks. The cloud handles the always-on hourly work; the daily and weekly routines run each morning.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
          <div>
            <h4 className="text-sm font-semibold text-shortcut-navy-blue mb-1">Always on (cloud, hourly)</h4>
            <ScheduleRow when="Every hour" what="Catch new replies from Smartlead and from reps' Gmail" />
            <ScheduleRow when="Real time" what="A rep's Gmail reply is recorded the instant it lands" />
            <ScheduleRow when="Each morning, per rep" what="Personal Slack digest of what needs attention" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-shortcut-navy-blue mb-1">Daily & weekly (early morning)</h4>
            <ScheduleRow when="Every morning" what="Read & sort replies, clean the list, refresh the boards, hand off hot leads" />
            <ScheduleRow when="Weekdays" what="Draft Will's founder notes; auto-send his follow-ups (9:15am & 1:45pm)" />
            <ScheduleRow when="Every Monday" what="Learn what worked, then build and launch the week's batch + one experiment" />
          </div>
        </div>
      </div>
    </div>
  );
}
