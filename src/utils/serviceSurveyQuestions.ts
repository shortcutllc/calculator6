import type { SurveyQuestion } from '../types/survey';

// Per-service pre-event question blocks for the proposal "Event Details" survey.
// These render as sections under the survey, one per service type present in the
// proposal, and their answers are stored in the `responses` JSONB column keyed
// by service type → { [questionId]: answer }.
//
// IMPORTANT: question `id`s are STABLE strings (not random) so saved answers map
// back to the right question on reload and in the admin responses viewer.
//
// Massage is handled directly in ProposalSurveyForm (it has dedicated columns +
// proposal-aware chair/table detection), so it is intentionally NOT a block here.

export interface ServiceSurveyBlock {
  /** Section header shown above the questions. */
  label: string;
  /** Short helper line under the header. */
  blurb?: string;
  /** Service-type slugs (lowercased) this block applies to. */
  serviceTypes: string[];
  questions: SurveyQuestion[];
}

export const SERVICE_SURVEY_BLOCKS: ServiceSurveyBlock[] = [
  {
    label: 'Hair',
    blurb: 'Helps our stylists prep for your team.',
    serviceTypes: ['hair', 'hair-beauty', 'blowout', 'grooming'],
    questions: [
      {
        id: 'hair_service_interest',
        type: 'multi_choice',
        prompt: 'Which hair services is your team interested in?',
        options: [
          'Blowout / Styling',
          'Haircut / Trim',
          'Barber cut / Clipper cut (short hair)',
          'Curly / Textured Hair Service',
          'A mix (would like consultations)',
        ],
      },
    ],
  },
  {
    label: 'Headshots',
    blurb: 'So the photographer can tailor the day.',
    serviceTypes: ['headshot', 'headshots'],
    questions: [
      {
        id: 'headshot_retouching',
        type: 'single_choice',
        prompt: 'Preferred retouching style?',
        options: ['Natural / minimal', 'Standard polish', 'No retouching'],
      },
      {
        id: 'headshot_background',
        type: 'single_choice',
        prompt: 'Background preference?',
        options: ['Neutral / gray', 'White', 'Brand color', 'No preference'],
      },
    ],
  },
  {
    label: 'Nails',
    blurb: 'Helps our techs set up the right stations.',
    serviceTypes: ['nails'],
    questions: [
      {
        id: 'nails_service',
        type: 'multi_choice',
        prompt: 'Which nail services should we plan for?',
        options: [
          'Nail cleanup',
          'Classic manicure',
          'Classic pedicure',
          'Gel manicure',
          'Gel pedicure',
        ],
      },
      {
        id: 'nails_polish',
        type: 'open_text',
        prompt: 'Any specific color preferences or themes?',
      },
    ],
  },
  {
    label: 'Facials',
    blurb: 'So our estheticians can prep products.',
    serviceTypes: ['facial', 'facials'],
    questions: [
      {
        id: 'facial_skin_type',
        type: 'single_choice',
        prompt: 'Most common skin type across your team?',
        options: ['Normal', 'Dry', 'Oily', 'Combination', 'Sensitive', 'A mix'],
      },
      {
        id: 'facial_sensitivities',
        type: 'open_text',
        prompt: 'Any allergies or skin sensitivities we should be aware of?',
      },
    ],
  },
];

/** Normalize a proposal service-type slug for block matching. */
const normalize = (s: string): string => (s || '').toLowerCase().trim();

/**
 * Returns the ordered, de-duplicated set of per-service question blocks for the
 * service types present in a proposal. Massage is excluded (handled inline by
 * the form). Service types with no matching block (mindfulness, sound-bath,
 * yoga, stretch, CLE, …) simply contribute nothing.
 */
export function getServiceSurveyBlocks(serviceTypes: string[]): ServiceSurveyBlock[] {
  const present = new Set(serviceTypes.map(normalize));
  return SERVICE_SURVEY_BLOCKS.filter((block) =>
    block.serviceTypes.some((t) => present.has(normalize(t)))
  );
}

/** Flatten blocks → questionId → prompt, for labelling saved answers. */
export function buildQuestionPromptMap(): Record<string, string> {
  const map: Record<string, string> = {};
  SERVICE_SURVEY_BLOCKS.forEach((b) =>
    b.questions.forEach((q) => {
      map[q.id] = q.prompt;
    })
  );
  return map;
}
