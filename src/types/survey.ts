export type SurveyQuestionType =
  | 'single_choice'
  | 'multi_choice'
  | 'open_text'
  | 'yes_no';

export interface SurveyQuestion {
  id: string;
  type: SurveyQuestionType;
  prompt: string;
  helpText?: string;
  required?: boolean;
  options?: string[];
}

export type SurveyFieldMode = 'off' | 'optional' | 'required';

export interface SurveyData {
  title: string;
  description?: string;
  introMessage?: string;
  thankYouMessage?: string;
  nameField?: SurveyFieldMode;
  emailField?: SurveyFieldMode;
  questions: SurveyQuestion[];
  proposalId?: string;
  partnerName?: string;
  partnerLogoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SurveyCustomization {
  accentColor?: string;
}

export interface Survey {
  id: string;
  createdAt: string;
  updatedAt: string;
  userId?: string;
  proposalId?: string;
  data: SurveyData;
  customization: SurveyCustomization;
  isEditable: boolean;
  status: 'draft' | 'published' | 'archived';
  uniqueToken?: string;
  customUrl?: string;
  resultsToken?: string;
  resultsPassword?: string;
}

export interface SurveyOptions {
  title: string;
  description?: string;
  introMessage?: string;
  thankYouMessage?: string;
  nameField?: SurveyFieldMode;
  emailField?: SurveyFieldMode;
  questions: SurveyQuestion[];
  proposalId?: string;
  partnerName?: string;
  partnerLogoUrl?: string;
  customization?: SurveyCustomization;
  status?: 'draft' | 'published' | 'archived';
  resultsPassword?: string;
}

export type SurveyAnswer = string | string[];

export interface SurveyResponse {
  id: string;
  createdAt: string;
  surveyId: string;
  respondentName?: string;
  respondentEmail?: string;
  answers: Record<string, SurveyAnswer>;
}
