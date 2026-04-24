import React, { useEffect, useMemo, useState } from 'react';
import { useSurvey } from '../contexts/SurveyContext';
import type { Survey, SurveyResponse } from '../types/survey';
import { Button } from './Button';
import { ArrowLeft, Download, Share2, Link as LinkIcon, CheckCircle, X as XIcon, Lock, Trash2 } from 'lucide-react';

interface Props {
  survey: Survey;
  onClose: () => void;
}

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

const SurveyResponsesViewer: React.FC<Props> = ({ survey: initialSurvey, onClose }) => {
  const { getResponses, deleteResponse, enableResultsSharing, disableResultsSharing, surveys } = useSurvey();
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteResponse = async (responseId: string) => {
    if (!window.confirm('Delete this response? This cannot be undone.')) return;
    try {
      setDeletingId(responseId);
      await deleteResponse(responseId);
      setResponses(prev => prev.filter(r => r.id !== responseId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete response');
    } finally {
      setDeletingId(null);
    }
  };

  // Keep survey in sync with context (so resultsToken updates re-render immediately)
  const survey = surveys.find(s => s.id === initialSurvey.id) || initialSurvey;
  const questions = survey.data.questions;
  const showName = (survey.data.nameField ?? 'required') !== 'off';
  const showEmail = (survey.data.emailField ?? 'required') !== 'off';
  const sharedUrl = survey.resultsToken
    ? `${window.location.origin}/survey-results/${survey.resultsToken}`
    : '';

  const handleEnableSharing = async () => {
    try {
      setSharing(true);
      await enableResultsSharing(survey.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to enable sharing');
    } finally {
      setSharing(false);
    }
  };

  const handleDisableSharing = async () => {
    if (!window.confirm('Disable the shared results link? Existing link will stop working.')) return;
    try {
      setSharing(true);
      await disableResultsSharing(survey.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to disable sharing');
    } finally {
      setSharing(false);
    }
  };

  const copySharedLink = async () => {
    if (!sharedUrl) return;
    try {
      await navigator.clipboard.writeText(sharedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('Failed to copy link');
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const data = await getResponses(survey.id);
        if (!cancelled) setResponses(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load responses');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [survey.id]);

  const csv = useMemo(() => {
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
  }, [responses, questions, showName, showEmail]);

  const downloadCsv = () => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeTitle = (survey.data.title || 'survey').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    a.download = `${safeTitle}-responses.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1 text-sm font-bold text-shortcut-blue hover:underline mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to surveys
          </button>
          <h1 className="h1">{survey.data.title}</h1>
          <p className="text-text-dark-60 mt-2">
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

      {/* Share results section */}
      <div className="card-medium mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-extrabold text-shortcut-blue flex items-center gap-2">
              <Share2 className="w-4 h-4" />
              Share results with a manager
            </h3>
            <p className="text-sm text-text-dark-60 mt-1">
              {survey.resultsToken
                ? 'A read-only link is active. Anyone with the link can view responses and download the CSV — no login required.'
                : 'Turn on a read-only public link to send these results to the client manager, without giving them an account.'}
            </p>
          </div>
          {survey.resultsToken ? (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={copySharedLink}
                className={`inline-flex items-center px-3 py-2 text-xs font-bold rounded-md transition-colors ${
                  copied ? 'text-green-700 bg-green-100' : 'text-blue-700 bg-blue-100 hover:bg-blue-200'
                }`}
              >
                {copied ? (
                  <>
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Copied!
                  </>
                ) : (
                  <>
                    <LinkIcon className="w-3 h-3 mr-1" />
                    Copy Link
                  </>
                )}
              </button>
              <button
                onClick={handleDisableSharing}
                disabled={sharing}
                className="inline-flex items-center px-3 py-2 text-xs font-bold rounded-md text-red-700 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                <XIcon className="w-3 h-3 mr-1" />
                Turn off
              </button>
            </div>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleEnableSharing}
              disabled={sharing}
              icon={<Share2 className="w-4 h-4" />}
            >
              {sharing ? 'Enabling...' : 'Get shareable link'}
            </Button>
          )}
        </div>
        {survey.resultsToken && (
          <>
            <div className="mt-3 px-3 py-2 bg-gray-50 rounded font-mono text-xs text-text-dark-60 break-all">
              {sharedUrl}
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs">
              <Lock className="w-3 h-3 text-text-dark-60" />
              {survey.resultsPassword ? (
                <span className="text-text-dark-60">
                  Password-protected — set in survey settings. Managers will need it to view.
                </span>
              ) : (
                <span className="text-text-dark-60">
                  No password set — anyone with the link can view. Add one in{' '}
                  <span className="font-bold">Edit → Manager Results Password</span>.
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-text-dark-60">Loading responses...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12 card-medium">
          <p className="text-accent-coral font-medium">{error}</p>
        </div>
      ) : responses.length === 0 ? (
        <div className="text-center py-12 card-medium">
          <div className="text-text-dark-60 text-5xl mb-4">📨</div>
          <h3 className="text-xl font-extrabold text-shortcut-blue mb-2">No responses yet</h3>
          <p className="text-text-dark-60">Share your survey link to start collecting feedback.</p>
        </div>
      ) : (
        <div className="card-medium overflow-x-auto">
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
                <th className="px-3 py-2 text-right font-bold text-shortcut-navy-blue whitespace-nowrap">
                  {' '}
                </th>
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
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => handleDeleteResponse(r.id)}
                      disabled={deletingId === r.id}
                      className="p-1.5 rounded text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      title="Delete response"
                      aria-label="Delete response"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SurveyResponsesViewer;
