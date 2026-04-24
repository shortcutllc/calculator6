export type DevTaskStatus =
  | 'draft'
  | 'open'
  | 'in_progress'
  | 'blocked'
  | 'done'
  | 'archived';

export type DevTaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface DevTask {
  id: string;
  createdAt: string;
  updatedAt: string;
  userId?: string;
  title: string;
  bodyMd: string;
  status: DevTaskStatus;
  priority: DevTaskPriority;
  assignee?: string;
  dueDate?: string;
  tags: string[];
  data: Record<string, unknown>;
}

export interface DevTaskOptions {
  title: string;
  bodyMd: string;
  status?: DevTaskStatus;
  priority?: DevTaskPriority;
  assignee?: string;
  dueDate?: string;
  tags?: string[];
}

export const DEV_TASK_STATUS_LABELS: Record<DevTaskStatus, string> = {
  draft: 'Draft',
  open: 'Open',
  in_progress: 'In Progress',
  blocked: 'Blocked',
  done: 'Done',
  archived: 'Archived',
};

export const DEV_TASK_PRIORITY_LABELS: Record<DevTaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};
