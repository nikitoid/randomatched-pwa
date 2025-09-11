export interface Hero {
  id: string;
  name: string;
}

export interface HeroList {
  id: string;
  name: string;
  heroes: Hero[];
}

export interface GenerationResult {
  teams: Hero[][];
  timestamp: number;
}