import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSurvey } from '../contexts/SurveyContext';
import type { Survey, SurveyAnswer, SurveyFieldMode, SurveyQuestion } from '../types/survey';
import { LoadingSpinner } from './LoadingSpinner';
import { Button } from './Button';
import { CheckCircle } from 'lucide-react';

const SurveyDisplay: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { getSurvey, submitResponse } = useSurvey();

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [respondentName, setRespondentName] = useState('');
  const [respondentEmail, setRespondentEmail] = useState('');
  const [answers, setAnswers] = useState<Record<string, SurveyAnswer>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) return;
      setLoading(true);
      try {
        const s = await getSurvey(id);
        if (cancelled) return;
        if (!s) {
          setLoadError('Survey not found');
        } else if (s.status !== 'published') {
          setLoadError('This survey is not currently accepting responses.');
        } else {
          setSurvey(s);
          document.title = s.data.title ? `${s.data.title} · Shortcut` : 'Survey · Shortcut';
        }
      } catch {
        if (!cancelled) setLoadError('Unable to load survey.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const setAnswer = (qid: string, value: SurveyAnswer) => {
    setAnswers(prev => ({ ...prev, [qid]: value }));
    if (errors[qid]) setErrors(prev => ({ ...prev, [qid]: '' }));
  };

  const toggleMulti = (qid: string, option: string) => {
    setAnswers(prev => {
      const current = Array.isArray(prev[qid]) ? (prev[qid] as string[]) : [];
      const next = current.includes(option)
        ? current.filter(v => v !== option)
        : [...current, option];
      return { ...prev, [qid]: next };
    });
    if (errors[qid]) setErrors(prev => ({ ...prev, [qid]: '' }));
  };

  const nameMode: SurveyFieldMode = survey?.data.nameField ?? 'required';
  const emailMode: SurveyFieldMode = survey?.data.emailField ?? 'required';

  const validate = (): boolean => {
    if (!survey) return false;
    const newErrors: Record<string, string> = {};

    if (nameMode === 'required' && !respondentName.trim()) {
      newErrors.name = 'Please enter your name';
    }
    if (emailMode === 'required' && !respondentEmail.trim()) {
      newErrors.email = 'Please enter your email';
    } else if (
      emailMode !== 'off' &&
      respondentEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(respondentEmail)
    ) {
      newErrors.email = 'Please enter a valid email';
    }

    survey.data.questions.forEach(q => {
      if (!q.required) return;
      const val = answers[q.id];
      if (q.type === 'multi_choice') {
        if (!Array.isArray(val) || val.length === 0) newErrors[q.id] = 'Please select at least one option';
      } else if (!val || (typeof val === 'string' && !val.trim())) {
        newErrors[q.id] = 'This question is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!survey) return;
    if (!validate()) return;

    try {
      setSubmitting(true);
      await submitResponse(survey.id, answers, {
        name: respondentName,
        email: respondentEmail,
      });
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to submit — please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (loadError || !survey) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-extrabold text-shortcut-navy-blue mb-3">
            Survey unavailable
          </h1>
          <p className="text-shortcut-navy-blue opacity-60">
            {loadError || 'This survey could not be loaded.'}
          </p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
        <div className="max-w-lg w-full bg-white rounded-2xl shadow-sm p-8 lg:p-12 text-center">
          <div className="flex items-center justify-center gap-6 mb-6 flex-wrap">
            <img
              src="/shortcut-logo-blue.svg"
              alt="Shortcut"
              className="h-7 w-auto object-contain"
            />
            {survey.data.partnerLogoUrl && (
              <>
                <span className="text-shortcut-navy-blue opacity-30 text-lg">+</span>
                <img
                  src={survey.data.partnerLogoUrl}
                  alt={survey.data.partnerName || 'Partner logo'}
                  className="h-8 w-auto object-contain"
                />
              </>
            )}
          </div>
          <CheckCircle className="w-14 h-14 mx-auto text-green-600 mb-4" />
          <h1 className="text-2xl lg:text-3xl font-extrabold text-shortcut-navy-blue mb-3">
            Thanks for submitting!
          </h1>
          <p className="text-shortcut-navy-blue opacity-70 text-base leading-relaxed whitespace-pre-line">
            {survey.data.thankYouMessage ||
              "Your responses go to your team lead and our Shortcut pros so we can tailor the experience and deliver the best possible session for you."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm p-6 sm:p-10">
        {/* Header — Shortcut logo left, partner logo right */}
        <div className="mb-8">
          <div className="flex items-center justify-between gap-4 mb-6 pb-6 border-b border-gray-200">
            <img
              src="/shortcut-logo-blue.svg"
              alt="Shortcut"
              className="h-7 w-auto object-contain flex-shrink-0"
            />
            {survey.data.partnerLogoUrl && (
              <img
                src={survey.data.partnerLogoUrl}
                alt={survey.data.partnerName || 'Partner logo'}
                className="h-8 w-auto object-contain flex-shrink-0"
              />
            )}
          </div>
          <h1 className="text-3xl lg:text-4xl font-extrabold text-shortcut-navy-blue mb-4">
            {survey.data.title}
          </h1>
          {survey.data.introMessage && (
            <p className="text-shortcut-navy-blue opacity-80 text-base leading-relaxed whitespace-pre-line">
              {survey.data.introMessage}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Respondent info */}
          {(nameMode !== 'off' || emailMode !== 'off') && (
            <div className="space-y-5 pb-6 border-b border-gray-200">
              {nameMode !== 'off' && (
                <div>
                  <label className="block text-sm font-bold text-shortcut-navy-blue mb-2">
                    Your name{nameMode === 'required' ? ' *' : <span className="font-medium opacity-50"> (optional)</span>}
                  </label>
                  <input
                    type="text"
                    value={respondentName}
                    onChange={e => {
                      setRespondentName(e.target.value);
                      if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
                    }}
                    className={`w-full px-4 py-3 text-base font-medium border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal transition-all ${
                      errors.name ? 'border-accent-coral' : 'border-gray-300'
                    }`}
                    placeholder="Jane Smith"
                  />
                  {errors.name && (
                    <p className="text-accent-coral text-sm font-medium mt-2">{errors.name}</p>
                  )}
                </div>
              )}
              {emailMode !== 'off' && (
                <div>
                  <label className="block text-sm font-bold text-shortcut-navy-blue mb-2">
                    Your email{emailMode === 'required' ? ' *' : <span className="font-medium opacity-50"> (optional)</span>}
                  </label>
                  <input
                    type="email"
                    value={respondentEmail}
                    onChange={e => {
                      setRespondentEmail(e.target.value);
                      if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
                    }}
                    className={`w-full px-4 py-3 text-base font-medium border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal transition-all ${
                      errors.email ? 'border-accent-coral' : 'border-gray-300'
                    }`}
                    placeholder="jane@example.com"
                  />
                  {errors.email && (
                    <p className="text-accent-coral text-sm font-medium mt-2">{errors.email}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Questions */}
          {survey.data.questions.map((q, idx) => (
            <QuestionField
              key={q.id}
              question={q}
              number={idx + 1}
              value={answers[q.id]}
              error={errors[q.id]}
              onChange={v => setAnswer(q.id, v)}
              onToggleMulti={opt => toggleMulti(q.id, opt)}
            />
          ))}

          <div className="pt-4 flex justify-end">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Survey'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface QuestionFieldProps {
  question: SurveyQuestion;
  number: number;
  value: SurveyAnswer | undefined;
  error?: string;
  onChange: (value: SurveyAnswer) => void;
  onToggleMulti: (option: string) => void;
}

const QuestionField: React.FC<QuestionFieldProps> = ({
  question,
  number,
  value,
  error,
  onChange,
  onToggleMulti,
}) => {
  return (
    <div>
      <label className="block text-base font-bold text-shortcut-navy-blue mb-2">
        {number}. {question.prompt}
        {question.required && <span className="text-accent-coral ml-1">*</span>}
      </label>
      {question.helpText && (
        <p className="text-sm text-shortcut-navy-blue opacity-60 mb-3">{question.helpText}</p>
      )}

      {question.type === 'single_choice' && (
        <div className="space-y-2">
          {(question.options || []).map((opt, i) => (
            <label
              key={i}
              className={`flex items-center gap-3 px-4 py-3 border-2 rounded-lg cursor-pointer transition-colors ${
                value === opt
                  ? 'border-shortcut-teal bg-shortcut-teal/5'
                  : 'border-gray-300 hover:border-shortcut-teal/50'
              }`}
            >
              <input
                type="radio"
                name={question.id}
                value={opt}
                checked={value === opt}
                onChange={() => onChange(opt)}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium text-shortcut-navy-blue">{opt}</span>
            </label>
          ))}
        </div>
      )}

      {question.type === 'multi_choice' && (
        <div className="space-y-2">
          {(question.options || []).map((opt, i) => {
            const selected = Array.isArray(value) && value.includes(opt);
            return (
              <label
                key={i}
                className={`flex items-center gap-3 px-4 py-3 border-2 rounded-lg cursor-pointer transition-colors ${
                  selected
                    ? 'border-shortcut-teal bg-shortcut-teal/5'
                    : 'border-gray-300 hover:border-shortcut-teal/50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => onToggleMulti(opt)}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium text-shortcut-navy-blue">{opt}</span>
              </label>
            );
          })}
        </div>
      )}

      {question.type === 'yes_no' && (
        <div className="flex gap-3">
          {['Yes', 'No'].map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={`flex-1 px-4 py-3 border-2 rounded-lg text-sm font-bold transition-colors ${
                value === opt
                  ? 'border-shortcut-teal bg-shortcut-teal/10 text-shortcut-navy-blue'
                  : 'border-gray-300 text-shortcut-navy-blue hover:border-shortcut-teal/50'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {question.type === 'open_text' && (
        <textarea
          value={typeof value === 'string' ? value : ''}
          onChange={e => onChange(e.target.value)}
          rows={3}
          className="w-full px-4 py-3 text-base font-medium border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal transition-all resize-y"
          placeholder="Type your answer here"
        />
      )}

      {error && <p className="text-accent-coral text-sm font-medium mt-2">{error}</p>}
    </div>
  );
};

export default SurveyDisplay;
