import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSurvey } from '../contexts/SurveyContext';
import type { Survey, SurveyResponse } from '../types/survey';
import { Button } from './Button';
import { LoadingSpinner } from './LoadingSpinner';
import { Download, Lock } from 'lucide-react';

const formatAnswer = (val: unknown): string => {
  if (val === undefined || val === null) return '—';
  if (Array.isArray(val)) return val.join(', ');
  if (typeof val === 'string') return val.trim() || '—';
  return String(val);
};

const escapeCsv = (val: string): string => {
  if (/[",\n]/.test(val)) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
};

const SurveyResultsPublic: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const { getSharedResults } = useSurvey();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const loadResults = async (pwd?: string) => {
    if (!token) return;
    try {
      setChecking(true);
      setPasswordError(null);
      const result = await getSharedResults(token, pwd);
      if (result.status === 'not_found') {
        setErrorMsg('This results link is invalid or has been turned off.');
      } else if (result.status === 'password_required') {
        setRequiresPassword(true);
        if (result.wrongPassword) setPasswordError('Incorrect password. Try again.');
      } else {
        setSurvey(result.survey);
        setResponses(result.responses);
        setRequiresPassword(false);
        document.title = result.survey.data.title
          ? `${result.survey.data.title} · Results`
          : 'Survey Results';
      }
    } catch {
      setErrorMsg('Unable to load survey results.');
    } finally {
      setChecking(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setPasswordError('Please enter the password');
      return;
    }
    loadResults(password);
  };

  const showName = (survey?.data.nameField ?? 'required') !== 'off';
  const showEmail = (survey?.data.emailField ?? 'required') !== 'off';
  const questions = survey?.data.questions ?? [];

  const csv = useMemo(() => {
    if (!survey) return '';
    const header = [
      'Submitted',
      ...(showName ? ['Name'] : []),
      ...(showEmail ? ['Email'] : []),
      ...questions.map(q => q.prompt),
    ];
    const rows = responses.map(r => {
      const base = [
        new Date(r.createdAt).toLocaleString(),
        ...(showName ? [r.respondentName || ''] : []),
        ...(showEmail ? [r.respondentEmail || ''] : []),
        ...questions.map(q => formatAnswer(r.answers[q.id])),
      ];
      return base.map(v => escapeCsv(String(v))).join(',');
    });
    return [header.map(escapeCsv).join(','), ...rows].join('\n');
  }, [survey, responses, questions, showName, showEmail]);

  const downloadCsv = () => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeTitle = (survey?.data.title || 'survey').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    a.download = `${safeTitle}-responses.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-extrabold text-shortcut-navy-blue mb-3">
            Results unavailable
          </h1>
          <p className="text-shortcut-navy-blue opacity-60">{errorMsg}</p>
        </div>
      </div>
    );
  }

  if (requiresPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm p-8">
          <div className="flex justify-center mb-4">
            <img src="/shortcut-logo-blue.svg" alt="Shortcut" className="h-7 w-auto" />
          </div>
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-shortcut-teal/10">
            <Lock className="w-5 h-5 text-shortcut-navy-blue" />
          </div>
          <h1 className="text-2xl font-extrabold text-shortcut-navy-blue text-center mb-2">
            Password required
          </h1>
          <p className="text-sm text-shortcut-navy-blue opacity-60 text-center mb-6">
            This survey's results are protected. Enter the password to view.
          </p>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={e => {
                setPassword(e.target.value);
                if (passwordError) setPasswordError(null);
              }}
              className={`w-full px-4 py-3 text-base font-medium border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal transition-all ${
                passwordError ? 'border-accent-coral' : 'border-gray-300'
              }`}
              placeholder="Password"
              autoFocus
              autoComplete="off"
            />
            {passwordError && (
              <p className="text-accent-coral text-sm font-medium">{passwordError}</p>
            )}
            <Button type="submit" disabled={checking} className="w-full">
              {checking ? 'Checking...' : 'View results'}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-extrabold text-shortcut-navy-blue mb-3">
            Results unavailable
          </h1>
          <p className="text-shortcut-navy-blue opacity-60">
            This results page could not be loaded.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8 mb-6">
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
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-text-dark-60 mb-1">
                Survey Results
              </p>
              <h1 className="text-2xl lg:text-3xl font-extrabold text-shortcut-navy-blue">
                {survey.data.title}
              </h1>
              <p className="text-sm text-text-dark-60 mt-2">
                {responses.length} response{responses.length === 1 ? '' : 's'}
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={downloadCsv}
              disabled={responses.length === 0}
              icon={<Download className="w-4 h-4" />}
            >
              Download CSV
            </Button>
          </div>
        </div>

        {/* Responses */}
        {responses.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <div className="text-text-dark-60 text-5xl mb-4">📨</div>
            <h3 className="text-xl font-extrabold text-shortcut-blue mb-2">No responses yet</h3>
            <p className="text-text-dark-60">Check back once your team has submitted the survey.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="px-3 py-2 text-left font-bold text-shortcut-navy-blue whitespace-nowrap">
                    Submitted
                  </th>
                  {showName && (
                    <th className="px-3 py-2 text-left font-bold text-shortcut-navy-blue whitespace-nowrap">
                      Name
                    </th>
                  )}
                  {showEmail && (
                    <th className="px-3 py-2 text-left font-bold text-shortcut-navy-blue whitespace-nowrap">
                      Email
                    </th>
                  )}
                  {questions.map(q => (
                    <th
                      key={q.id}
                      className="px-3 py-2 text-left font-bold text-shortcut-navy-blue min-w-[180px]"
                    >
                      {q.prompt}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {responses.map(r => (
                  <tr key={r.id} className="border-b border-gray-100 align-top">
                    <td className="px-3 py-2 text-text-dark-60 whitespace-nowrap">
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                    {showName && (
                      <td className="px-3 py-2 text-text-dark">{r.respondentName || '—'}</td>
                    )}
                    {showEmail && (
                      <td className="px-3 py-2 text-text-dark">{r.respondentEmail || '—'}</td>
                    )}
                    {questions.map(q => (
                      <td key={q.id} className="px-3 py-2 text-text-dark whitespace-pre-wrap">
                        {formatAnswer(r.answers[q.id])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SurveyResultsPublic;
