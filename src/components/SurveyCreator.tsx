import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSurvey } from '../contexts/SurveyContext';
import { useProposal } from '../contexts/ProposalContext';
import type { Survey, SurveyFieldMode, SurveyQuestion, SurveyQuestionType } from '../types/survey';
import {
  SURVEY_TEMPLATES,
  cloneTemplateQuestions,
  getTemplateById,
  newBlankQuestion,
} from '../utils/surveyTemplates';
import { Button } from './Button';
import { GripVertical, Plus, Trash2, ChevronUp, ChevronDown, Lock, Eye, EyeOff } from 'lucide-react';

interface SurveyCreatorProps {
  onClose?: () => void;
  editingSurvey?: Survey | null;
}

const QUESTION_TYPE_LABELS: Record<SurveyQuestionType, string> = {
  single_choice: 'Single choice',
  multi_choice: 'Multi choice',
  open_text: 'Open text',
  yes_no: 'Yes / No',
};

const FIELD_MODE_OPTIONS: { value: SurveyFieldMode; label: string }[] = [
  { value: 'off', label: "Don't ask" },
  { value: 'optional', label: 'Optional' },
  { value: 'required', label: 'Required' },
];

const FieldModePicker: React.FC<{
  label: string;
  value: SurveyFieldMode;
  onChange: (v: SurveyFieldMode) => void;
}> = ({ label, value, onChange }) => (
  <div>
    <label className="block text-sm font-bold text-shortcut-navy-blue mb-2">{label}</label>
    <div className="grid grid-cols-3 gap-2">
      {FIELD_MODE_OPTIONS.map(opt => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`px-3 py-2 rounded-lg border-2 text-sm font-bold transition-all ${
              selected
                ? 'border-shortcut-teal bg-shortcut-teal/10 text-shortcut-navy-blue'
                : 'border-gray-300 text-shortcut-navy-blue hover:border-shortcut-teal/50'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  </div>
);

const SurveyCreator: React.FC<SurveyCreatorProps> = ({ onClose, editingSurvey }) => {
  const navigate = useNavigate();
  const { createSurvey, updateSurvey } = useSurvey();
  const { proposals } = useProposal();

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedProposalId, setSelectedProposalId] = useState<string>(
    editingSurvey?.proposalId || editingSurvey?.data.proposalId || ''
  );

  const [form, setForm] = useState({
    title: editingSurvey?.data.title || '',
    description: editingSurvey?.data.description || '',
    introMessage: editingSurvey?.data.introMessage || '',
    thankYouMessage: editingSurvey?.data.thankYouMessage || '',
    partnerName: editingSurvey?.data.partnerName || '',
    partnerLogoUrl: editingSurvey?.data.partnerLogoUrl || '',
    nameField: (editingSurvey?.data.nameField ?? 'required') as SurveyFieldMode,
    emailField: (editingSurvey?.data.emailField ?? 'required') as SurveyFieldMode,
    resultsPassword: editingSurvey?.resultsPassword || '',
    status: editingSurvey?.status || ('published' as 'draft' | 'published' | 'archived'),
  });
  const [showPassword, setShowPassword] = useState(false);

  const [questions, setQuestions] = useState<SurveyQuestion[]>(
    editingSurvey?.data.questions?.length
      ? editingSurvey.data.questions
      : []
  );

  const sortedProposals = useMemo(() => {
    return [...proposals]
      .filter(p => !p.data.clientName?.toLowerCase().includes('test'))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [proposals]);

  useEffect(() => {
    if (editingSurvey) {
      setForm({
        title: editingSurvey.data.title || '',
        description: editingSurvey.data.description || '',
        introMessage: editingSurvey.data.introMessage || '',
        thankYouMessage: editingSurvey.data.thankYouMessage || '',
        partnerName: editingSurvey.data.partnerName || '',
        partnerLogoUrl: editingSurvey.data.partnerLogoUrl || '',
        nameField: (editingSurvey.data.nameField ?? 'required') as SurveyFieldMode,
        emailField: (editingSurvey.data.emailField ?? 'required') as SurveyFieldMode,
        resultsPassword: editingSurvey.resultsPassword || '',
        status: editingSurvey.status,
      });
      setQuestions(editingSurvey.data.questions || []);
      setSelectedProposalId(editingSurvey.proposalId || editingSurvey.data.proposalId || '');
    }
  }, [editingSurvey]);

  const handleFieldChange = (field: keyof typeof form, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field as string]) setErrors(prev => ({ ...prev, [field as string]: '' }));
  };

  const applyTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;
    const template = getTemplateById(templateId);
    if (!template) return;
    setForm(prev => ({
      ...prev,
      title: prev.title || template.title,
      introMessage: template.introMessage,
      thankYouMessage: template.thankYouMessage,
    }));
    setQuestions(cloneTemplateQuestions(template));
  };

  const handleProposalSelect = useCallback(
    (proposalId: string) => {
      setSelectedProposalId(proposalId);
      if (!proposalId) return;
      const proposal = proposals.find(p => p.id === proposalId);
      if (!proposal) return;
      setForm(prev => ({
        ...prev,
        partnerName: prev.partnerName || proposal.data.clientName || '',
        partnerLogoUrl: prev.partnerLogoUrl || proposal.data.clientLogoUrl || '',
      }));
    },
    [proposals]
  );

  const updateQuestion = (index: number, updates: Partial<SurveyQuestion>) => {
    setQuestions(prev => prev.map((q, i) => (i === index ? { ...q, ...updates } : q)));
  };

  const moveQuestion = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= questions.length) return;
    setQuestions(prev => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const removeQuestion = (index: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const addQuestion = () => {
    setQuestions(prev => [...prev, newBlankQuestion('single_choice')]);
  };

  const changeQuestionType = (index: number, type: SurveyQuestionType) => {
    setQuestions(prev =>
      prev.map((q, i) => {
        if (i !== index) return q;
        const needsOptions = type === 'single_choice' || type === 'multi_choice';
        return {
          ...q,
          type,
          options: needsOptions ? q.options && q.options.length > 0 ? q.options : ['', ''] : undefined,
        };
      })
    );
  };

  const updateOption = (qIndex: number, optIndex: number, value: string) => {
    setQuestions(prev =>
      prev.map((q, i) => {
        if (i !== qIndex) return q;
        const opts = [...(q.options || [])];
        opts[optIndex] = value;
        return { ...q, options: opts };
      })
    );
  };

  const addOption = (qIndex: number) => {
    setQuestions(prev =>
      prev.map((q, i) => {
        if (i !== qIndex) return q;
        return { ...q, options: [...(q.options || []), ''] };
      })
    );
  };

  const removeOption = (qIndex: number, optIndex: number) => {
    setQuestions(prev =>
      prev.map((q, i) => {
        if (i !== qIndex) return q;
        const opts = (q.options || []).filter((_, j) => j !== optIndex);
        return { ...q, options: opts };
      })
    );
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.title.trim()) newErrors.title = 'Title is required';
    if (!questions.length) newErrors.questions = 'Add at least one question';
    questions.forEach((q, i) => {
      if (!q.prompt.trim()) newErrors[`q-${i}-prompt`] = 'Question text is required';
      if ((q.type === 'single_choice' || q.type === 'multi_choice')) {
        const filled = (q.options || []).filter(o => o.trim()).length;
        if (filled < 2) newErrors[`q-${i}-options`] = 'Add at least 2 options';
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // Strip out empty option strings on submit
    const cleanedQuestions: SurveyQuestion[] = questions.map(q => ({
      ...q,
      prompt: q.prompt.trim(),
      helpText: q.helpText?.trim() || undefined,
      options:
        q.type === 'single_choice' || q.type === 'multi_choice'
          ? (q.options || []).map(o => o.trim()).filter(Boolean)
          : undefined,
    }));

    try {
      setLoading(true);
      let surveyId: string;

      if (editingSurvey) {
        const nextData = {
          ...editingSurvey.data,
          title: form.title.trim(),
          description: form.description.trim(),
          introMessage: form.introMessage.trim(),
          thankYouMessage: form.thankYouMessage.trim(),
          partnerName: form.partnerName.trim() || undefined,
          partnerLogoUrl: form.partnerLogoUrl.trim() || undefined,
          nameField: form.nameField,
          emailField: form.emailField,
          proposalId: selectedProposalId || undefined,
          questions: cleanedQuestions,
          updatedAt: new Date().toISOString(),
        };
        await updateSurvey(editingSurvey.id, {
          data: nextData,
          status: form.status,
          proposalId: selectedProposalId || undefined,
          resultsPassword: form.resultsPassword,
        });
        surveyId = editingSurvey.id;
      } else {
        surveyId = await createSurvey({
          title: form.title.trim(),
          description: form.description.trim(),
          introMessage: form.introMessage.trim(),
          thankYouMessage: form.thankYouMessage.trim(),
          partnerName: form.partnerName.trim() || undefined,
          partnerLogoUrl: form.partnerLogoUrl.trim() || undefined,
          nameField: form.nameField,
          emailField: form.emailField,
          proposalId: selectedProposalId || undefined,
          questions: cleanedQuestions,
          status: form.status,
          resultsPassword: form.resultsPassword,
        });
      }

      onClose?.();
      navigate(`/survey/${surveyId}`);
    } catch (err) {
      console.error('Error saving survey:', err);
      alert(err instanceof Error ? err.message : 'Failed to save survey');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 lg:p-12 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl lg:text-4xl font-extrabold text-shortcut-navy-blue">
            {editingSurvey ? 'Edit Survey' : 'Create Survey'}
          </h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-shortcut-navy-blue opacity-40 hover:opacity-60 text-3xl leading-none transition-opacity"
            >
              ×
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Template picker */}
          {!editingSurvey && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <h3 className="text-xl lg:text-2xl font-extrabold text-shortcut-navy-blue">
                  Start from a Template
                </h3>
                <span className="text-sm font-medium text-shortcut-navy-blue opacity-40">Optional</span>
              </div>
              <p className="text-shortcut-navy-blue opacity-60 text-sm font-medium">
                Pick a pre-built survey and customize as needed. All fields remain editable.
              </p>
              <select
                value={selectedTemplateId}
                onChange={e => applyTemplate(e.target.value)}
                className="w-full px-4 py-3 text-base font-medium border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal transition-all"
              >
                <option value="">— Start blank —</option>
                {SURVEY_TEMPLATES.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
              {selectedTemplateId && (
                <p className="text-sm text-text-dark-60">
                  {getTemplateById(selectedTemplateId)?.description}
                </p>
              )}
            </div>
          )}

          {/* Proposal link */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <h3 className="text-xl lg:text-2xl font-extrabold text-shortcut-navy-blue">
                Link to Proposal
              </h3>
              <span className="text-sm font-medium text-shortcut-navy-blue opacity-40">Optional</span>
            </div>
            <p className="text-shortcut-navy-blue opacity-60 text-sm font-medium">
              Auto-fills partner name + logo. Links this survey to the proposal for reporting.
            </p>
            <select
              value={selectedProposalId}
              onChange={e => handleProposalSelect(e.target.value)}
              className="w-full px-4 py-3 text-base font-medium border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal transition-all"
            >
              <option value="">— Select a proposal —</option>
              {sortedProposals.map(p => {
                const date = p.createdAt
                  ? new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  : '';
                return (
                  <option key={p.id} value={p.id}>
                    {p.data.clientName || 'Untitled'} — {p.status} — {date}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Survey details */}
          <div className="space-y-6">
            <h3 className="text-xl lg:text-2xl font-extrabold text-shortcut-navy-blue">Survey Details</h3>

            <div>
              <label className="block text-sm font-bold text-shortcut-navy-blue mb-2">Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={e => handleFieldChange('title', e.target.value)}
                className={`w-full px-4 py-3 text-base font-medium border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal transition-all ${
                  errors.title ? 'border-accent-coral' : 'border-gray-300'
                }`}
                placeholder="e.g., Pre-Event Hair Survey"
              />
              {errors.title && (
                <p className="text-accent-coral text-sm font-medium mt-2">{errors.title}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-shortcut-navy-blue mb-2">
                Short description
              </label>
              <input
                type="text"
                value={form.description}
                onChange={e => handleFieldChange('description', e.target.value)}
                className="w-full px-4 py-3 text-base font-medium border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal transition-all"
                placeholder="Internal label — not shown on public page"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-shortcut-navy-blue mb-2">
                Intro message (shown at top of survey)
              </label>
              <textarea
                value={form.introMessage}
                onChange={e => handleFieldChange('introMessage', e.target.value)}
                rows={4}
                className="w-full px-4 py-3 text-base font-medium border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal transition-all resize-y"
                placeholder="A short welcome message that explains the purpose of the survey"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-shortcut-navy-blue mb-2">
                Thank-you message (after submission)
              </label>
              <textarea
                value={form.thankYouMessage}
                onChange={e => handleFieldChange('thankYouMessage', e.target.value)}
                rows={2}
                className="w-full px-4 py-3 text-base font-medium border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal transition-all resize-y"
                placeholder="e.g., Thanks — your team lead and our Shortcut pros will use this to tailor your session."
              />
            </div>

            <div className="space-y-4">
              <FieldModePicker
                label="Respondent name"
                value={form.nameField}
                onChange={v => handleFieldChange('nameField', v)}
              />
              <FieldModePicker
                label="Respondent email"
                value={form.emailField}
                onChange={v => handleFieldChange('emailField', v)}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-shortcut-navy-blue mb-2">Status</label>
              <select
                value={form.status}
                onChange={e => handleFieldChange('status', e.target.value as any)}
                className="w-full px-4 py-3 text-base font-medium border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal transition-all"
              >
                <option value="published">Published — shareable link is live</option>
                <option value="draft">Draft — link not accessible to public</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          {/* Partner info */}
          <div className="space-y-6">
            <h3 className="text-xl lg:text-2xl font-extrabold text-shortcut-navy-blue">
              Partner Branding (Optional)
            </h3>

            <div>
              <label className="block text-sm font-bold text-shortcut-navy-blue mb-2">Partner name</label>
              <input
                type="text"
                value={form.partnerName}
                onChange={e => handleFieldChange('partnerName', e.target.value)}
                className="w-full px-4 py-3 text-base font-medium border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal transition-all"
                placeholder="e.g., Acme Co."
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-shortcut-navy-blue mb-2">
                Partner logo URL
              </label>
              <input
                type="url"
                value={form.partnerLogoUrl}
                onChange={e => handleFieldChange('partnerLogoUrl', e.target.value)}
                className="w-full px-4 py-3 text-base font-medium border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal transition-all"
                placeholder="https://example.com/logo.png"
              />
              {form.partnerLogoUrl && (
                <img
                  src={form.partnerLogoUrl}
                  alt="Partner logo preview"
                  className="mt-3 h-10 w-auto object-contain"
                />
              )}
            </div>
          </div>

          {/* Manager Results Sharing */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <h3 className="text-xl lg:text-2xl font-extrabold text-shortcut-navy-blue flex items-center gap-2">
                <Lock size={20} />
                Manager Results Password
              </h3>
              <span className="text-sm font-medium text-shortcut-navy-blue opacity-40">Optional</span>
            </div>
            <p className="text-shortcut-navy-blue opacity-60 text-sm font-medium">
              Set a password to gate the shared-results link for the client manager. Leave blank for no password — anyone with the link can view.
            </p>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.resultsPassword}
                onChange={e => handleFieldChange('resultsPassword', e.target.value)}
                className="w-full px-4 py-3 pr-12 text-base font-medium border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal transition-all"
                placeholder="e.g., springevent2026"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-shortcut-navy-blue opacity-50 hover:opacity-80"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Questions */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl lg:text-2xl font-extrabold text-shortcut-navy-blue">
                Questions
              </h3>
              <Button type="button" variant="secondary" size="sm" onClick={addQuestion} icon={<Plus className="w-4 h-4" />}>
                Add Question
              </Button>
            </div>
            {errors.questions && (
              <p className="text-accent-coral text-sm font-medium">{errors.questions}</p>
            )}

            {questions.length === 0 && (
              <div className="p-6 border-2 border-dashed border-gray-300 rounded-lg text-center text-text-dark-60">
                No questions yet. Pick a template above or add one manually.
              </div>
            )}

            {questions.map((q, index) => (
              <div
                key={q.id}
                className="border-2 border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-shortcut-navy-blue opacity-60">
                    <GripVertical size={16} />
                    <span className="text-sm font-bold">Question {index + 1}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveQuestion(index, -1)}
                      disabled={index === 0}
                      className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move up"
                    >
                      <ChevronUp size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveQuestion(index, 1)}
                      disabled={index === questions.length - 1}
                      className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move down"
                    >
                      <ChevronDown size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeQuestion(index)}
                      className="p-1.5 rounded hover:bg-red-100 text-red-600"
                      title="Remove question"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      value={q.prompt}
                      onChange={e => updateQuestion(index, { prompt: e.target.value })}
                      className={`w-full px-3 py-2 text-sm font-medium border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal transition-all ${
                        errors[`q-${index}-prompt`] ? 'border-accent-coral' : 'border-gray-300'
                      }`}
                      placeholder="Question text"
                    />
                    {errors[`q-${index}-prompt`] && (
                      <p className="text-accent-coral text-xs font-medium mt-1">
                        {errors[`q-${index}-prompt`]}
                      </p>
                    )}
                  </div>
                  <select
                    value={q.type}
                    onChange={e => changeQuestionType(index, e.target.value as SurveyQuestionType)}
                    className="w-full px-3 py-2 text-sm font-medium border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal transition-all"
                  >
                    {(Object.keys(QUESTION_TYPE_LABELS) as SurveyQuestionType[]).map(t => (
                      <option key={t} value={t}>
                        {QUESTION_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </div>

                <input
                  type="text"
                  value={q.helpText || ''}
                  onChange={e => updateQuestion(index, { helpText: e.target.value })}
                  className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal transition-all"
                  placeholder="Help text (optional)"
                />

                {(q.type === 'single_choice' || q.type === 'multi_choice') && (
                  <div className="space-y-2">
                    {(q.options || []).map((opt, optIndex) => (
                      <div key={optIndex} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={opt}
                          onChange={e => updateOption(index, optIndex, e.target.value)}
                          className="flex-1 px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal transition-all"
                          placeholder={`Option ${optIndex + 1}`}
                        />
                        <button
                          type="button"
                          onClick={() => removeOption(index, optIndex)}
                          className="p-1.5 rounded hover:bg-red-100 text-red-600"
                          title="Remove option"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addOption(index)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-shortcut-blue hover:underline"
                    >
                      <Plus className="w-3 h-3" /> Add option
                    </button>
                    {errors[`q-${index}-options`] && (
                      <p className="text-accent-coral text-xs font-medium">
                        {errors[`q-${index}-options`]}
                      </p>
                    )}
                  </div>
                )}

                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={!!q.required}
                    onChange={e => updateQuestion(index, { required: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-xs font-bold text-shortcut-navy-blue">Required</span>
                </label>
              </div>
            ))}
          </div>

          <div className="flex justify-end space-x-4 pt-8">
            {onClose && (
              <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={loading}>
              {loading
                ? editingSurvey
                  ? 'Updating...'
                  : 'Creating...'
                : editingSurvey
                ? 'Update Survey'
                : 'Create Survey'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SurveyCreator;
