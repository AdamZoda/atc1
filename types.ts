
export type UserRole = 'user' | 'admin';

export interface Profile {
  id: string;
  username: string;
  role: UserRole;
  avatar_url?: string;
  banned?: boolean;
  latitude?: number;
  longitude?: number;
  provider_id?: string;
}

export interface Post {
  id: number;
  title: string;
  content: string;
  media_url: string;
  media_type: 'image' | 'video' | 'file';
  created_at: string;
  created_by?: string;
}

export interface Comment {
  id: number;
  post_id: number;
  user_id: string;
  content: string;
  created_at: string;
  username?: string;
  avatar_url?: string;
}

export interface NavLink {
  label: string;
  path: string;
  restricted?: boolean;
  adminOnly?: boolean;
  visible?: boolean;
}

export interface SiteSetting {
  key: string;
  value: string;
  type: 'image' | 'video';
}

export interface RuleCategory {
  id: number;
  name: string;
  description?: string;
  created_at: string;
}

export interface Rule {
  id: number;
  category_id: number;
  title: string;
  content: string;
  order: number;
  created_at: string;
}
