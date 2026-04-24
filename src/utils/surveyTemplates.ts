import type { SurveyQuestion } from '../types/survey';

export interface SurveyTemplate {
  id: string;
  label: string;
  description: string;
  serviceTypes: string[];
  title: string;
  introMessage: string;
  thankYouMessage: string;
  questions: SurveyQuestion[];
}

const genId = () => Math.random().toString(36).slice(2, 10);

export const SURVEY_TEMPLATES: SurveyTemplate[] = [
  {
    id: 'hair-event-preservice',
    label: 'Hair Event — Pre-Service Intake',
    description: "Help stylists prep for a hair activation — service interest, hair type, length, sensitivities.",
    serviceTypes: ['hair', 'hair-beauty', 'blowout', 'grooming'],
    title: 'Pre-Event Hair Survey',
    introMessage:
      "We're looking forward to having you at the upcoming hair event! To help our Hair Pros prepare and make your experience as smooth as possible, please take a minute to complete the short survey below.",
    thankYouMessage:
      "Thanks for sharing this. Your responses go to your team lead and our Shortcut pros so we can tailor the experience for you. See you at the event.",
    questions: [
      {
        id: genId(),
        type: 'single_choice',
        prompt: 'What service are you most interested in?',
        required: true,
        options: [
          'Blowout / Styling',
          'Haircut / Trim',
          'Beard Trim / Grooming',
          'Curly / Textured Hair Service',
          'Not sure — would like a consultation',
        ],
      },
      {
        id: genId(),
        type: 'single_choice',
        prompt: 'What is your hair type?',
        required: true,
        options: ['Straight', 'Wavy', 'Curly', 'Coily / Textured'],
      },
      {
        id: genId(),
        type: 'single_choice',
        prompt: 'What is your hair length?',
        required: true,
        options: ['Short', 'Medium', 'Long'],
      },
      {
        id: genId(),
        type: 'open_text',
        prompt: 'Do you have any product preferences or sensitivities?',
        helpText: 'e.g., fragrance-free, specific brands, avoid certain ingredients.',
      },
      {
        id: genId(),
        type: 'yes_no',
        prompt: 'Would you like a consultation before your service?',
        required: true,
      },
      {
        id: genId(),
        type: 'open_text',
        prompt: 'Are there any scalp sensitivities, allergies, or considerations we should be aware of?',
      },
      {
        id: genId(),
        type: 'open_text',
        prompt: "Anything else you'd like your stylist to know ahead of time?",
      },
    ],
  },
];

export function getTemplateById(id: string): SurveyTemplate | undefined {
  return SURVEY_TEMPLATES.find(t => t.id === id);
}

export function cloneTemplateQuestions(template: SurveyTemplate): SurveyQuestion[] {
  return template.questions.map(q => ({
    ...q,
    id: genId(),
    options: q.options ? [...q.options] : undefined,
  }));
}

export function newBlankQuestion(type: SurveyQuestion['type'] = 'single_choice'): SurveyQuestion {
  return {
    id: genId(),
    type,
    prompt: '',
    required: false,
    options: type === 'single_choice' || type === 'multi_choice' ? ['', ''] : undefined,
  };
}
