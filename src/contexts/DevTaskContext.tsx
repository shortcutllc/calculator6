import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { DevTask, DevTaskOptions } from '../types/devTask';

interface DevTaskContextType {
  tasks: DevTask[];
  loading: boolean;
  error: string | null;
  fetchTasks: () => Promise<void>;
  createTask: (options: DevTaskOptions) => Promise<string>;
  updateTask: (id: string, updates: Partial<DevTask>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
}

const DevTaskContext = createContext<DevTaskContextType | undefined>(undefined);

export const useDevTask = () => {
  const ctx = useContext(DevTaskContext);
  if (!ctx) throw new Error('useDevTask must be used within a DevTaskProvider');
  return ctx;
};

const transform = (row: any): DevTask => ({
  id: row.id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  userId: row.user_id,
  title: row.title,
  bodyMd: row.body_md || '',
  status: row.status,
  priority: row.priority,
  assignee: row.assignee || undefined,
  dueDate: row.due_date || undefined,
  tags: Array.isArray(row.tags) ? row.tags : [],
  data: row.data || {},
});

export const DevTaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<DevTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('dev_tasks')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        if (
          error.code === 'PGRST204' ||
          error.code === '42P01' ||
          error.message?.includes('does not exist')
        ) {
          console.warn('⚠️ dev_tasks table does not exist yet. Please apply the migration.');
          setTasks([]);
          return;
        }
        throw error;
      }
      setTasks((data || []).map(transform));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch dev tasks';
      if (!msg.includes('does not exist')) setError(msg);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchTasks().catch(() => {});
    }, 0);
    return () => clearTimeout(t);
  }, [fetchTasks]);

  const createTask = async (options: DevTaskOptions): Promise<string> => {
    if (!options.title?.trim()) throw new Error('Title is required');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('You must be logged in to create a dev task');

    const insertRow = {
      user_id: user.id,
      title: options.title.trim(),
      body_md: options.bodyMd || '',
      status: options.status || 'open',
      priority: options.priority || 'medium',
      assignee: options.assignee?.trim() || null,
      due_date: options.dueDate || null,
      tags: options.tags || [],
    };

    const { data, error } = await supabase
      .from('dev_tasks')
      .insert(insertRow)
      .select()
      .single();
    if (error) {
      console.error('❌ Failed to create dev task:', error);
      throw new Error(error.message || 'Failed to create dev task');
    }
    await fetchTasks();
    return data.id;
  };

  const updateTask = async (id: string, updates: Partial<DevTask>) => {
    try {
      setLoading(true);
      setError(null);
      const row: any = { updated_at: new Date().toISOString() };
      if (updates.title !== undefined) row.title = updates.title.trim();
      if (updates.bodyMd !== undefined) row.body_md = updates.bodyMd;
      if (updates.status !== undefined) row.status = updates.status;
      if (updates.priority !== undefined) row.priority = updates.priority;
      if (updates.assignee !== undefined) row.assignee = updates.assignee?.trim() || null;
      if (updates.dueDate !== undefined) row.due_date = updates.dueDate || null;
      if (updates.tags !== undefined) row.tags = updates.tags;
      if (updates.data !== undefined) row.data = updates.data;

      const { error } = await supabase.from('dev_tasks').update(row).eq('id', id);
      if (error) throw error;
      await fetchTasks();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update dev task';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const deleteTask = async (id: string) => {
    const { data, error } = await supabase.from('dev_tasks').delete().eq('id', id).select();
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error('No dev task found or you do not have permission to delete it');
    }
    await fetchTasks();
  };

  return (
    <DevTaskContext.Provider value={{ tasks, loading, error, fetchTasks, createTask, updateTask, deleteTask }}>
      {children}
    </DevTaskContext.Provider>
  );
};
