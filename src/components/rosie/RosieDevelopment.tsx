import React, { useMemo, useState } from 'react';
import { BabyProfile, DevelopmentalInfo } from './types';
import { getLeapStatus, LeapStatus, leaps, LeapInfo } from './leapData';
import {
  getParentWellnessForWeek,
  getQuickWinsForWeek,
  expertInsights,
  QuickWin,
  ParentWellnessContent
} from './expertInsights';

interface RosieDevelopmentProps {
  baby: BabyProfile;
  developmentalInfo: DevelopmentalInfo;
}

export const RosieDevelopment: React.FC<RosieDevelopmentProps> = ({ baby, developmentalInfo }) => {
  const {
    weekNumber,
    ageInWeeks,
    milestones,
    whatToExpect,
    commonConcerns,
    sleepInfo,
    feedingInfo,
    upcomingChanges,
  } = developmentalInfo;

  // Leap browser state
  const [showLeapBrowser, setShowLeapBrowser] = useState(false);
  const [selectedLeap, setSelectedLeap] = useState<LeapInfo | null>(null);

  // Get leap status
  const leapStatus: LeapStatus = useMemo(() => getLeapStatus(ageInWeeks), [ageInWeeks]);

  // Helper to get leap status for any leap
  const getLeapStatusLabel = (leap: LeapInfo): { label: string; className: string } => {
    if (ageInWeeks < leap.startWeek) {
      return { label: 'Upcoming', className: 'upcoming' };
    } else if (ageInWeeks >= leap.startWeek && ageInWeeks <= leap.endWeek) {
      return { label: 'Current', className: 'current' };
    } else {
      return { label: 'Completed', className: 'completed' };
    }
  };

  // Format weeks to months display
  const formatWeeksToAge = (weeks: number): string => {
    if (weeks < 4) return `${weeks} weeks`;
    const months = Math.floor(weeks / 4.33);
    if (months < 1) return `${weeks} weeks`;
    if (months === 1) return '~1 month';
    return `~${months} months`;
  };

  // Get parent wellness content
  const wellnessContent: ParentWellnessContent | null = useMemo(
    () => getParentWellnessForWeek(weekNumber),
    [weekNumber]
  );

  // Get quick wins
  const quickWins: QuickWin[] = useMemo(
    () => getQuickWinsForWeek(weekNumber),
    [weekNumber]
  );

  // Get a relevant expert insight for this week
  const getWeeklyInsight = () => {
    // Rotate through topics based on week
    const topics = ['sleep', 'feeding', 'behavior', 'development'] as const;
    const topicIndex = weekNumber % topics.length;
    const topic = topics[topicIndex];
    const insights = expertInsights[topic];
    if (!insights || insights.length === 0) return null;
    return insights[weekNumber % insights.length];
  };

  const weeklyInsight = useMemo(() => getWeeklyInsight(), [weekNumber]);

  // Generate a summary intro based on the week and leap status
  const getWeekIntro = (): string => {
    if (leapStatus.isInLeap && leapStatus.currentLeap) {
      if (leapStatus.leapPhase === 'peak') {
        return `${baby.name} is in the peak of Leap ${leapStatus.currentLeap.leapNumber}. Extra fussiness is completely normal right now. This will pass.`;
      } else if (leapStatus.leapPhase === 'starting') {
        return `${baby.name} may be entering Leap ${leapStatus.currentLeap.leapNumber}. Watch for extra clinginess or fussiness in the coming days.`;
      } else {
        return `${baby.name} is working through Leap ${leapStatus.currentLeap.leapNumber}. The hard part is almost over, and amazing new skills are emerging.`;
      }
    }

    if (leapStatus.isSunnyPeriod) {
      return `${baby.name} is in a "sunny" period between leaps! Enjoy this calmer time - they're consolidating new skills.`;
    }

    // Default intros by week range
    if (weekNumber <= 2) {
      return `${baby.name} is in the "newborn cocoon" phase. Focus on feeding, bonding, and rest. Everything else can wait.`;
    } else if (weekNumber <= 4) {
      return `${baby.name} is becoming more alert and may start showing social smiles soon. You're doing great.`;
    } else if (weekNumber <= 6) {
      return `This can be a challenging time with peak fussiness. Remember: this phase is temporary. You've got this.`;
    } else if (weekNumber <= 8) {
      return `${baby.name} is becoming more interactive and engaged. The hardest newborn weeks are behind you.`;
    } else if (weekNumber <= 12) {
      return `${baby.name} is approaching the end of the "fourth trimester." Patterns are emerging and things are getting easier.`;
    } else if (weekNumber <= 16) {
      return `${baby.name} may be going through a sleep regression as their brain matures. This is progress, not a setback.`;
    } else if (weekNumber <= 26) {
      return `${baby.name} is becoming more active and curious about the world. Solid foods may be on the horizon.`;
    } else if (weekNumber <= 39) {
      return `${baby.name} is likely on the move! Baby-proofing is your friend. This is such a fun age.`;
    } else {
      return `${baby.name} is approaching their first birthday! What an incredible journey you've been on together.`;
    }
  };

  // Get leap phase display
  const getLeapPhaseDisplay = (): { label: string; color: string } => {
    switch (leapStatus.leapPhase) {
      case 'starting':
        return { label: 'Leap Starting', color: 'var(--rosie-orange)' };
      case 'peak':
        return { label: 'Peak Fussiness', color: 'var(--rosie-red)' };
      case 'ending':
        return { label: 'Leap Ending', color: 'var(--rosie-green)' };
      case 'sunny':
        return { label: 'Sunny Period', color: 'var(--rosie-blue)' };
      default:
        return { label: '', color: '' };
    }
  };

  const leapPhaseDisplay = getLeapPhaseDisplay();

  return (
    <div className="rosie-development">
      {/* Week Overview Card */}
      <div className="rosie-card rosie-card-week-overview">
        <div className="rosie-dev-week-header">
          <div className="rosie-dev-week">Week {weekNumber}</div>
          {leapPhaseDisplay.label && (
            <div
              className="rosie-leap-badge"
              style={{ backgroundColor: leapPhaseDisplay.color }}
            >
              {leapPhaseDisplay.label}
            </div>
          )}
        </div>
        <h2 className="rosie-dev-title">What to Know This Week</h2>
        <p className="rosie-dev-intro">{getWeekIntro()}</p>
      </div>

      {/* Leap Card - Show if in leap or approaching one */}
      {(leapStatus.isInLeap && leapStatus.currentLeap) && (
        <div className="rosie-card rosie-card-leap">
          <div className="rosie-leap-header">
            <div className="rosie-leap-icon">🧠</div>
            <div className="rosie-leap-title-section">
              <h3 className="rosie-leap-title">Leap {leapStatus.currentLeap.leapNumber}: {leapStatus.currentLeap.name}</h3>
              <p className="rosie-leap-subtitle">{leapStatus.currentLeap.subtitle}</p>
            </div>
          </div>

          {/* Week range info */}
          <div className="rosie-leap-week-range">
            <span className="rosie-leap-week-label">Weeks {leapStatus.currentLeap.startWeek}–{leapStatus.currentLeap.endWeek}</span>
            <span className="rosie-leap-week-age">({formatWeeksToAge(leapStatus.currentLeap.startWeek)} – {formatWeeksToAge(leapStatus.currentLeap.endWeek)})</span>
          </div>

          <p className="rosie-leap-description">{leapStatus.currentLeap.description}</p>

          {/* Progress bar */}
          <div className="rosie-leap-progress-section">
            <div className="rosie-leap-progress-label">
              <span>Progress through this leap</span>
              <span>{leapStatus.progressThroughLeap}%</span>
            </div>
            <div className="rosie-leap-progress-bar">
              <div
                className="rosie-leap-progress-fill"
                style={{ width: `${leapStatus.progressThroughLeap}%` }}
              />
            </div>
          </div>

          <div className="rosie-leap-section">
            <h4 className="rosie-leap-section-title">Signs You Might Notice</h4>
            <ul className="rosie-dev-list">
              {leapStatus.currentLeap.signsOfLeap.map((sign, i) => (
                <li key={i}>{sign}</li>
              ))}
            </ul>
          </div>

          <div className="rosie-leap-section">
            <h4 className="rosie-leap-section-title">How to Help</h4>
            <ul className="rosie-dev-list">
              {leapStatus.currentLeap.howToHelp.map((tip, i) => (
                <li key={i}>{tip}</li>
              ))}
            </ul>
          </div>

          <div className="rosie-leap-section rosie-leap-after">
            <h4 className="rosie-leap-section-title">New Skills Emerging</h4>
            <ul className="rosie-dev-list">
              {leapStatus.currentLeap.newSkillsAfter.map((skill, i) => (
                <li key={i}>{skill}</li>
              ))}
            </ul>
          </div>

          {/* Browse all leaps button */}
          <div className="rosie-leap-browse-section">
            <button
              className="rosie-leap-browse-btn"
              onClick={() => setShowLeapBrowser(true)}
            >
              View All 10 Leaps
            </button>
          </div>
        </div>
      )}

      {/* Next Leap Preview - Show if in sunny period */}
      {leapStatus.isSunnyPeriod && leapStatus.nextLeap && leapStatus.daysUntilNextLeap && (
        <div className="rosie-card rosie-card-next-leap">
          <div className="rosie-next-leap-header">
            <span className="rosie-next-leap-icon">☀️</span>
            <span className="rosie-next-leap-label">Sunny Period</span>
          </div>
          <p className="rosie-next-leap-text">
            Enjoy this calmer time! Next leap (Leap {leapStatus.nextLeap.leapNumber}: {leapStatus.nextLeap.name})
            starts in about {leapStatus.daysUntilNextLeap} days around week {leapStatus.nextLeap.startWeek}.
          </p>
          <button
            className="rosie-leap-browse-btn rosie-leap-browse-btn-secondary"
            onClick={() => setShowLeapBrowser(true)}
          >
            View All 10 Leaps
          </button>
        </div>
      )}

      {/* Show leap browser even when not in a leap */}
      {!leapStatus.isInLeap && !leapStatus.isSunnyPeriod && (
        <div className="rosie-card rosie-card-leap-overview">
          <div className="rosie-leap-overview-header">
            <span className="rosie-leap-overview-icon">🧠</span>
            <div>
              <h3 className="rosie-leap-overview-title">Wonder Weeks</h3>
              <p className="rosie-leap-overview-subtitle">Developmental leaps in the first 20 months</p>
            </div>
          </div>
          <p className="rosie-leap-overview-text">
            Babies go through 10 major mental "leaps" that can cause temporary fussiness followed by new skills.
          </p>
          <button
            className="rosie-leap-browse-btn"
            onClick={() => setShowLeapBrowser(true)}
          >
            Explore All 10 Leaps
          </button>
        </div>
      )}

      {/* For You (Parent) Card */}
      {wellnessContent && (
        <div className="rosie-card rosie-card-parent">
          <div className="rosie-dev-section">
            <h3 className="rosie-dev-section-title rosie-parent-title">
              <span>💚</span> For You (Not Just Baby)
            </h3>

            <div className="rosie-parent-feeling">
              <h4 className="rosie-parent-subtitle">How you might be feeling</h4>
              <ul className="rosie-dev-list">
                {wellnessContent.howYouMightFeel.map((feeling, i) => (
                  <li key={i}>{feeling}</li>
                ))}
              </ul>
            </div>

            <div className="rosie-permission-slip">
              <div className="rosie-permission-icon">✨</div>
              <p className="rosie-permission-text">{wellnessContent.permissionSlip}</p>
            </div>

            <div className="rosie-one-thing">
              <h4 className="rosie-parent-subtitle">One thing for today</h4>
              <p className="rosie-one-thing-text">{wellnessContent.oneThingToday}</p>
            </div>
          </div>
        </div>
      )}

      {/* Today's Quick Wins */}
      {quickWins.length > 0 && (
        <div className="rosie-card rosie-card-quickwins">
          <div className="rosie-dev-section">
            <h3 className="rosie-dev-section-title">
              <span>🎯</span> Today's Quick Wins
            </h3>
            <p className="rosie-quickwins-intro">Simple activities for {baby.name}'s development (no pressure!)</p>
            <div className="rosie-quickwins-grid">
              {quickWins.map((win, i) => (
                <div key={i} className="rosie-quickwin-item">
                  <div className="rosie-quickwin-activity">{win.activity}</div>
                  <div className="rosie-quickwin-meta">
                    <span className="rosie-quickwin-duration">{win.duration}</span>
                    <span className="rosie-quickwin-benefit">{win.benefit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* What the Research Says */}
      {weeklyInsight && (
        <div className="rosie-card rosie-card-research">
          <div className="rosie-dev-section">
            <h3 className="rosie-dev-section-title rosie-research-title">
              <span>📚</span> What the Research Says
            </h3>
            <div className="rosie-research-content">
              <p className="rosie-research-insight">{weeklyInsight.insight}</p>
              <p className="rosie-research-source">
                — {weeklyInsight.source}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* What's Normal */}
      <div className="rosie-card">
        <div className="rosie-dev-section">
          <h3 className="rosie-dev-section-title">
            <span>✓</span> What's Normal Right Now
          </h3>
          <ul className="rosie-dev-list">
            {whatToExpect.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Milestones */}
      {milestones.length > 0 && (
        <div className="rosie-card">
          <div className="rosie-dev-section">
            <h3 className="rosie-dev-section-title">
              <span>⭐</span> Developmental Milestones
            </h3>
            <p className="rosie-milestone-disclaimer">
              Remember: Milestone ranges are wide. "Late" often catches up completely.
            </p>
            <ul className="rosie-dev-list">
              {milestones.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Sleep Info */}
      <div className="rosie-card">
        <div className="rosie-dev-section">
          <h3 className="rosie-dev-section-title">
            <span>💤</span> Sleep at Week {weekNumber}
          </h3>
          <div className="rosie-dev-sleep-grid">
            <div className="rosie-dev-sleep-item">
              <div className="rosie-dev-sleep-label">Total Sleep</div>
              <div className="rosie-dev-sleep-value">{sleepInfo.totalSleep}</div>
            </div>
            <div className="rosie-dev-sleep-item">
              <div className="rosie-dev-sleep-label">Night Sleep</div>
              <div className="rosie-dev-sleep-value">{sleepInfo.nightSleep}</div>
            </div>
            <div className="rosie-dev-sleep-item">
              <div className="rosie-dev-sleep-label">Naps</div>
              <div className="rosie-dev-sleep-value">{sleepInfo.napCount}</div>
            </div>
            <div className="rosie-dev-sleep-item">
              <div className="rosie-dev-sleep-label">Wake Window</div>
              <div className="rosie-dev-sleep-value">{sleepInfo.wakeWindow}</div>
            </div>
          </div>
          <div className="rosie-dev-tip">
            <strong>Remember:</strong> These are averages, not targets. Watch {baby.name} for sleepy cues like yawning, eye rubbing, or fussiness.
          </div>
        </div>
      </div>

      {/* Feeding Info */}
      <div className="rosie-card">
        <div className="rosie-dev-section">
          <h3 className="rosie-dev-section-title">
            <span>🍼</span> Feeding at Week {weekNumber}
          </h3>
          <div className="rosie-dev-sleep-grid">
            <div className="rosie-dev-sleep-item">
              <div className="rosie-dev-sleep-label">Frequency</div>
              <div className="rosie-dev-sleep-value">{feedingInfo.frequency}</div>
            </div>
            {feedingInfo.amount && (
              <div className="rosie-dev-sleep-item">
                <div className="rosie-dev-sleep-label">Amount</div>
                <div className="rosie-dev-sleep-value">{feedingInfo.amount}</div>
              </div>
            )}
          </div>
          {feedingInfo.notes.length > 0 && (
            <ul className="rosie-dev-list" style={{ marginTop: '12px' }}>
              {feedingInfo.notes.map((note, index) => (
                <li key={index}>{note}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Common Concerns - Reframed */}
      {commonConcerns.length > 0 && (
        <div className="rosie-card">
          <div className="rosie-dev-section">
            <h3 className="rosie-dev-section-title">
              <span>💭</span> Things That Seem Worrying (But Usually Aren't)
            </h3>
            <ul className="rosie-dev-list">
              {commonConcerns.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Coming Up */}
      {upcomingChanges.length > 0 && (
        <div className="rosie-card rosie-card-upcoming">
          <div className="rosie-dev-section">
            <h3 className="rosie-dev-section-title rosie-dev-upcoming-title">
              <span>✨</span> What's Coming Up
            </h3>
            <ul className="rosie-dev-list rosie-dev-upcoming-list">
              {upcomingChanges.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Self-care reminder at bottom */}
      {wellnessContent && (
        <div className="rosie-self-care-footer">
          <p>{wellnessContent.selfCareReminder}</p>
        </div>
      )}

      {/* Leap Browser Modal */}
      {showLeapBrowser && (
        <div className="rosie-modal-overlay" onClick={() => { setShowLeapBrowser(false); setSelectedLeap(null); }}>
          <div className="rosie-modal rosie-modal-leap-browser" onClick={e => e.stopPropagation()}>
            <div className="rosie-modal-header">
              <h2 className="rosie-modal-title">
                {selectedLeap ? `Leap ${selectedLeap.leapNumber}` : 'The 10 Wonder Weeks Leaps'}
              </h2>
              <button
                className="rosie-modal-close"
                onClick={() => { setShowLeapBrowser(false); setSelectedLeap(null); }}
              >
                ×
              </button>
            </div>

            <div className="rosie-modal-content">
              {!selectedLeap ? (
                // Leap list view
                <>
                  <p className="rosie-leap-browser-intro">
                    Based on "The Wonder Weeks" by Hetty van de Rijt & Frans Plooij.
                    Each leap represents a major shift in how your baby perceives the world.
                  </p>

                  {/* Timeline visualization */}
                  <div className="rosie-leap-timeline">
                    <div className="rosie-leap-timeline-track">
                      <div
                        className="rosie-leap-timeline-progress"
                        style={{ width: `${Math.min(100, (ageInWeeks / 76) * 100)}%` }}
                      />
                      <div
                        className="rosie-leap-timeline-marker"
                        style={{ left: `${Math.min(100, (ageInWeeks / 76) * 100)}%` }}
                      >
                        <span>Week {weekNumber}</span>
                      </div>
                    </div>
                    <div className="rosie-leap-timeline-labels">
                      <span>Birth</span>
                      <span>~20 months</span>
                    </div>
                  </div>

                  <div className="rosie-leap-list">
                    {leaps.map((leap) => {
                      const status = getLeapStatusLabel(leap);
                      return (
                        <button
                          key={leap.leapNumber}
                          className={`rosie-leap-list-item ${status.className}`}
                          onClick={() => setSelectedLeap(leap)}
                        >
                          <div className="rosie-leap-list-number">
                            {status.className === 'completed' ? '✓' : leap.leapNumber}
                          </div>
                          <div className="rosie-leap-list-info">
                            <h4 className="rosie-leap-list-name">{leap.name}</h4>
                            <p className="rosie-leap-list-weeks">
                              Weeks {leap.startWeek}–{leap.endWeek} ({formatWeeksToAge(leap.startWeek)} – {formatWeeksToAge(leap.endWeek)})
                            </p>
                          </div>
                          <div className={`rosie-leap-list-status ${status.className}`}>
                            {status.label}
                          </div>
                          <div className="rosie-leap-list-arrow">›</div>
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                // Selected leap detail view
                <>
                  <button
                    className="rosie-leap-back-btn"
                    onClick={() => setSelectedLeap(null)}
                  >
                    ← Back to all leaps
                  </button>

                  <div className="rosie-leap-detail">
                    <div className="rosie-leap-detail-header">
                      <div className="rosie-leap-detail-icon">🧠</div>
                      <div>
                        <h3 className="rosie-leap-detail-title">{selectedLeap.name}</h3>
                        <p className="rosie-leap-detail-subtitle">{selectedLeap.subtitle}</p>
                      </div>
                    </div>

                    <div className="rosie-leap-detail-meta">
                      <div className="rosie-leap-detail-meta-item">
                        <span className="rosie-leap-detail-meta-label">When</span>
                        <span className="rosie-leap-detail-meta-value">
                          Weeks {selectedLeap.startWeek}–{selectedLeap.endWeek}
                        </span>
                      </div>
                      <div className="rosie-leap-detail-meta-item">
                        <span className="rosie-leap-detail-meta-label">Age</span>
                        <span className="rosie-leap-detail-meta-value">
                          {formatWeeksToAge(selectedLeap.startWeek)} – {formatWeeksToAge(selectedLeap.endWeek)}
                        </span>
                      </div>
                      <div className="rosie-leap-detail-meta-item">
                        <span className="rosie-leap-detail-meta-label">Peak</span>
                        <span className="rosie-leap-detail-meta-value">
                          Week {selectedLeap.peakWeek}
                        </span>
                      </div>
                    </div>

                    <p className="rosie-leap-detail-description">{selectedLeap.description}</p>

                    <div className="rosie-leap-detail-section">
                      <h4>What Baby Is Learning</h4>
                      <ul>
                        {selectedLeap.whatBabyLearns.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="rosie-leap-detail-section">
                      <h4>Signs You Might Notice</h4>
                      <ul>
                        {selectedLeap.signsOfLeap.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="rosie-leap-detail-section">
                      <h4>How to Help</h4>
                      <ul>
                        {selectedLeap.howToHelp.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="rosie-leap-detail-section rosie-leap-detail-skills">
                      <h4>New Skills After This Leap</h4>
                      <ul>
                        {selectedLeap.newSkillsAfter.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Navigation between leaps */}
                  <div className="rosie-leap-nav">
                    {selectedLeap.leapNumber > 1 && (
                      <button
                        className="rosie-leap-nav-btn"
                        onClick={() => setSelectedLeap(leaps[selectedLeap.leapNumber - 2])}
                      >
                        ← Leap {selectedLeap.leapNumber - 1}
                      </button>
                    )}
                    {selectedLeap.leapNumber < 10 && (
                      <button
                        className="rosie-leap-nav-btn rosie-leap-nav-btn-next"
                        onClick={() => setSelectedLeap(leaps[selectedLeap.leapNumber])}
                      >
                        Leap {selectedLeap.leapNumber + 1} →
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RosieDevelopment;
