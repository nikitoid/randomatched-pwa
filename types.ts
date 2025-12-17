export interface HeroList {
  id: string;
  name: string;
  heroes: string[];
  isLocal: boolean;
  lastModified?: number;
}

export interface AssignedPlayer {
  playerNumber: number;
  hero: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  team: 'Even' | 'Odd';
}

export interface GenerationResult {
  assignments: AssignedPlayer[];
  timestamp: number;
}