
export type UserRole = 'user' | 'admin';

export interface Profile {
  id: string;
  username: string;
  display_name?: string;
  role: UserRole;
  avatar_url?: string;
  banned?: boolean;
  is_online?: boolean;
  last_seen?: string;
  warnings?: number;
  admin_notes?: string;
  latitude?: number;
  longitude?: number;
  provider_id?: string;
  created_at?: string;
  can_edit_profile?: boolean;
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
