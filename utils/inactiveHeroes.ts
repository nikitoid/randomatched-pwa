import { Hero, HeroList, MatchRecord } from '../types';

export type InactivityCriterion = 'matches' | 'days' | 'top_inactive';

export interface InactiveHeroItem {
  hero: Hero;
  matchesAgo: number; // Number of app matches since last played (0 = played in last match, Infinity = never played)
  daysAgo: number; // Days elapsed since last played (Infinity = never played)
  lastMatchTimestamp: number; // Timestamp of last match (0 = never played)
  totalMatchesPlayed: number; // Total games played in history
  neverPlayed: boolean;
}

export interface InactiveHeroesFilterOptions {
  criterion: InactivityCriterion;
  depthMatches: number; // e.g., not played in last 10, 20, 50 matches
  depthDays: number; // e.g., not played in last 14, 30, 60 days
  limit: number; // max heroes to return (0 = all matching)
  includeNeverPlayed: boolean;
  sourceListId: string; // 'all' or specific HeroList id
}

/**
 * Calculates inactivity metrics for a given set of heroes against match history.
 */
export const calculateHeroesInactivity = (
  heroes: Hero[],
  history: MatchRecord[],
  now: number = Date.now()
): InactiveHeroItem[] => {
  if (!heroes || heroes.length === 0) return [];

  const totalHistoryMatches = history.length;

  // Sort history by timestamp ascending to calculate exact matchesAgo accurately.
  const sortedHistory = [...history].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

  const heroStatsMap = new Map<string, { lastMatchIndex: number; lastTimestamp: number; totalCount: number }>();

  sortedHistory.forEach((match, matchIndex) => {
    const matchTimestamp = match.timestamp || now;
    const processHeroName = (name: string) => {
      const norm = name.trim().toLowerCase();
      if (!norm) return;
      const existing = heroStatsMap.get(norm);
      if (existing) {
        existing.lastMatchIndex = matchIndex;
        existing.lastTimestamp = Math.max(existing.lastTimestamp, matchTimestamp);
        existing.totalCount += 1;
      } else {
        heroStatsMap.set(norm, {
          lastMatchIndex: matchIndex,
          lastTimestamp: matchTimestamp,
          totalCount: 1
        });
      }
    };

    match.team1.forEach(p => processHeroName(p.heroName));
    match.team2.forEach(p => processHeroName(p.heroName));
  });

  const MS_PER_DAY = 1000 * 60 * 60 * 24;

  return heroes.map(hero => {
    const norm = hero.name.trim().toLowerCase();
    const stats = heroStatsMap.get(norm);

    if (!stats) {
      return {
        hero,
        matchesAgo: Infinity,
        daysAgo: Infinity,
        lastMatchTimestamp: 0,
        totalMatchesPlayed: 0,
        neverPlayed: true
      };
    }

    const matchesAgo = totalHistoryMatches - 1 - stats.lastMatchIndex;
    const daysAgo = Math.max(0, Math.floor((now - stats.lastTimestamp) / MS_PER_DAY));

    return {
      hero,
      matchesAgo,
      daysAgo,
      lastMatchTimestamp: stats.lastTimestamp,
      totalMatchesPlayed: stats.totalCount,
      neverPlayed: false
    };
  });
};

/**
 * Filters and sorts inactive hero items based on user criteria.
 */
export const getFilteredInactiveHeroes = (
  allInactiveItems: InactiveHeroItem[],
  options: InactiveHeroesFilterOptions
): InactiveHeroItem[] => {
  const { criterion, depthMatches, depthDays, limit, includeNeverPlayed } = options;

  let filtered = allInactiveItems.filter(item => {
    if (item.neverPlayed) {
      return includeNeverPlayed;
    }

    if (criterion === 'matches') {
      return item.matchesAgo >= depthMatches;
    } else if (criterion === 'days') {
      return item.daysAgo >= depthDays;
    } else {
      // top_inactive: include all played heroes for sorting
      return true;
    }
  });

  // Sort: most inactive first
  filtered.sort((a, b) => {
    // 1. Never played comes first
    if (a.neverPlayed !== b.neverPlayed) {
      return a.neverPlayed ? -1 : 1;
    }
    // 2. Older lastMatchTimestamp first
    if (a.lastMatchTimestamp !== b.lastMatchTimestamp) {
      return a.lastMatchTimestamp - b.lastMatchTimestamp;
    }
    // 3. Alphabetical tie-break
    return a.hero.name.localeCompare(b.hero.name);
  });

  if (limit > 0 && filtered.length > limit) {
    filtered = filtered.slice(0, limit);
  }

  return filtered;
};

/**
 * Collects all unique heroes across lists or from a specific list.
 */
export const getSourceHeroesForInactiveFilter = (
  lists: HeroList[],
  sourceListId: string
): Hero[] => {
  if (sourceListId !== 'all') {
    const target = lists.find(l => l.id === sourceListId);
    return target ? target.heroes.filter(h => h.name.trim() !== '') : [];
  }

  // Merge unique heroes by name from all non-temporary (or all) lists
  const heroMap = new Map<string, Hero>();
  lists.forEach(list => {
    list.heroes.forEach(hero => {
      const norm = hero.name.trim().toLowerCase();
      if (norm && !heroMap.has(norm)) {
        heroMap.set(norm, hero);
      }
    });
  });

  return Array.from(heroMap.values());
};
