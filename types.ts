
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

export type ColorScheme = 'indigo' | 'emerald' | 'rose' | 'amber' | 'violet' | 'sky' | 'slate' | 'forest' | 'cyberpunk' | 'sunset';

export type ThemeRoundness = 'sharp' | 'medium' | 'full';

export interface AppearanceSettings {
  colorScheme: ColorScheme;
  roundness: ThemeRoundness;
  bgPattern: boolean;
}

// History & Stats Types
export interface MatchPlayer {
  name: string;
  heroId: string;
  heroName: string;
  kills?: number; // Новое поле для статистики убийств
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

// Assuming ResultOverlayProps is a new interface to be added,
// or an existing one that was not provided in the original content.
// Based on the instruction and the provided code snippet,
// I will add a new interface `ResultOverlayProps` with the specified properties.
export interface ResultOverlayProps {
  onRecordResult?: (winner: 'team1' | 'team2', playerKills?: Record<string, number>) => void;
  onManualSelect?: (playerNumber: number, hero: any) => void;
  availableHeroes?: any[];
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

export interface CloudBackup {
  id: string;
  createdAt: number;
  matchCount: number;
  history: MatchRecord[];
  deletedHistory: MatchRecord[];
}
