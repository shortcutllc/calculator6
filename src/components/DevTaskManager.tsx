import React, { useMemo, useState } from 'react';
import { useDevTask } from '../contexts/DevTaskContext';
import {
  DEV_TASK_PRIORITY_LABELS,
  DEV_TASK_STATUS_LABELS,
  type DevTask,
  type DevTaskPriority,
  type DevTaskStatus,
} from '../types/devTask';
import { Button } from './Button';
import DevTaskCreator from './DevTaskCreator';
import DevTaskDetail from './DevTaskDetail';
import { Search, X, Eye, Edit2, Trash2 } from 'lucide-react';

const STATUS_STYLES: Record<DevTaskStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  open: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  blocked: 'bg-red-100 text-red-800',
  done: 'bg-green-100 text-green-800',
  archived: 'bg-neutral-light-gray text-shortcut-blue',
};

const PRIORITY_STYLES: Record<DevTaskPriority, string> = {
  low: 'text-gray-500',
  medium: 'text-blue-600',
  high: 'text-orange-600',
  urgent: 'text-red-600',
};

const DevTaskManager: React.FC = () => {
  const { tasks, loading, deleteTask } = useDevTask();
  const [showCreator, setShowCreator] = useState(false);
  const [editingTask, setEditingTask] = useState<DevTask | null>(null);
  const [viewingTask, setViewingTask] = useState<DevTask | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'priority' | 'due'>('newest');

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this dev task? This cannot be undone.')) return;
    try {
      setDeletingId(id);
      await deleteTask(id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  const priorityRank: Record<DevTaskPriority, number> = {
    urgent: 3,
    high: 2,
    medium: 1,
    low: 0,
  };

  const filteredAndSorted = useMemo(() => {
    let filtered = tasks;

    if (searchTerm.trim()) {
      const s = searchTerm.toLowerCase();
      filtered = filtered.filter(
        t =>
          t.title.toLowerCase().includes(s) ||
          t.bodyMd.toLowerCase().includes(s) ||
          t.assignee?.toLowerCase().includes(s) ||
          t.tags.some(tag => tag.toLowerCase().includes(s))
      );
    }

    if (statusFilter === 'active') {
      filtered = filtered.filter(t => t.status !== 'archived' && t.status !== 'done');
    } else if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter);
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(t => t.priority === priorityFilter);
    }

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'priority':
          return priorityRank[b.priority] - priorityRank[a.priority];
        case 'due':
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
    });
  }, [tasks, searchTerm, statusFilter, priorityFilter, sortBy]);

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('active');
    setPriorityFilter('all');
    setSortBy('newest');
  };

  const hasActiveFilters =
    searchTerm.trim() !== '' ||
    statusFilter !== 'active' ||
    priorityFilter !== 'all' ||
    sortBy !== 'newest';

  if (loading && tasks.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-text-dark-60">Loading dev tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <div>
          <h1 className="h1">Dev Tasks</h1>
          <p className="text-text-dark-60 mt-2">
            Internal tickets + briefs for developer hand-offs
          </p>
        </div>
        <Button onClick={() => setShowCreator(true)}>New Dev Task</Button>
      </div>

      {tasks.length > 0 && (
        <div className="card-medium mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-dark-60 w-4 h-4" />
              <input
                type="text"
                placeholder="Search title, body, assignee, tag..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal"
            >
              <option value="active">Active (not done/archived)</option>
              <option value="all">All Statuses</option>
              {Object.entries(DEV_TASK_STATUS_LABELS).map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </select>
            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal"
            >
              <option value="all">All Priorities</option>
              {Object.entries(DEV_TASK_PRIORITY_LABELS).map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="priority">Priority (high → low)</option>
              <option value="due">Due Date (soonest)</option>
            </select>
          </div>
          {hasActiveFilters && (
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="text-sm text-text-dark-60">
                Showing {filteredAndSorted.length} of {tasks.length} tasks
              </div>
              <button
                onClick={clearFilters}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-shortcut-blue bg-neutral-light-gray rounded-md hover:bg-neutral-gray transition-colors"
              >
                <X className="w-4 h-4 mr-1" />
                Clear Filters
              </button>
            </div>
          )}
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-text-dark-60 text-6xl mb-4">🛠️</div>
          <h3 className="text-xl font-extrabold text-shortcut-blue mb-2">No Dev Tasks Yet</h3>
          <p className="text-text-dark-60 mb-6">Write up your first developer hand-off note</p>
          <Button onClick={() => setShowCreator(true)}>Create Your First Dev Task</Button>
        </div>
      ) : filteredAndSorted.length === 0 ? (
        <div className="text-center py-12 card-medium">
          <div className="text-text-dark-60 text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-extrabold text-shortcut-blue mb-2">No Tasks Found</h3>
          <p className="text-text-dark-60 mb-6">Try adjusting your filters.</p>
          <Button onClick={clearFilters} variant="primary" icon={<X className="w-4 h-4" />} size="sm">
            Clear All Filters
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAndSorted.map(task => {
            const dueLabel = task.dueDate
              ? new Date(task.dueDate + 'T00:00:00').toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : null;
            const overdue =
              task.dueDate &&
              task.status !== 'done' &&
              task.status !== 'archived' &&
              new Date(task.dueDate) < new Date(new Date().toISOString().slice(0, 10));
            return (
              <div
                key={task.id}
                className="card-medium cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setViewingTask(task)}
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded-full ${STATUS_STYLES[task.status]}`}
                      >
                        {DEV_TASK_STATUS_LABELS[task.status]}
                      </span>
                      <span
                        className={`text-xs font-bold uppercase tracking-wide ${PRIORITY_STYLES[task.priority]}`}
                      >
                        {DEV_TASK_PRIORITY_LABELS[task.priority]}
                      </span>
                      {task.tags.map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-neutral-light-gray text-shortcut-blue"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <h3 className="text-lg font-extrabold text-shortcut-blue">
                      {task.title || 'Untitled Task'}
                    </h3>
                    <div className="flex items-center gap-3 flex-wrap mt-1 text-xs text-text-dark-60">
                      {task.assignee && (
                        <span>
                          <span className="font-bold text-text-dark">Assignee:</span>{' '}
                          {task.assignee}
                        </span>
                      )}
                      {dueLabel && (
                        <span className={overdue ? 'text-red-600 font-bold' : ''}>
                          <span className="font-bold text-text-dark">Due:</span> {dueLabel}
                          {overdue ? ' (overdue)' : ''}
                        </span>
                      )}
                      <span>
                        <span className="font-bold text-text-dark">Created:</span>{' '}
                        {new Date(task.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => setViewingTask(task)}
                      className="p-1.5 rounded hover:bg-gray-100 text-shortcut-navy-blue"
                      title="View"
                      aria-label="View task"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => {
                        setEditingTask(task);
                        setShowCreator(true);
                      }}
                      className="p-1.5 rounded hover:bg-gray-100 text-shortcut-navy-blue"
                      title="Edit"
                      aria-label="Edit task"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(task.id)}
                      disabled={deletingId === task.id}
                      className="p-1.5 rounded hover:bg-red-50 text-red-600 disabled:opacity-40"
                      title="Delete"
                      aria-label="Delete task"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreator && (
        <DevTaskCreator
          onClose={() => {
            setShowCreator(false);
            setEditingTask(null);
          }}
          editingTask={editingTask}
        />
      )}

      {viewingTask && (
        <DevTaskDetail
          task={viewingTask}
          onClose={() => setViewingTask(null)}
          onEdit={() => {
            setEditingTask(viewingTask);
            setViewingTask(null);
            setShowCreator(true);
          }}
        />
      )}
    </div>
  );
};

export default DevTaskManager;
