export interface User {
  id: string;
  name: string;
  email: string;
  timezone: string;
  week_start: string;
  is_placeholder: boolean;
}

export interface Member {
  id: string;
  user_id: string;
  role: string;
  billable_rate: number | null;
}

export interface TimeEntry {
  id: string;
  start: string;
  end: string | null;
  duration: number | null;
  description: string | null;
  billable: boolean;
  tags: string[];
  project_id: string | null;
  task_id: string | null;
  member_id: string;
  user_id: string;
}

export interface TimeEntryReport {
  grouped_type: string;
  grouped_data:
    | null
    | {
        key: string;
        seconds: number;
        cost: number;
        grouped_type: string | null;
        grouped_data: null | { key: string; seconds: number; cost: number }[];
      }[];
}

export interface Project {
  id: string;
  name: string;
  color: string;
  is_billable: boolean;
  is_archived: boolean;
  billable_rate: number | null;
  estimated_time: number | null;
  spent_time: number;
  client_id: string | null;
}

export interface Client {
  id: string;
  name: string;
  is_archived: boolean;
}

export interface Tag {
  id: string;
  name: string;
}

export interface Task {
  id: string;
  name: string;
  is_done: boolean;
  project_id: string;
  estimated_time: number | null;
  spent_time: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page?: number;
  last_page?: number;
  per_page?: number;
  total?: number;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}
