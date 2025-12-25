
export enum UserStatus {
  WAITING = 'WAITING',
  ACCEPTED = 'ACCEPTED'
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  status: UserStatus;
  joinedAt: number;
}

export interface Winner {
  userId: string;
  userName: string;
  displayName?: string;
  date: number;
  prize?: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: number;
  isAdmin?: boolean;
}

export type GameState = 'IDLE' | 'SPINNING' | 'FINISHED';

export type Language = 'fr' | 'en';
