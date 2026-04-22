export type UserRole = 'admin' | 'project_manager' | 'team_member';
export type ProjectStatus = 'not_started' | 'in_progress' | 'completed' | 'delayed';
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'blocked';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  mobile: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  sector: string | null;
  owner_name: string | null;
  owner_email: string | null;
  owner_mobile: string | null;
  start_date: string;
  estimated_end_date: string | null;
  actual_end_date: string | null;
  status: ProjectStatus;
  completion_rate: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  assignee_id: string | null;
  assignee_name: string | null;
  assignee_email: string | null;
  assignee_mobile: string | null;
  status: TaskStatus;
  completion_percentage: number;
  start_date: string | null;
  due_date: string | null;
  order_index: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  task_id: string;
  author_id: string | null;
  parent_id: string | null;
  body: string;
  created_at: string;
  author?: Pick<UserProfile, 'id' | 'full_name' | 'email' | 'avatar_url'>;
}

export interface Notification {
  id: string;
  user_id: string;
  kind: 'task_assigned' | 'deadline_near' | 'overdue' | 'new_comment' | 'project_update';
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

export interface ActivityItem {
  id: string;
  actor_id: string | null;
  entity_type: 'project' | 'task' | 'comment';
  entity_id: string;
  action: string;
  meta: Record<string, unknown> | null;
  created_at: string;
}

// Minimal Database type for typed supabase-js
export type Database = {
  public: {
    Tables: {
      users: {
        Row: UserProfile;
        Insert: Partial<UserProfile> & Pick<UserProfile, 'id' | 'email'>;
        Update: Partial<UserProfile>;
      };
      projects: {
        Row: Project;
        Insert: Partial<Project> & Pick<Project, 'name'>;
        Update: Partial<Project>;
      };
      tasks: {
        Row: Task;
        Insert: Partial<Task> & Pick<Task, 'project_id' | 'title'>;
        Update: Partial<Task>;
      };
      comments: {
        Row: Comment;
        Insert: Partial<Comment> & Pick<Comment, 'task_id' | 'body'>;
        Update: Partial<Comment>;
      };
      notifications: {
        Row: Notification;
        Insert: Partial<Notification> & Pick<Notification, 'user_id' | 'kind' | 'title'>;
        Update: Partial<Notification>;
      };
      activity_log: {
        Row: ActivityItem;
        Insert: Partial<ActivityItem> & Pick<ActivityItem, 'entity_type' | 'entity_id' | 'action'>;
        Update: Partial<ActivityItem>;
      };
    };
  };
};
