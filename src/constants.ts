export const DEFAULT_API_URL = "https://app.solidtime.io";

export const API_PATHS = {
  me: "/users/me",
  activeTimer: "/users/me/time-entries/active",
  members: (orgId: string) => `/organizations/${orgId}/members`,
  timeEntries: (orgId: string) => `/api/v1/organizations/${orgId}/time-entries`,
  timeEntry: (orgId: string, id: string) => `/api/v1/organizations/${orgId}/time-entries/${id}`,
  timeEntryReport: (orgId: string) => `/api/v1/organizations/${orgId}/time-entries/aggregate`,
  projects: (orgId: string) => `/api/v1/organizations/${orgId}/projects`,
  project: (orgId: string, id: string) => `/api/v1/organizations/${orgId}/projects/${id}`,
  clients: (orgId: string) => `/api/v1/organizations/${orgId}/clients`,
  client: (orgId: string, id: string) => `/api/v1/organizations/${orgId}/clients/${id}`,
  tags: (orgId: string) => `/api/v1/organizations/${orgId}/tags`,
  tag: (orgId: string, id: string) => `/api/v1/organizations/${orgId}/tags/${id}`,
  tasks: (orgId: string) => `/api/v1/organizations/${orgId}/tasks`,
  task: (orgId: string, id: string) => `/api/v1/organizations/${orgId}/tasks/${id}`,
} as const;

export const GROUP_BY_VALUES = [
  "day",
  "week",
  "month",
  "year",
  "user",
  "project",
  "task",
  "client",
  "billable",
  "description",
  "tag",
] as const;

export type GroupBy = (typeof GROUP_BY_VALUES)[number];

export const PAGINATION = {
  defaultLimit: 50,
  maxLimit: 500,
  defaultPage: 1,
} as const;
