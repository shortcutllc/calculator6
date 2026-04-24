import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useDevTask } from '../contexts/DevTaskContext';
import {
  DEV_TASK_PRIORITY_LABELS,
  DEV_TASK_STATUS_LABELS,
  type DevTask,
  type DevTaskPriority,
  type DevTaskStatus,
} from '../types/devTask';
import { Button } from './Button';
import { Eye, Pencil } from 'lucide-react';

interface Props {
  onClose?: () => void;
  editingTask?: DevTask | null;
}

const TEMPLATE_STARTER = `## Context

Briefly describe what this is and why.

## What I need

- Bullet the concrete asks

## Questions

- List anything you want a decision on

## Related

- Links, template IDs, Slack threads`;

const DevTaskCreator: React.FC<Props> = ({ onClose, editingTask }) => {
  const { createTask, updateTask } = useDevTask();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<'edit' | 'preview' | 'split'>('split');

  const [form, setForm] = useState({
    title: editingTask?.title || '',
    bodyMd: editingTask?.bodyMd ?? (editingTask ? '' : TEMPLATE_STARTER),
    status: (editingTask?.status || 'open') as DevTaskStatus,
    priority: (editingTask?.priority || 'medium') as DevTaskPriority,
    assignee: editingTask?.assignee || '',
    dueDate: editingTask?.dueDate || '',
    tagsInput: (editingTask?.tags || []).join(', '),
  });

  useEffect(() => {
    if (editingTask) {
      setForm({
        title: editingTask.title || '',
        bodyMd: editingTask.bodyMd || '',
        status: editingTask.status,
        priority: editingTask.priority,
        assignee: editingTask.assignee || '',
        dueDate: editingTask.dueDate || '',
        tagsInput: (editingTask.tags || []).join(', '),
      });
    }
  }, [editingTask]);

  const handleField = (k: keyof typeof form, v: any) => {
    setForm(prev => ({ ...prev, [k]: v }));
    if (errors[k as string]) setErrors(prev => ({ ...prev, [k as string]: '' }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = 'Title is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const parseTags = (input: string): string[] =>
    input
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      setLoading(true);
      if (editingTask) {
        await updateTask(editingTask.id, {
          title: form.title,
          bodyMd: form.bodyMd,
          status: form.status,
          priority: form.priority,
          assignee: form.assignee,
          dueDate: form.dueDate || undefined,
          tags: parseTags(form.tagsInput),
        });
      } else {
        await createTask({
          title: form.title,
          bodyMd: form.bodyMd,
          status: form.status,
          priority: form.priority,
          assignee: form.assignee,
          dueDate: form.dueDate || undefined,
          tags: parseTags(form.tagsInput),
        });
      }
      onClose?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save dev task');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 lg:p-10 max-w-5xl w-full max-h-[92vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl lg:text-3xl font-extrabold text-shortcut-navy-blue">
            {editingTask ? 'Edit Dev Task' : 'New Dev Task'}
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

        <form onSubmit={onSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-bold text-shortcut-navy-blue mb-2">Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={e => handleField('title', e.target.value)}
              className={`w-full px-4 py-3 text-base font-medium border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal transition-all ${
                errors.title ? 'border-accent-coral' : 'border-gray-300'
              }`}
              placeholder="e.g., Email + SMS updates — add per-event merge variables"
            />
            {errors.title && (
              <p className="text-accent-coral text-sm font-medium mt-2">{errors.title}</p>
            )}
          </div>

          {/* Metadata grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-bold text-shortcut-navy-blue mb-2">Status</label>
              <select
                value={form.status}
                onChange={e => handleField('status', e.target.value)}
                className="w-full px-4 py-3 text-sm font-medium border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal transition-all"
              >
                {Object.entries(DEV_TASK_STATUS_LABELS).map(([v, label]) => (
                  <option key={v} value={v}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-shortcut-navy-blue mb-2">Priority</label>
              <select
                value={form.priority}
                onChange={e => handleField('priority', e.target.value)}
                className="w-full px-4 py-3 text-sm font-medium border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal transition-all"
              >
                {Object.entries(DEV_TASK_PRIORITY_LABELS).map(([v, label]) => (
                  <option key={v} value={v}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-shortcut-navy-blue mb-2">Assignee</label>
              <input
                type="text"
                value={form.assignee}
                onChange={e => handleField('assignee', e.target.value)}
                className="w-full px-4 py-3 text-sm font-medium border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal transition-all"
                placeholder="Name or email"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-shortcut-navy-blue mb-2">Due date</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={e => handleField('dueDate', e.target.value)}
                className="w-full px-4 py-3 text-sm font-medium border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-shortcut-navy-blue mb-2">
              Tags <span className="font-medium opacity-60">(comma-separated)</span>
            </label>
            <input
              type="text"
              value={form.tagsInput}
              onChange={e => handleField('tagsInput', e.target.value)}
              className="w-full px-4 py-3 text-sm font-medium border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal transition-all"
              placeholder="e.g., email, sms, workhuman"
            />
          </div>

          {/* Body markdown editor */}
          <div>
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <label className="block text-sm font-bold text-shortcut-navy-blue">
                Body <span className="font-medium opacity-60">(Markdown — GFM supported)</span>
              </label>
              <div className="inline-flex rounded-lg border-2 border-gray-300 overflow-hidden text-xs font-bold">
                {(['edit', 'split', 'preview'] as const).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`px-3 py-1.5 transition-colors ${
                      mode === m
                        ? 'bg-shortcut-teal/20 text-shortcut-navy-blue'
                        : 'text-shortcut-navy-blue opacity-70 hover:bg-gray-100'
                    }`}
                  >
                    {m === 'edit' ? (
                      <span className="inline-flex items-center gap-1">
                        <Pencil size={12} />
                        Edit
                      </span>
                    ) : m === 'preview' ? (
                      <span className="inline-flex items-center gap-1">
                        <Eye size={12} />
                        Preview
                      </span>
                    ) : (
                      'Split'
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div
              className={`grid gap-3 ${
                mode === 'split' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'
              }`}
            >
              {mode !== 'preview' && (
                <textarea
                  value={form.bodyMd}
                  onChange={e => handleField('bodyMd', e.target.value)}
                  rows={mode === 'edit' ? 22 : 18}
                  className="w-full px-4 py-3 text-sm font-mono border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal transition-all resize-y leading-relaxed"
                  placeholder="Use Markdown — headings, lists, links, code, tables..."
                />
              )}
              {mode !== 'edit' && (
                <div
                  className={`prose-compact border-2 border-gray-200 rounded-lg p-4 bg-gray-50 overflow-auto ${
                    mode === 'split' ? 'min-h-[22rem] max-h-[32rem]' : 'min-h-[32rem]'
                  }`}
                >
                  {form.bodyMd.trim() ? (
                    <MarkdownBody markdown={form.bodyMd} />
                  ) : (
                    <p className="text-sm text-text-dark-60">Nothing to preview yet.</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            {onClose && (
              <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={loading}>
              {loading ? (editingTask ? 'Updating...' : 'Creating...') : editingTask ? 'Update Task' : 'Create Task'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Shared renderer — exported so Detail view can use it too
export const MarkdownBody: React.FC<{ markdown: string }> = ({ markdown }) => (
  <div className="markdown-body">
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ node, ...props }) => (
          <h1 className="text-2xl font-extrabold text-shortcut-navy-blue mt-4 mb-2" {...props} />
        ),
        h2: ({ node, ...props }) => (
          <h2 className="text-xl font-extrabold text-shortcut-navy-blue mt-4 mb-2" {...props} />
        ),
        h3: ({ node, ...props }) => (
          <h3 className="text-lg font-bold text-shortcut-navy-blue mt-3 mb-2" {...props} />
        ),
        p: ({ node, ...props }) => (
          <p className="text-sm text-text-dark leading-relaxed mb-3" {...props} />
        ),
        ul: ({ node, ...props }) => (
          <ul className="list-disc list-outside ml-6 space-y-1 mb-3 text-sm text-text-dark" {...props} />
        ),
        ol: ({ node, ...props }) => (
          <ol className="list-decimal list-outside ml-6 space-y-1 mb-3 text-sm text-text-dark" {...props} />
        ),
        li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
        code: ({ node, inline, className, children, ...props }: any) =>
          inline ? (
            <code
              className="bg-gray-200 text-shortcut-navy-blue px-1.5 py-0.5 rounded font-mono text-xs"
              {...props}
            >
              {children}
            </code>
          ) : (
            <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto text-xs my-3">
              <code className={`font-mono ${className || ''}`} {...props}>
                {children}
              </code>
            </pre>
          ),
        a: ({ node, ...props }) => (
          <a
            className="text-shortcut-blue underline hover:text-shortcut-navy-blue"
            target="_blank"
            rel="noreferrer noopener"
            {...props}
          />
        ),
        blockquote: ({ node, ...props }) => (
          <blockquote
            className="border-l-4 border-shortcut-teal pl-4 italic text-text-dark-60 my-3"
            {...props}
          />
        ),
        table: ({ node, ...props }) => (
          <div className="overflow-x-auto my-3">
            <table className="min-w-full text-sm border-collapse" {...props} />
          </div>
        ),
        th: ({ node, ...props }) => (
          <th
            className="border border-gray-300 bg-gray-100 px-2 py-1 text-left font-bold text-shortcut-navy-blue"
            {...props}
          />
        ),
        td: ({ node, ...props }) => <td className="border border-gray-300 px-2 py-1 text-text-dark" {...props} />,
        hr: () => <hr className="border-gray-200 my-4" />,
      }}
    >
      {markdown}
    </ReactMarkdown>
  </div>
);

export default DevTaskCreator;
