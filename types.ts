
export type UserRole = 'user' | 'admin';

export interface Profile {
  id: string;
  username: string;
  role: UserRole;
  avatar_url?: string;
}

export interface Post {
  id: number;
  title: string;
  content: string;
  media_url: string;
  media_type: 'image' | 'video' | 'file';
  created_at: string;
}

export interface NavLink {
  label: string;
  path: string;
  restricted?: boolean;
  adminOnly?: boolean;
}

export interface SiteSetting {
  key: string;
  value: string;
  type: 'image' | 'video';
}
