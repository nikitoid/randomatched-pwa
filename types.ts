
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

// History & Stats Types
export interface MatchPlayer {
  name: string;
  heroId: string;
  heroName: string;
}

export interface MatchRecord {
  id: string;
  timestamp: number;
  lastUpdated: number;
  team1: MatchPlayer[]; // 'Odd' team
  team2: MatchPlayer[]; // 'Even' team
  winner: 'team1' | 'team2' | null; // Removed 'draw'
  note?: string;
}

export interface PlayerStat {
  name: string;
  matches: number;
  wins: number;
  losses: number;
  heroesPlayed: Record<string, number>;
  score: number; // Weighted score for MVP calculation
}

export interface HeroStat {
  name: string;
  matches: number;
  wins: number;
  losses: number;
}
