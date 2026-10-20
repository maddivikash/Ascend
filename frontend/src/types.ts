export interface User {
  id: number;
  email: string;
  full_name: string;
  email_reminders?: boolean;
  has_resume?: boolean;
  resume_filename?: string | null;
  resume_updated_at?: string | null;
  seen_features?: string[];
  is_admin?: boolean;
}

export interface DayCount {
  date: string;
  value: number;
}

export interface AdminUserRow {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  created_at: string | null;
  last_login_at: string | null;
  last_activity_at: string | null;
  goals: number;
  steps_done: number;
  steps_total: number;
  tasks_done: number;
  tasks_total: number;
  has_resume: boolean;
  email_reminders: boolean;
}

export interface AdminOverview {
  days: number;
  from: string;
  to: string;
  totals: {
    users: number;
    new_in_range: number;
    new_previous: number;
    active_in_range: number;
    with_goal: number;
    with_progress: number;
    with_resume: number;
    goals_in_range: number;
    goals_previous: number;
    tasks_in_range: number;
    tasks_previous: number;
    goals_total: number;
    steps_done_total: number;
    tasks_done_total: number;
  };
  signups_by_day: DayCount[];
  goals_by_day: DayCount[];
  tasks_by_day: DayCount[];
  logins_by_day: DayCount[];
  top_roles: { role: string; count: number }[];
  users: AdminUserRow[];
  notes: string[];
}

export interface AppNotification {
  kind: "step" | "task";
  title: string;
  goal_id: number;
  goal_role: string;
  due_date: string;
  overdue: boolean;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface Progress {
  total_tasks: number;
  done_tasks: number;
  percent: number;
}

export interface Goal {
  id: number;
  role: string;
  hours_per_week: number;
  duration_weeks: number;
  is_active: boolean;
  is_archived?: boolean;
  created_at: string;
}

export interface DashboardGoal extends Goal {
  paths_count: number;
  progress: Progress;
  readiness?: number | null; // job-prep goals only
}

export interface Dashboard {
  overall: Progress;
  goals: DashboardGoal[];
}

export interface LearningPath {
  id: number;
  goal_id: number;
  title: string;
  description: string | null;
  created_at: string;
}

export interface Step {
  id: number;
  path_id: number;
  title: string;
  description: string | null;
  step_order: number;
  is_done: boolean;
  due_date?: string | null;
  created_at: string;
}

export interface Task {
  due_date?: string | null;
  id: number;
  step_id: number;
  title: string;
  description: string | null;
  is_done: boolean;
  created_at: string;
}

// ---- Catalog (suggestions live in the DB) ----
export interface CatalogRole {
  id: number;
  slug: string;
  name: string;
}

export type CatalogCategory = "skill" | "course" | "tool" | "project";

export interface CatalogItem {
  id: number;
  category: CatalogCategory;
  name: string;
  description: string | null;
  provider: string | null;
  url: string | null;
  estimated_hours: number | null;
  steps: string[] | null;
}

export interface RoleSuggestions {
  matched: boolean;
  label: string;
  role: CatalogRole | null;
  items: {
    skill: CatalogItem[];
    course: CatalogItem[];
    tool: CatalogItem[];
    project: CatalogItem[];
  };
}

export interface PostItem {
  headline: string;
  summary: string;
  why_it_matters: string;
  source_name: string;
  source_url: string;
}

export interface Post {
  id: number;
  slug: string;
  kind: "daily" | "weekly";
  title: string;
  summary: string;
  learn_next: string | null;
  learn_role: string | null;
  status: "draft" | "published";
  published_at: string | null;
  created_at: string | null;
  items?: PostItem[];
}
