import React, { useState } from 'react';
import { Calendar, Clock, MapPin, Video, FileText, Heart, Brain, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { ProposalData } from '../types/proposal';
import { getCLEStateConfig } from '../config/cleStateConfigs';

interface MindfulnessProposalContentProps {
  data: ProposalData;
  customization?: {
    customNote?: string;
    contactFirstName?: string;
    contactLastName?: string;
  };
  excludeSchedule?: boolean;
  scheduleOnly?: boolean;
}

// Helper component for Program Overview Section
const ProgramOverviewSection: React.FC<{ program: any }> = ({ program }) => {
  const formatFullDate = (dateString: string) => {
    if (!dateString || dateString === 'TBD') return 'Date TBD';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Date TBD';
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="card-large">
      <h2 className="h2 mb-10">Program Overview</h2>
      <div className="space-y-8">
        <div className="pb-8 border-b-2 border-gray-200">
          <div className="text-sm font-bold text-shortcut-blue mb-4 uppercase tracking-wider">Schedule</div>
          <div className="text-lg font-medium text-text-dark leading-relaxed">
            Weekly sessions from <strong className="text-shortcut-navy-blue font-extrabold">{formatFullDate(program.startDate)}</strong> – <strong className="text-shortcut-navy-blue font-extrabold">{formatFullDate(program.endDate)}</strong>
          </div>
        </div>
        
        <div className="pb-8 border-b-2 border-gray-200">
          <div className="text-sm font-bold text-shortcut-blue mb-4 uppercase tracking-wider">Facilitator</div>
          <div className="text-lg font-medium text-text-dark leading-relaxed">
            <strong className="text-shortcut-navy-blue font-extrabold">{program.facilitatorName}</strong>, Shortcut's Mindfulness Meditation Leader, will be the sole instructor, ensuring a consistent and reliable experience. {program.facilitatorName} specializes in guiding high-performing teams through punctual, engaging, and impactful mindfulness sessions.
          </div>
        </div>
        
        <div>
          <div className="text-sm font-bold text-shortcut-blue mb-4 uppercase tracking-wider">Content</div>
          <div className="text-lg font-medium text-text-dark leading-relaxed">
            Employees will learn formal and informal mindfulness practices designed to reduce stress and enhance productivity. Each session concludes with optional group sharing and discussion to foster engagement and build community.
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper component for Why Shortcut Section
export const WhyShortcutSection: React.FC = () => (
  <div className="card-large bg-gradient-to-br from-shortcut-teal/10 to-shortcut-teal/5 border-2 border-shortcut-teal border-opacity-20">
    <h2 className="h2 mb-8 text-shortcut-navy-blue">Why Shortcut?</h2>
    <p className="text-lg font-medium text-text-dark mb-6 leading-relaxed">
      With Shortcut, you can count on:
    </p>
    <div className="space-y-6">
      <div className="flex items-start space-x-4">
        <div className="w-3 h-3 rounded-full bg-shortcut-teal mt-2 flex-shrink-0"></div>
        <div>
          <p className="text-lg font-extrabold text-shortcut-navy-blue mb-2">Dedicated Facilitator</p>
          <p className="text-base font-medium text-text-dark leading-relaxed">
            Courtney Schulnick, who brings over two decades of experience and will guide every session to ensure continuity and reliability.
          </p>
        </div>
      </div>
      <div className="flex items-start space-x-4">
        <div className="w-3 h-3 rounded-full bg-shortcut-teal mt-2 flex-shrink-0"></div>
        <div>
          <p className="text-lg font-extrabold text-shortcut-navy-blue mb-2">Punctual and Prepared Sessions</p>
          <p className="text-base font-medium text-text-dark leading-relaxed">
            Each session is expertly planned and starts promptly, maximizing the value of your team's time.
          </p>
        </div>
      </div>
      <div className="flex items-start space-x-4">
        <div className="w-3 h-3 rounded-full bg-shortcut-teal mt-2 flex-shrink-0"></div>
        <div>
          <p className="text-lg font-extrabold text-shortcut-navy-blue mb-2">Effortless Scheduling</p>
          <p className="text-base font-medium text-text-dark leading-relaxed">
            Shortcut's advanced scheduling technology simplifies program management, making the process a breeze for your team.
          </p>
        </div>
      </div>
    </div>
  </div>
);

// Helper component for CLE-specific Why Shortcut Section
export const CLEWhyShortcutSection: React.FC<{ cleState?: string }> = ({ cleState }) => {
  const cfg = getCLEStateConfig(cleState);
  return (
  <div className="card-large bg-gradient-to-br from-shortcut-teal/10 to-shortcut-teal/5 border-2 border-shortcut-teal border-opacity-20">
    <h2 className="h2 mb-8 text-shortcut-navy-blue">Why Shortcut?</h2>
    <p className="text-lg font-medium text-text-dark mb-6 leading-relaxed">
      With Shortcut, you can count on:
    </p>
    <div className="space-y-6">
      <div className="flex items-start space-x-4">
        <div className="w-3 h-3 rounded-full bg-shortcut-teal mt-2 flex-shrink-0"></div>
        <div>
          <p className="text-lg font-extrabold text-shortcut-navy-blue mb-2">Dedicated Facilitator</p>
          <p className="text-base font-medium text-text-dark leading-relaxed">
            Courtney Schulnick, who brings over two decades of experience and will guide every session to ensure continuity and reliability.
          </p>
        </div>
      </div>
      <div className="flex items-start space-x-4">
        <div className="w-3 h-3 rounded-full bg-shortcut-teal mt-2 flex-shrink-0"></div>
        <div>
          <p className="text-lg font-extrabold text-shortcut-navy-blue mb-2">Punctual and Prepared Sessions</p>
          <p className="text-base font-medium text-text-dark leading-relaxed">
            Each session is expertly planned and starts promptly, maximizing the value of your team's time.
          </p>
        </div>
      </div>
      <div className="flex items-start space-x-4">
        <div className="w-3 h-3 rounded-full bg-shortcut-teal mt-2 flex-shrink-0"></div>
        <div>
          <p className="text-lg font-extrabold text-shortcut-navy-blue mb-2">Full CLE Administration</p>
          <p className="text-base font-medium text-text-dark leading-relaxed">
            Shortcut manages the entire CLE process including accreditation submission, attendance tracking, and credit reporting—no administrative burden on your firm.
          </p>
        </div>
      </div>
      <div className="flex items-start space-x-4">
        <div className="w-3 h-3 rounded-full bg-shortcut-teal mt-2 flex-shrink-0"></div>
        <div>
          <p className="text-lg font-extrabold text-shortcut-navy-blue mb-2">Ethics & Professionalism Credit</p>
          <p className="text-base font-medium text-text-dark leading-relaxed">
            This program qualifies for {cfg.creditDesc}, accredited for the state of {cfg.name}.
          </p>
        </div>
      </div>
      <div className="flex items-start space-x-4">
        <div className="w-3 h-3 rounded-full bg-shortcut-teal mt-2 flex-shrink-0"></div>
        <div>
          <p className="text-lg font-extrabold text-shortcut-navy-blue mb-2">Effortless Scheduling</p>
          <p className="text-base font-medium text-text-dark leading-relaxed">
            Shortcut's advanced scheduling technology simplifies program management, making the process a breeze for your team.
          </p>
        </div>
      </div>
    </div>
  </div>
  );
};

// Helper component for Participant Benefits Section
export const ParticipantBenefitsSection: React.FC = () => (
  <div className="card-large">
    <h2 className="h2 mb-10">Participant Benefits</h2>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div className="p-8 bg-gradient-to-br from-shortcut-teal/10 to-shortcut-teal/5 rounded-xl border-2 border-shortcut-teal border-opacity-30 hover:border-opacity-50 hover:shadow-lg transition-all">
        <div className="flex items-center space-x-3 mb-5">
          <div className="w-12 h-12 rounded-full bg-shortcut-teal bg-opacity-20 flex items-center justify-center flex-shrink-0">
            <Brain className="w-6 h-6 text-shortcut-blue" />
          </div>
          <h3 className="text-xl font-extrabold text-shortcut-navy-blue">Reduced Stress</h3>
        </div>
        <p className="text-lg text-text-dark leading-relaxed font-medium">
          Improved resilience and stress management capabilities
        </p>
      </div>
      <div className="p-8 bg-gradient-to-br from-shortcut-teal/10 to-shortcut-teal/5 rounded-xl border-2 border-shortcut-teal border-opacity-30 hover:border-opacity-50 hover:shadow-lg transition-all">
        <div className="flex items-center space-x-3 mb-5">
          <div className="w-12 h-12 rounded-full bg-shortcut-teal bg-opacity-20 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-6 h-6 text-shortcut-blue" />
          </div>
          <h3 className="text-xl font-extrabold text-shortcut-navy-blue">Enhanced Focus</h3>
        </div>
        <p className="text-lg text-text-dark leading-relaxed font-medium">
          Better decision-making and cognitive performance
        </p>
      </div>
      <div className="p-8 bg-gradient-to-br from-shortcut-teal/10 to-shortcut-teal/5 rounded-xl border-2 border-shortcut-teal border-opacity-30 hover:border-opacity-50 hover:shadow-lg transition-all">
        <div className="flex items-center space-x-3 mb-5">
          <div className="w-12 h-12 rounded-full bg-shortcut-teal bg-opacity-20 flex items-center justify-center flex-shrink-0">
            <Heart className="w-6 h-6 text-shortcut-blue" />
          </div>
          <h3 className="text-xl font-extrabold text-shortcut-navy-blue">Daily Practice</h3>
        </div>
        <p className="text-lg text-text-dark leading-relaxed font-medium">
          Practical techniques for daily mindfulness integration
        </p>
      </div>
    </div>
  </div>
);

// Helper component for Additional Resources Section
export const AdditionalResourcesSection: React.FC = () => (
  <div className="card-large">
    <h2 className="h2 mb-10">Additional Resources</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="p-8 bg-white border-2 border-shortcut-teal border-opacity-30 rounded-xl shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center space-x-4 mb-5">
          <div className="w-12 h-12 rounded-full bg-shortcut-teal bg-opacity-10 flex items-center justify-center flex-shrink-0">
            <FileText className="w-6 h-6 text-shortcut-blue" />
          </div>
          <h3 className="text-xl font-extrabold text-shortcut-navy-blue">Customized Audio Recordings</h3>
        </div>
        <p className="text-lg text-text-dark leading-relaxed font-medium">
          A recording of a guided meditation designed to calm the nervous system and strengthen present moment awareness.
        </p>
      </div>
      <div className="p-8 bg-white border-2 border-shortcut-teal border-opacity-30 rounded-xl shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center space-x-4 mb-5">
          <div className="w-12 h-12 rounded-full bg-shortcut-teal bg-opacity-10 flex items-center justify-center flex-shrink-0">
            <FileText className="w-6 h-6 text-shortcut-blue" />
          </div>
          <h3 className="text-xl font-extrabold text-shortcut-navy-blue">Personalized Handouts & Exercises</h3>
        </div>
        <p className="text-lg text-text-dark leading-relaxed font-medium">
          Handouts that compliment the session and offer ways to increasingly weave mindfulness into your daily life.
        </p>
      </div>
    </div>
  </div>
);

// Helper component for CLE Class Outline Section (collapsible)
export const CLEClassOutlineSection: React.FC<{ cleState?: string }> = ({ cleState }) => {
  const cfg = getCLEStateConfig(cleState);
  const [isExpanded, setIsExpanded] = useState(false);

  const outlineItems = [
    { time: '0:00 – 4:00', title: 'Welcome & Course Overview', bullets: ['Purpose of the program', 'Relevance of mindfulness to ethical lawyering and professional judgment', 'Framing mindfulness as a professional skill, not a wellness add-on'] },
    { time: '4:00 – 8:00', title: 'What Is Mindfulness?', bullets: ['Definition of mindfulness and present-moment awareness', 'Mindfulness as an innate capacity that can be strengthened', 'Why this matters in demanding legal environments'] },
    { time: '8:00 – 13:00', title: 'Distraction, Autopilot, and Ethical Risk', bullets: ['Why attorneys become distracted and cognitively overloaded', 'How "autopilot mode" increases the risk of errors, miscommunication, and reactive behavior', 'Connection between distraction, stress, and ethical lapses'] },
    { time: '13:00 – 18:00', title: 'Competence, Ethics, and Attorney Well-Being', bullets: [`Ethical obligations under ${cfg.rulesName}`, 'The relationship between competence, judgment, and an attorney\'s mental and emotional state', 'Why chronic stress undermines ethical awareness'] },
    { time: '18:00 – 24:00', title: 'The Overextended Lawyer', bullets: ['Research and data on attorney stress, burnout, and overwork', 'Cultural norms in large law firms and their ethical implications', 'Why self-regulation is an ethical skill, not a personal indulgence'] },
    { time: '24:00 – 30:00', title: 'How Mindfulness Supports Ethical Decision-Making', bullets: ['Improving focus, attention, and clarity', 'Reducing reactivity in difficult conversations and high-pressure moments', 'Strengthening discernment versus judgment'] },
    { time: '30:00 – 36:00', title: 'Stress, Perception, and Choice', bullets: ['Distinguishing between stressors and stress', 'The role of perception in ethical responses', 'How mindfulness increases choice in challenging situations'] },
    { time: '36:00 – 46:00', title: 'PRO Practice (Pause – Relax – Open)', bullets: ['Explanation of the PRO framework', 'Guided formal mindfulness practice', 'Noticing present-moment experience without judgment'] },
    { time: '46:00 – 52:00', title: 'On-the-Spot Practices for the Workday', bullets: ['Brief, discreet practices attorneys can use immediately', 'Integrating mindfulness into meetings, transitions, and decision points'] },
    { time: '52:00 – 58:00', title: 'Ethical Application & Integration', bullets: ['Applying mindfulness to client interactions, negotiations, and internal collaboration', 'Maintaining professionalism under pressure', 'Reducing risk through awareness and intentional response'] },
    { time: '58:00 – 60:00', title: 'Closing & Key Takeaways', bullets: ['Final reflections and Q&A', 'Resources for continued practice'] },
  ];

  return (
    <div className="card-large">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <h2 className="h2 text-shortcut-navy-blue">Class Outline & Timed Agenda</h2>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isExpanded ? 'bg-shortcut-teal/20' : 'bg-gray-100 hover:bg-gray-200'}`}>
          {isExpanded ? <ChevronUp className="w-5 h-5 text-shortcut-blue" /> : <ChevronDown className="w-5 h-5 text-shortcut-blue" />}
        </div>
      </button>
      {!isExpanded && (
        <p className="text-base text-text-dark-60 font-medium mt-3">
          60-minute timed agenda covering ethics, mindfulness practices, and professional application
        </p>
      )}
      {isExpanded && (
        <div className="mt-6 space-y-1">
          {outlineItems.map((item, index) => (
            <div key={index} className={`py-4 px-4 rounded-lg ${index % 2 === 0 ? 'bg-gradient-to-r from-shortcut-teal/5 to-transparent' : 'bg-white'}`}>
              <div className="flex items-start gap-4">
                <span className="text-sm font-bold text-shortcut-blue whitespace-nowrap mt-0.5 min-w-[90px]">
                  {item.time}
                </span>
                <div className="flex-1">
                  <p className="text-base font-extrabold text-shortcut-navy-blue mb-2">{item.title}</p>
                  <ul className="space-y-1">
                    {item.bullets.map((bullet, bIndex) => (
                      <li key={bIndex} className="flex items-start gap-2 text-sm text-text-dark leading-relaxed">
                        <span className="w-1.5 h-1.5 rounded-full bg-shortcut-teal mt-1.5 flex-shrink-0"></span>
                        {bullet}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Helper component for CLE Accreditation & Administration Section (collapsible)
export const CLEAccreditationSection: React.FC<{ cleState?: string }> = ({ cleState }) => {
  const cfg = getCLEStateConfig(cleState);
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="card-large">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <h2 className="h2 text-shortcut-navy-blue">CLE Accreditation & Administration</h2>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isExpanded ? 'bg-shortcut-teal/20' : 'bg-gray-100 hover:bg-gray-200'}`}>
          {isExpanded ? <ChevronUp className="w-5 h-5 text-shortcut-blue" /> : <ChevronDown className="w-5 h-5 text-shortcut-blue" />}
        </div>
      </button>
      {!isExpanded && (
        <p className="text-base text-text-dark-60 font-medium mt-3">
          Accredited for {cfg.creditLabel} — Shortcut handles all administration
        </p>
      )}
      {isExpanded && (
        <div className="mt-6 space-y-6">
          <div className="p-6 bg-gradient-to-br from-shortcut-teal/10 to-shortcut-teal/5 rounded-xl border-2 border-shortcut-teal border-opacity-20">
            <p className="text-lg font-medium text-text-dark leading-relaxed">
              This program is offered as an accredited Continuing Legal Education (CLE) course, approved for <strong className="text-shortcut-navy-blue">{cfg.creditDesc}</strong>.
            </p>
          </div>

          <div>
            <p className="text-base font-extrabold text-shortcut-navy-blue mb-4">Shortcut manages the entire CLE accreditation process, including:</p>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-shortcut-teal mt-1.5 flex-shrink-0"></div>
                <p className="text-base font-medium text-text-dark leading-relaxed">
                  <strong className="text-shortcut-navy-blue">Submission of materials</strong> to {cfg.boardName}
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-shortcut-teal mt-1.5 flex-shrink-0"></div>
                <p className="text-base font-medium text-text-dark leading-relaxed">
                  <strong className="text-shortcut-navy-blue">Attendance tracking</strong> for all participants
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-shortcut-teal mt-1.5 flex-shrink-0"></div>
                <p className="text-base font-medium text-text-dark leading-relaxed">
                  <strong className="text-shortcut-navy-blue">CLE credit reporting</strong> — the firm does not need to handle CLE paperwork or administrative follow-up
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper component for Cost Breakdown Section
const CostBreakdownSection: React.FC<{ program: any; data: ProposalData }> = ({ program, data }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Get actual session durations from the sessions array
  const getInPersonDuration = () => {
    const inPersonSession = program.sessions?.find((s: any) => s.type === 'in-person');
    return inPersonSession?.duration || 45; // Default to 45 if not found
  };

  const getVirtualDuration = () => {
    const virtualSession = program.sessions?.find((s: any) => s.type === 'virtual');
    return virtualSession?.duration || 30; // Default to 30 if not found
  };

  const inPersonDuration = getInPersonDuration();
  const virtualDuration = getVirtualDuration();

  return (
    <div className="card-large">
      <h2 className="h2 mb-10">Cost Breakdown</h2>
      <div className="space-y-5">
        <div className="flex justify-between items-start py-6 px-8 bg-gradient-to-r from-shortcut-teal/10 to-white rounded-xl border-2 border-shortcut-teal border-opacity-30 hover:border-opacity-50 transition-all hover:shadow-md">
          <div className="flex-1 pr-8">
            <div className="flex items-center space-x-3 mb-3">
              <MapPin className="w-5 h-5 text-shortcut-blue flex-shrink-0" />
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-lg font-extrabold text-shortcut-navy-blue">
                  {program.inPersonSessions}
                </span>
                <span className="text-lg font-extrabold text-shortcut-navy-blue">
                  {inPersonDuration}-minute
                </span>
                <span className="text-lg font-extrabold text-shortcut-navy-blue">
                  {program.inPersonSessions === 1 ? 'in-person session' : 'in-person sessions'}
                </span>
              </div>
            </div>
            <span className="text-base text-text-dark-60 font-medium pl-8">
              {formatCurrency(program.pricing.inPersonPricePerSession)} per session
            </span>
          </div>
          <span className="text-3xl font-extrabold text-shortcut-navy-blue flex-shrink-0 ml-8">
            {formatCurrency(program.pricing.inPersonTotal)}
          </span>
        </div>
        <div className="flex justify-between items-start py-6 px-8 bg-gradient-to-r from-shortcut-pink/10 to-white rounded-xl border-2 border-shortcut-pink border-opacity-30 hover:border-opacity-50 transition-all hover:shadow-md">
          <div className="flex-1 pr-8">
            <div className="flex items-center space-x-3 mb-3">
              <Video className="w-5 h-5 text-shortcut-blue flex-shrink-0" />
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-lg font-extrabold text-shortcut-navy-blue">
                  {program.virtualSessions}
                </span>
                <span className="text-lg font-extrabold text-shortcut-navy-blue">
                  {virtualDuration}-minute
                </span>
                <span className="text-lg font-extrabold text-shortcut-navy-blue">
                  {program.virtualSessions === 1 ? 'virtual session' : 'virtual sessions'}
                </span>
              </div>
            </div>
            <span className="text-base text-text-dark-60 font-medium pl-8">
              {formatCurrency(program.pricing.virtualPricePerSession)} per session
            </span>
          </div>
          <span className="text-3xl font-extrabold text-shortcut-navy-blue flex-shrink-0 ml-8">
            {formatCurrency(program.pricing.virtualTotal)}
          </span>
        </div>
        <div className="flex justify-between items-center py-6 px-8 bg-gradient-to-r from-shortcut-teal/5 to-white rounded-xl border-2 border-gray-200 hover:border-shortcut-teal hover:border-opacity-30 transition-all">
          <div className="flex items-center space-x-3">
            <FileText className="w-5 h-5 text-shortcut-blue flex-shrink-0" />
            <span className="text-lg font-extrabold text-shortcut-navy-blue">Resources (recordings, handouts)</span>
          </div>
          <span className="text-3xl font-extrabold text-shortcut-navy-blue flex-shrink-0 ml-8">
            {formatCurrency(program.pricing.resourcesPrice)}
          </span>
        </div>
        {(program.pricing.discountPercent || 0) > 0 && (
          <>
            <div className="flex justify-between items-center pt-6 mt-3 border-t border-gray-200 px-8">
              <span className="text-xl font-semibold text-shortcut-navy-blue">
                Subtotal:
              </span>
              <span className="text-2xl font-semibold text-shortcut-navy-blue">
                {formatCurrency(program.pricing.subtotal || 
                  ((program.pricing.inPersonTotal || 0) + (program.pricing.virtualTotal || 0) + (program.pricing.resourcesPrice || 0)))}
              </span>
            </div>
            <div className="flex justify-between items-center px-8 text-red-600">
              <span className="text-xl font-semibold">
                Discount ({program.pricing.discountPercent}%):
              </span>
              <span className="text-2xl font-semibold">
                -{formatCurrency(program.pricing.discountAmount || 0)}
              </span>
            </div>
          </>
        )}
        <div className="flex justify-between items-center pt-8 mt-3 border-t-2 border-shortcut-navy-blue bg-gradient-to-r from-shortcut-navy-blue/5 to-transparent rounded-lg px-8 py-6">
          <span className="text-3xl font-extrabold text-shortcut-navy-blue">
            &gt;&gt; Total Cost:
          </span>
          <span className="text-4xl font-extrabold text-shortcut-navy-blue">
            {formatCurrency(program.pricing.totalCost)}
          </span>
        </div>
        {data.summary.totalAppointments > 0 && (
          <div className="mt-8 pt-8 border-t-2 border-shortcut-teal bg-gradient-to-br from-shortcut-teal/10 to-shortcut-teal/5 rounded-xl px-8 py-6 border-2 border-shortcut-teal border-opacity-30">
            <div className="flex items-start space-x-4">
              <div className="w-3 h-3 rounded-full bg-shortcut-teal mt-1.5 flex-shrink-0"></div>
              <div className="text-lg font-medium text-text-dark leading-relaxed">
                <strong className="text-shortcut-navy-blue">&gt;&gt; Cost Per Person:</strong> For <strong className="text-shortcut-navy-blue">{data.summary.totalAppointments}</strong> participants, the cost is approximately <strong className="text-shortcut-navy-blue">{formatCurrency(program.pricing.costPerParticipant)}</strong> per person for the full program or <strong className="text-shortcut-navy-blue">{formatCurrency(program.pricing.costPerSession)}</strong> per session.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Session Card Component with Expandable Description
const SessionCard: React.FC<{ session: any; isInPerson: boolean; formatDate: (date: string) => string; formatTime: (time: string) => string | null }> = ({ 
  session, 
  isInPerson, 
  formatDate, 
  formatTime 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const sessionTime = formatTime(session.time);
  const description = session.content || '';
  const shouldTruncate = description.length > 150; // Show "View more" if description is longer than 150 chars
  const displayDescription = shouldTruncate && !isExpanded 
    ? description.substring(0, 150) + '...' 
    : description;

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border-2 transition-all duration-300 hover:shadow-xl hover:scale-[1.01] ${
        isInPerson
          ? 'bg-gradient-to-br from-shortcut-teal/5 via-white to-shortcut-teal/5 border-shortcut-teal/30 hover:border-shortcut-teal/60'
          : 'bg-gradient-to-br from-shortcut-pink/5 via-white to-shortcut-pink/5 border-shortcut-pink/30 hover:border-shortcut-pink/60'
      }`}
    >
      {/* Session Number Badge - Top Left - Smaller for more title space */}
      <div className="absolute top-0 left-0 w-12 h-12 lg:w-14 lg:h-14 bg-gradient-to-br from-shortcut-navy-blue to-shortcut-dark-blue rounded-br-xl lg:rounded-br-2xl flex items-center justify-center shadow-md z-10">
        <span className="text-lg lg:text-xl font-extrabold text-white">
          {session.sessionNumber}
        </span>
      </div>

      {/* Content */}
      <div className="pt-4 pb-4 px-4 lg:pt-5 lg:pb-5 lg:px-5">
        {/* Header Section */}
        <div className="mb-3 lg:mb-4 pl-14 lg:pl-16">
          <h3 className="text-base lg:text-lg font-extrabold text-shortcut-navy-blue mb-2.5 leading-snug">
            {session.title || `Class ${session.sessionNumber}`}
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center px-2.5 lg:px-3 py-1 lg:py-1.5 rounded-full text-xs font-bold ${
              isInPerson
                ? 'bg-shortcut-teal/20 text-shortcut-navy-blue border border-shortcut-teal'
                : 'bg-shortcut-pink/20 text-shortcut-navy-blue border border-shortcut-pink'
            }`}>
              {isInPerson ? (
                <MapPin className="w-3 h-3 lg:w-3.5 lg:h-3.5 mr-1 lg:mr-1.5" />
              ) : (
                <Video className="w-3 h-3 lg:w-3.5 lg:h-3.5 mr-1 lg:mr-1.5" />
              )}
              {isInPerson ? 'In-Person' : 'Virtual'}
            </span>
            <span className="inline-flex items-center text-xs font-semibold text-text-dark-60">
              <Clock className="w-3 h-3 lg:w-3.5 lg:h-3.5 mr-1 lg:mr-1.5 text-shortcut-blue" />
              {session.duration}m
            </span>
          </div>
        </div>

        {/* Description with Expand/Collapse */}
        {description && (
          <div className="mb-4 lg:mb-5 pl-14 lg:pl-16">
            <p className="text-sm lg:text-base text-text-dark leading-relaxed whitespace-pre-wrap">
              {displayDescription}
            </p>
            {shouldTruncate && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="mt-2 inline-flex items-center space-x-1 text-sm font-semibold text-shortcut-blue hover:text-shortcut-navy-blue transition-colors group/btn"
              >
                <span>{isExpanded ? 'Show less' : 'View more'}</span>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 group-hover/btn:translate-y-[-2px] transition-transform" />
                ) : (
                  <ChevronDown className="w-4 h-4 group-hover/btn:translate-y-[2px] transition-transform" />
                )}
              </button>
            )}
          </div>
        )}

        {/* Details Grid */}
        <div className="space-y-2.5 lg:space-y-3 pt-3 lg:pt-4 border-t border-gray-200/50 pl-14 lg:pl-16">
          {session.date && session.date !== 'TBD' && (
            <div className="flex items-start space-x-2.5">
              <div className="w-7 h-7 rounded-lg bg-shortcut-teal/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-shortcut-blue" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-shortcut-blue uppercase tracking-wide mb-0.5">Date</p>
                <p className="text-sm font-semibold text-text-dark leading-snug">{formatDate(session.date)}</p>
              </div>
            </div>
          )}
          
          {sessionTime && (
            <div className="flex items-start space-x-2.5">
              <div className="w-7 h-7 rounded-lg bg-shortcut-teal/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Clock className="w-3.5 h-3.5 text-shortcut-blue" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-shortcut-blue uppercase tracking-wide mb-0.5">Time</p>
                <p className="text-sm font-semibold text-text-dark leading-snug">{sessionTime}</p>
              </div>
            </div>
          )}
          
          {session.time === 'TBD' && (
            <div className="flex items-start space-x-2.5">
              <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-0.5">Time</p>
                <p className="text-sm font-semibold text-gray-500 italic leading-snug">TBD</p>
              </div>
            </div>
          )}

          {session.location && (
            <div className="flex items-start space-x-2.5">
              <div className="w-7 h-7 rounded-lg bg-shortcut-teal/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-shortcut-blue" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-shortcut-blue uppercase tracking-wide mb-0.5">Location</p>
                <p className="text-sm font-semibold text-text-dark leading-snug break-words">{session.location}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Decorative Accent Line */}
      <div className={`absolute bottom-0 left-0 right-0 h-1 ${
        isInPerson
          ? 'bg-gradient-to-r from-shortcut-teal via-shortcut-teal/50 to-transparent'
          : 'bg-gradient-to-r from-shortcut-pink via-shortcut-pink/50 to-transparent'
      }`} />
    </div>
  );
};

// Program Schedule Section - Innovative Card-Based Grid Design
const ProgramScheduleSection: React.FC<{ program: any }> = ({ program }) => {
  const formatDate = (dateString: string) => {
    if (!dateString || dateString === 'TBD' || dateString === 'Date TBD') return 'TBD';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'TBD';
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'TBD';
    }
  };

  const formatTime = (timeString: string) => {
    if (!timeString || timeString === 'TBD') return null;
    try {
      return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return null;
    }
  };

  return (
    <div className="card-large">
      <div className="mb-8 lg:mb-10">
        <h2 className="h2 mb-2 lg:mb-3">Program Schedule</h2>
        <p className="text-base lg:text-lg text-text-dark-60 font-medium leading-relaxed">
          A comprehensive journey through {program.totalSessions} carefully designed sessions
        </p>
      </div>
      
      {/* Innovative Grid Layout - Works beautifully on all screen sizes with dynamic card heights */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 lg:gap-6 xl:gap-7">
        {program.sessions.map((session: any) => {
          const isInPerson = session.type === 'in-person';
          
          return (
            <SessionCard
              key={session.sessionNumber}
              session={session}
              isInPerson={isInPerson}
              formatDate={formatDate}
              formatTime={formatTime}
            />
          );
        })}
      </div>

      {/* Summary Footer */}
      <div className="mt-6 lg:mt-8 pt-6 lg:pt-8 border-t-2 border-shortcut-teal/20">
        {(() => {
          // Calculate session durations
          const inPersonSessions = program.sessions.filter((s: any) => s.type === 'in-person');
          const virtualSessions = program.sessions.filter((s: any) => s.type === 'virtual');
          
          // Get unique durations for each type
          const inPersonDurations = [...new Set(inPersonSessions.map((s: any) => s.duration || 0).filter((d: number) => d > 0))];
          const virtualDurations = [...new Set(virtualSessions.map((s: any) => s.duration || 0).filter((d: number) => d > 0))];
          
          // Count sessions by duration
          const inPersonDurationCounts: Record<number, number> = {};
          inPersonSessions.forEach((s: any) => {
            const dur = s.duration || 0;
            if (dur > 0) {
              inPersonDurationCounts[dur] = (inPersonDurationCounts[dur] || 0) + 1;
            }
          });
          
          const virtualDurationCounts: Record<number, number> = {};
          virtualSessions.forEach((s: any) => {
            const dur = s.duration || 0;
            if (dur > 0) {
              virtualDurationCounts[dur] = (virtualDurationCounts[dur] || 0) + 1;
            }
          });
          
          // Calculate total minutes
          const totalMinutes = program.sessions.reduce((sum: number, s: any) => sum + (s.duration || 0), 0);
          const hours = Math.floor(totalMinutes / 60);
          const minutes = totalMinutes % 60;
          const formatTotalTime = hours > 0 
            ? `${hours} ${hours === 1 ? 'hour' : 'hours'}${minutes > 0 ? ` ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}` : ''}`
            : `${totalMinutes} ${totalMinutes === 1 ? 'minute' : 'minutes'}`;
          
          return (
            <div className="flex flex-wrap items-center justify-center gap-4 lg:gap-6 text-sm lg:text-base">
              {program.inPersonSessions > 0 && (
                <div className="flex items-center space-x-2.5">
                  <div className="w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full bg-shortcut-teal flex-shrink-0"></div>
                  <span className="font-semibold text-text-dark">
                    <span className="text-shortcut-navy-blue font-extrabold">{program.inPersonSessions}</span> In-Person
                    {inPersonDurations.length > 0 && (
                      <span className="text-text-dark-60 font-normal">
                        {' '}({Object.entries(inPersonDurationCounts)
                          .map(([dur, count]) => `${count} × ${dur}-min`)
                          .join(', ')})</span>
                    )}
                  </span>
                </div>
              )}
              {program.virtualSessions > 0 && (
                <div className="flex items-center space-x-2.5">
                  <div className="w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full bg-shortcut-pink flex-shrink-0"></div>
                  <span className="font-semibold text-text-dark">
                    <span className="text-shortcut-navy-blue font-extrabold">{program.virtualSessions}</span> Virtual
                    {virtualDurations.length > 0 && (
                      <span className="text-text-dark-60 font-normal">
                        {' '}({Object.entries(virtualDurationCounts)
                          .map(([dur, count]) => `${count} × ${dur}-min`)
                          .join(', ')})</span>
                    )}
                  </span>
                </div>
              )}
              <div className="flex items-center space-x-2.5">
                <Clock className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-shortcut-blue flex-shrink-0" />
                <span className="font-semibold text-text-dark">
                  <span className="text-shortcut-navy-blue font-extrabold">{formatTotalTime}</span> total
                </span>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export const MindfulnessProposalContent: React.FC<MindfulnessProposalContentProps> = ({
  data,
  excludeSchedule = false,
  scheduleOnly = false
}) => {
  const program = data.mindfulnessProgram;
  if (!program) return null;

  // If scheduleOnly is true, only render the schedule
  if (scheduleOnly) {
    return <ProgramScheduleSection program={program} />;
  }

  // If excludeSchedule is true, render everything except schedule
  if (excludeSchedule) {
    return (
      <div className="space-y-12">
        <ProgramOverviewSection program={program} />
        <WhyShortcutSection />
        <ParticipantBenefitsSection />
        <AdditionalResourcesSection />
        <CostBreakdownSection program={program} data={data} />
      </div>
    );
  }

  // Default: render everything including schedule in original position
  return (
    <div className="space-y-12">
      <ProgramOverviewSection program={program} />
      <WhyShortcutSection />
      <ParticipantBenefitsSection />
      <ProgramScheduleSection program={program} />
      <AdditionalResourcesSection />
      <CostBreakdownSection program={program} data={data} />
    </div>
  );
};
