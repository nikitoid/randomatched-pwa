
export interface Hero {
  id: string;
  name: string;
  rank: string;
}

export interface HeroList {
  id: string;
  name: string;
  heroes: Hero[];
  isLocal: boolean;
  isCloud?: boolean;
  isTemporary?: boolean;
  isGroupable?: boolean;
  lastModified?: number;
}

export interface AssignedPlayer {
  playerNumber: number;
  hero: Hero | null; // Hero object or null if not yet revealed/assigned
  position: 'top' | 'bottom' | 'left' | 'right';
  team: 'Even' | 'Odd';
}

export interface GenerationResult {
  assignments: AssignedPlayer[];
  timestamp: number;
}

export type ToastType = 'info' | 'success' | 'error' | 'warning';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

export type GenerationMode = 'random' | 'balanced' | 'strict';

export type ColorScheme = 'indigo' | 'emerald' | 'rose' | 'amber' | 'violet' | 'sky';
