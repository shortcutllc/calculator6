import React, { useState } from 'react';
import { useDevTask } from '../contexts/DevTaskContext';
import {
  DEV_TASK_PRIORITY_LABELS,
  DEV_TASK_STATUS_LABELS,
  type DevTask,
  type DevTaskStatus,
} from '../types/devTask';
import { Button } from './Button';
import { MarkdownBody } from './DevTaskCreator';
import { Copy, CheckCircle, Edit2 } from 'lucide-react';

interface Props {
  task: DevTask;
  onClose: () => void;
  onEdit: () => void;
}

const DevTaskDetail: React.FC<Props> = ({ task, onClose, onEdit }) => {
  const { updateTask } = useDevTask();
  const [copied, setCopied] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);

  const copyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(task.bodyMd);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('Failed to copy');
    }
  };

  const changeStatus = async (status: DevTaskStatus) => {
    try {
      setSavingStatus(true);
      await updateTask(task.id, { status });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setSavingStatus(false);
    }
  };

  const dueLabel = task.dueDate
    ? new Date(task.dueDate + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 lg:p-10 max-w-4xl w-full max-h-[92vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-6 gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-text-dark-60 mb-1">
              Dev Task
            </p>
            <h2 className="text-2xl lg:text-3xl font-extrabold text-shortcut-navy-blue">
              {task.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-shortcut-navy-blue opacity-40 hover:opacity-60 text-3xl leading-none transition-opacity flex-shrink-0"
          >
            ×
          </button>
        </div>

        {/* Metadata row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 pb-6 border-b border-gray-200 text-sm">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-text-dark-60 mb-1">
              Status
            </div>
            <select
              value={task.status}
              onChange={e => changeStatus(e.target.value as DevTaskStatus)}
              disabled={savingStatus}
              className="w-full px-2 py-1.5 text-sm font-bold border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal"
            >
              {Object.entries(DEV_TASK_STATUS_LABELS).map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-text-dark-60 mb-1">
              Priority
            </div>
            <div className="font-bold text-text-dark">
              {DEV_TASK_PRIORITY_LABELS[task.priority]}
            </div>
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-text-dark-60 mb-1">
              Assignee
            </div>
            <div className="font-bold text-text-dark truncate" title={task.assignee || undefined}>
              {task.assignee || '—'}
            </div>
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-text-dark-60 mb-1">
              Due
            </div>
            <div className="font-bold text-text-dark">{dueLabel || '—'}</div>
          </div>
        </div>

        {task.tags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap mb-6">
            <span className="text-xs font-bold uppercase tracking-wider text-text-dark-60">
              Tags:
            </span>
            {task.tags.map(tag => (
              <span
                key={tag}
                className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-neutral-light-gray text-shortcut-blue"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Body */}
        {task.bodyMd.trim() ? (
          <MarkdownBody markdown={task.bodyMd} />
        ) : (
          <p className="text-sm text-text-dark-60 italic">No description.</p>
        )}

        <div className="mt-8 pt-6 border-t border-gray-200 flex items-center justify-between gap-4 flex-wrap">
          <div className="text-xs text-text-dark-60">
            Created {new Date(task.createdAt).toLocaleString()}
            {task.updatedAt !== task.createdAt && (
              <> · Updated {new Date(task.updatedAt).toLocaleString()}</>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={copyMarkdown}
              disabled={!task.bodyMd.trim()}
              className={`inline-flex items-center px-3 py-2 text-xs font-bold rounded-md transition-colors ${
                copied
                  ? 'text-green-700 bg-green-100'
                  : 'text-blue-700 bg-blue-100 hover:bg-blue-200 disabled:opacity-40'
              }`}
            >
              {copied ? (
                <>
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 mr-1" />
                  Copy Markdown
                </>
              )}
            </button>
            <Button variant="secondary" size="sm" onClick={onEdit} icon={<Edit2 className="w-3 h-3" />}>
              Edit
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DevTaskDetail;
