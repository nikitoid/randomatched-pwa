import { Hero } from '../types';
import { RANK_VALUES } from '../constants';

/**
 * Корректное склонение русских существительных по числу:
 * getPlural(0, 'матч', 'матча', 'матчей') => 'матчей'
 * getPlural(1, 'матч', 'матча', 'матчей') => 'матч'
 * getPlural(2, 'матч', 'матча', 'матчей') => 'матча'
 * getPlural(5, 'матч', 'матча', 'матчей') => 'матчей'
 * getPlural(21, 'матч', 'матча', 'матчей') => 'матч'
 */
export function getPlural(count: number, one: string, few: string, many: string): string {
  const abs = Math.abs(Math.floor(count)) % 100;
  const num = abs % 10;
  if (abs >= 11 && abs <= 19) return many;
  if (num >= 2 && num <= 4) return few;
  if (num === 1) return one;
  return many;
}

export function formatPlural(count: number, one: string, few: string, many: string): string {
  return `${count} ${getPlural(count, one, few, many)}`;
}

// Popular hero aliases / synonyms for tabletop games (e.g., Unmatched / Marvel / Fantasy)
export const KNOWN_HERO_ALIASES: Record<string, string[]> = {
  'геральт': ['геральт из ривии', 'ведьмак', 'geralt', 'geralt of rivia'],
  'красная шапочка': ['шапочка', 'красная шапка', 'red riding hood', 'little red'],
  'человек-паук': ['человек паук', 'спайдермен', 'spider-man', 'spiderman', 'спайдер-мен', 'спайдер мен'],
  'доктор стрэндж': ['доктор стрендж', 'д-р стрэндж', 'д-р стрендж', 'dr strange', 'dr. strange', 'doctor strange'],
  'граф дракула': ['дракула', 'dracula'],
  'король артур': ['артур', 'king arthur'],
  'шерлок холмс': ['холмс', 'шерлок', 'sherlock', 'sherlock holmes'],
  'алиса': ['алиса в стране чудес', 'alice', 'alice in wonderland'],
  'бигфут': ['йети', 'снежный человек', 'bigfoot', 'сасквоч'],
  'робин гуд': ['робин', 'robin hood'],
  'невидимка': ['человек-невидимка', 'человек невидимка', 'invisible man'],
  'медуза': ['медуза горгона', 'горгона', 'medusa'],
  'кровавая мэри': ['кровавая мери', 'bloody mary'],
  'сунь укун': ['царь обезьян', 'sun wukong'],
  'ахиллес': ['ахилл', 'achilles'],
  'синдбад': ['синдбад-мореход', 'синдбад мореход', 'sinbad'],
  'никола тесла': ['тесла', 'nikola tesla'],
  'гарри гудини': ['гудини', 'houdini', 'harry houdini', 'гуддини', 'гарри гуддини'],
  'ти-рекс': ['тирекс', 't-rex', 'тираннозавр', 't rex'],
  'двуликий': ['двуликий (харви дент)', 'two-face', 'two face'],
  'супермен': ['супермэн', 'superman'],
  'бэтмен': ['бэтмэн', 'batman'],
  'черная пантера': ['чёрная пантера', 'black panther'],
  'лунный рыцарь': ['moon knight'],
  'люк скайуокер': ['люк скайвокер', 'luke skywalker'],
  'дарт вейдер': ['дарт вэйдер', 'darth vader'],
  'трисс и йеннифер': ['трисс&йеннифер', 'трисс & йеннифер', 'трисс + йеннифер', 'трисс/йеннифер', 'йеннифер и трисс', 'йеннифер & трисс', 'йеннифер&трисс', 'трисс и йен', 'йен и трисс'],
  'плащ и кинжал': ['плащ & кинжал', 'плащ&кинжал', 'плащ+кинжал', 'кинжал и плащ', 'cloak and dagger', 'cloak & dagger'],
  'розан и джилл': ['розан & джилл', 'розан&джилл', 'джилл и розан', 'джилл & розан'],
  'росомаха': ['wolverine', 'логан'],
  'сорвиголова': ['daredevil'],
  'каратель': ['punisher'],
  'дэдпул': ['дедпул', 'deadpool'],
  'соколиный глаз': ['хоукай', 'hawkeye'],
  'черная вдова': ['чёрная вдова', 'black widow', 'наташа романофф']
};

// Pre-compute normalized alias lookup map at module load time for O(1) alias checking
const ALIAS_LOOKUP_MAP = new Map<string, number>();

/**
 * Creates a normalized search key for hero matching:
 * - Trims whitespace
 * - Converts to lower case
 * - Replaces 'ё' with 'е'
 * - Normalizes conjunctions and connectors (&, +, /, 'and') to standard ' и '
 * - Normalizes various dashes (—, –, -) to a single hyphen and removes surrounding spaces
 * - Removes extra punctuation (quotes, brackets)
 * - Collapses multiple spaces into one
 */
export const normalizeHeroKey = (name: string): string => {
  if (!name) return '';

  return name
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[«»""'']/g, '') // remove quotes
    .replace(/\s*[\u2010\u2011\u2012\u2013\u2014\u2015-]\s*/g, '-') // unify dashes with or without spaces
    .replace(/\s*&\s*/g, ' и ') // standardize ampersand & to ' и '
    .replace(/\s*\+\s*/g, ' и ') // standardize plus + to ' и '
    .replace(/\s*\/\s*/g, ' и ') // standardize slash / to ' и '
    .replace(/\band\b/gi, ' и ') // standardize English 'and' to ' и '
    .replace(/[.,#!$%^*;:{}=\_`~()\[\]]/g, ' ') // remove other special chars
    .replace(/\s+/g, ' ') // collapse spaces
    .trim();
};

// Initialize alias lookup map once
(() => {
  let clusterId = 1;
  for (const [canonical, aliases] of Object.entries(KNOWN_HERO_ALIASES)) {
    const normCanonical = normalizeHeroKey(canonical);
    if (normCanonical) {
      ALIAS_LOOKUP_MAP.set(normCanonical, clusterId);
    }
    for (const alias of aliases) {
      const normAlias = normalizeHeroKey(alias);
      if (normAlias) {
        ALIAS_LOOKUP_MAP.set(normAlias, clusterId);
      }
    }
    clusterId++;
  }
})();

/**
 * Calculates the Levenshtein Distance between two normalized strings.
 * Uses 2 flat Int32 arrays to prevent heap churn.
 */
export const getLevenshteinDistanceNormalized = (normA: string, normB: string): number => {
  if (normA === normB) return 0;
  const lenA = normA.length;
  const lenB = normB.length;
  if (lenA === 0) return lenB;
  if (lenB === 0) return lenA;

  const lenDiff = Math.abs(lenA - lenB);
  if (lenDiff > 2) return lenDiff;

  let prevRow = new Int32Array(lenA + 1);
  let currRow = new Int32Array(lenA + 1);

  for (let j = 0; j <= lenA; j++) {
    prevRow[j] = j;
  }

  for (let i = 1; i <= lenB; i++) {
    currRow[0] = i;
    const charB = normB.charCodeAt(i - 1);
    for (let j = 1; j <= lenA; j++) {
      const cost = normA.charCodeAt(j - 1) === charB ? 0 : 1;
      currRow[j] = Math.min(
        prevRow[j] + 1,       // deletion
        currRow[j - 1] + 1,   // insertion
        prevRow[j - 1] + cost // substitution
      );
    }
    const temp = prevRow;
    prevRow = currRow;
    currRow = temp;
  }

  return prevRow[lenA];
};

/**
 * Calculates the Levenshtein Distance between two strings.
 */
export const getLevenshteinDistance = (a: string, b: string): number => {
  return getLevenshteinDistanceNormalized(normalizeHeroKey(a), normalizeHeroKey(b));
};

/**
 * Checks if two hero names are aliases according to KNOWN_HERO_ALIASES.
 * Uses O(1) Map lookup.
 */
export const areAliases = (nameA: string, nameB: string): boolean => {
  const normA = normalizeHeroKey(nameA);
  const normB = normalizeHeroKey(nameB);

  if (!normA || !normB) return false;
  if (normA === normB) return true;

  const idA = ALIAS_LOOKUP_MAP.get(normA);
  const idB = ALIAS_LOOKUP_MAP.get(normB);
  return idA !== undefined && idA === idB;
};

/**
 * Compares two hero names and determines if they represent the same hero.
 */
export const areHeroNamesSimilar = (
  nameA: string,
  nameB: string
): { isSimilar: boolean; reason?: 'exact_normalized' | 'typo' | 'alias' } => {
  const normA = normalizeHeroKey(nameA);
  const normB = normalizeHeroKey(nameB);

  if (!normA || !normB) return { isSimilar: false };

  // 1. Exact normalized match
  if (normA === normB) {
    return { isSimilar: true, reason: 'exact_normalized' };
  }

  // 2. Known aliases O(1)
  const idA = ALIAS_LOOKUP_MAP.get(normA);
  const idB = ALIAS_LOOKUP_MAP.get(normB);
  if (idA !== undefined && idA === idB) {
    return { isSimilar: true, reason: 'alias' };
  }

  // 3. Word permutation check for duo / multi-hero names
  const meaningfulWordsA = normA.split(/\s+/).filter(w => w !== 'и' && w !== '-');
  const meaningfulWordsB = normB.split(/\s+/).filter(w => w !== 'и' && w !== '-');
  if (
    meaningfulWordsA.length > 1 &&
    meaningfulWordsA.length === meaningfulWordsB.length &&
    meaningfulWordsA.slice().sort().join(' ') === meaningfulWordsB.slice().sort().join(' ')
  ) {
    return { isSimilar: true, reason: 'alias' };
  }

  // 4. Check for distinct numbered or rank-suffixed variants
  const wordsA = normA.split(/\s+/).filter(Boolean);
  const wordsB = normB.split(/\s+/).filter(Boolean);

  if (wordsA.length > 1 && wordsB.length > 1 && wordsA.length === wordsB.length) {
    const prefixA = wordsA.slice(0, -1).join(' ');
    const prefixB = wordsB.slice(0, -1).join(' ');

    if (prefixA === prefixB) {
      const lastA = wordsA[wordsA.length - 1];
      const lastB = wordsB[wordsB.length - 1];

      const isDigitA = /^\d+$/.test(lastA);
      const isDigitB = /^\d+$/.test(lastB);
      const isShortSuffix = (lastA.length <= 2 && lastB.length <= 2);
      const isRankLike = /^[sabcdef][+-]?$/i.test(lastA) || /^[sabcdef][+-]?$/i.test(lastB);

      if (isDigitA || isDigitB || isShortSuffix || isRankLike) {
        return { isSimilar: false };
      }
    }
  }

  // Check if one name is a prefix with sequel/part number
  const longer = normA.length > normB.length ? normA : normB;
  const shorter = normA.length > normB.length ? normB : normA;
  if (longer.startsWith(shorter)) {
    const remainder = longer.slice(shorter.length).trim();
    if (/^\d+$/.test(remainder) || /^[ivx]+$/i.test(remainder) || remainder === 'младший' || remainder === 'старший') {
      return { isSimilar: false };
    }
  }

  // 5. Typo check via fast Levenshtein
  const minLen = Math.min(normA.length, normB.length);
  const maxLen = Math.max(normA.length, normB.length);

  if (minLen >= 4 && Math.abs(normA.length - normB.length) <= 2) {
    const dist = getLevenshteinDistanceNormalized(normA, normB);
    if (minLen <= 6 && dist <= 1) {
      return { isSimilar: true, reason: 'typo' };
    }
    if (minLen > 6 && dist <= 2) {
      const similarity = 1 - dist / maxLen;
      if (similarity >= 0.8) {
        return { isSimilar: true, reason: 'typo' };
      }
    }
  }

  return { isSimilar: false };
};

/**
 * Determines the best presentation name among multiple raw variations of the same hero.
 * Gives preference to Title Cased strings over ALL CAPS or all lowercase,
 * and breaks ties by frequency.
 */
export const getBestCanonicalDisplayName = (variants: string[]): string => {
  if (!variants || variants.length === 0) return '';
  if (variants.length === 1) return variants[0].trim();

  // Count frequencies
  const counts = new Map<string, number>();
  for (const v of variants) {
    const trimmed = v.trim();
    if (trimmed) {
      counts.set(trimmed, (counts.get(trimmed) || 0) + 1);
    }
  }

  const entries = Array.from(counts.entries());
  if (entries.length === 0) return variants[0];

  // Score each candidate:
  // - Title Casing ("Красная Шапочка" or "Красная шапочка") is preferred over "КРАСНАЯ ШАПОЧКА"
  // - First letter uppercase is good
  // - Higher count is better
  const scoreCandidate = (str: string, count: number): number => {
    let score = count * 10;
    const isAllUpper = str === str.toUpperCase() && str.length > 2;
    const isAllLower = str === str.toLowerCase();

    if (isAllUpper) score -= 15;
    else if (isAllLower) score -= 5;
    else {
      // Has some uppercase, which is normal for names
      score += 5;
      // Capitalized first letter of words
      const words = str.split(/[\s-]+/);
      const capWords = words.filter(w => w.length > 0 && w[0] === w[0].toUpperCase());
      score += capWords.length * 2;
    }

    return score;
  };

  entries.sort((a, b) => scoreCandidate(b[0], b[1]) - scoreCandidate(a[0], a[1]));

  return entries[0][0];
};

export interface DuplicateGroup {
  primaryName: string;
  duplicateNames: string[];
  reason: 'exact_normalized' | 'typo' | 'alias';
}

export const MERGE_IGNORED_GROUPS_KEY = 'randomatched_merge_ignored_groups';

export interface IgnoredMergeGroup {
  id: string;
  names: string[];
  createdAt: number;
}

export const getIgnoredMergeGroups = (): IgnoredMergeGroup[] => {
  try {
    const raw = localStorage.getItem(MERGE_IGNORED_GROUPS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
};

export const addIgnoredMergeGroup = (names: string[]): IgnoredMergeGroup[] => {
  const current = getIgnoredMergeGroups();
  const cleanNames = Array.from(new Set(names.map(n => n.trim()).filter(Boolean)));
  if (cleanNames.length < 2) return current;

  // Check if identical set of names is already ignored
  const normalizedKey = cleanNames.map(normalizeHeroKey).sort().join(':::');
  const exists = current.some(g => g.names.map(normalizeHeroKey).sort().join(':::') === normalizedKey);
  if (exists) return current;

  const newItem: IgnoredMergeGroup = {
    id: 'ign_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    names: cleanNames,
    createdAt: Date.now()
  };

  const updated = [newItem, ...current];
  try {
    localStorage.setItem(MERGE_IGNORED_GROUPS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save ignored merge groups to localStorage', e);
  }
  return updated;
};

export const removeIgnoredMergeGroup = (id: string): IgnoredMergeGroup[] => {
  const current = getIgnoredMergeGroups();
  const updated = current.filter(g => g.id !== id);
  try {
    localStorage.setItem(MERGE_IGNORED_GROUPS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to remove ignored merge group from localStorage', e);
  }
  return updated;
};

export const clearAllIgnoredMergeGroups = (): void => {
  try {
    localStorage.removeItem(MERGE_IGNORED_GROUPS_KEY);
  } catch (e) {
    console.error('Failed to clear ignored merge groups from localStorage', e);
  }
};

/**
 * Finds all groups of duplicate or suspicious similar names in a list of hero names.
 * Highly optimized with pre-normalization and early exit filters.
 * Excludes user-ignored groups.
 */
export const findDuplicateOrSimilarHeroGroups = (
  heroNames: string[],
  ignoredGroups?: IgnoredMergeGroup[]
): DuplicateGroup[] => {
  const uniqueNames = Array.from(new Set(heroNames.map(n => n.trim()).filter(Boolean)));
  if (uniqueNames.length < 2) return [];

  const ignoredList = ignoredGroups !== undefined ? ignoredGroups : getIgnoredMergeGroups();
  const ignoredPairSet = new Set<string>();
  for (const group of ignoredList) {
    const normNames = group.names.map(normalizeHeroKey).filter(Boolean);
    for (let i = 0; i < normNames.length; i++) {
      for (let j = i + 1; j < normNames.length; j++) {
        ignoredPairSet.add([normNames[i], normNames[j]].sort().join(':::'));
      }
    }
  }

  // Pre-normalize all names once
  const items = uniqueNames.map(raw => {
    const norm = normalizeHeroKey(raw);
    return {
      raw,
      norm,
      len: norm.length
    };
  });

  const visited = new Set<number>();
  const groups: DuplicateGroup[] = [];

  for (let i = 0; i < items.length; i++) {
    if (visited.has(i)) continue;

    const itemA = items[i];
    const cluster: string[] = [itemA.raw];
    let dominantReason: 'exact_normalized' | 'typo' | 'alias' = 'exact_normalized';

    for (let j = i + 1; j < items.length; j++) {
      if (visited.has(j)) continue;

      const itemB = items[j];

      // Check if this pair is in the user's ignored exceptions list
      const pairKey = [itemA.norm, itemB.norm].sort().join(':::');
      if (ignoredPairSet.has(pairKey)) {
        continue;
      }

      // Fast check on already pre-normalized strings
      if (itemA.norm === itemB.norm) {
        cluster.push(itemB.raw);
        visited.add(j);
        continue;
      }

      const check = areHeroNamesSimilar(itemA.raw, itemB.raw);
      if (check.isSimilar && check.reason) {
        cluster.push(itemB.raw);
        visited.add(j);
        if (check.reason === 'alias') dominantReason = 'alias';
        else if (check.reason === 'typo' && dominantReason !== 'alias') dominantReason = 'typo';
      }
    }

    if (cluster.length > 1) {
      visited.add(i);
      const primary = getBestCanonicalDisplayName(cluster);
      const duplicates = cluster.filter(n => n !== primary);
      groups.push({
        primaryName: primary,
        duplicateNames: duplicates,
        reason: dominantReason
      });
    }
  }

  return groups;
};

/**
 * Merges a single target hero name with its source variants within a list of heroes.
 * Unifies names and preserves the highest rank among merged rows.
 */
export const mergeHeroInList = (
  heroes: Hero[],
  targetHeroName: string,
  sourceHeroNames: string[]
): { heroes: Hero[]; changed: boolean } => {
  const cleanTarget = targetHeroName.trim();
  const cleanSources = sourceHeroNames.map(s => s.trim()).filter(s => s && s !== cleanTarget);
  if (!cleanTarget || cleanSources.length === 0) {
    return { heroes, changed: false };
  }

  const sourceNormKeys = new Set(cleanSources.map(s => normalizeHeroKey(s)));
  const targetNormKey = normalizeHeroKey(cleanTarget);
  let changed = false;

  const heroesMap = new Map<string, Hero>();

  heroes.forEach(hero => {
    const heroName = (hero.name || '').trim();
    if (!heroName) return;

    const heroNormKey = normalizeHeroKey(heroName);
    const isSource = sourceNormKeys.has(heroNormKey);
    const isTarget = heroNormKey === targetNormKey;

    if (isSource) {
      changed = true;
      const updatedHero: Hero = { ...hero, name: cleanTarget };
      if (!heroesMap.has(targetNormKey)) {
        heroesMap.set(targetNormKey, updatedHero);
      } else {
        const existing = heroesMap.get(targetNormKey)!;
        const existingRankVal = RANK_VALUES[existing.rank] || 0;
        const currentRankVal = RANK_VALUES[hero.rank] || 0;
        if (currentRankVal > existingRankVal || (!existing.rank && hero.rank)) {
          existing.rank = hero.rank;
        }
      }
    } else if (isTarget) {
      if (hero.name !== cleanTarget) {
        changed = true;
      }
      const updatedHero: Hero = { ...hero, name: cleanTarget };
      if (!heroesMap.has(targetNormKey)) {
        heroesMap.set(targetNormKey, updatedHero);
      } else {
        const existing = heroesMap.get(targetNormKey)!;
        const existingRankVal = RANK_VALUES[existing.rank] || 0;
        const currentRankVal = RANK_VALUES[hero.rank] || 0;
        if (currentRankVal > existingRankVal || (!existing.rank && hero.rank)) {
          existing.rank = hero.rank;
        }
      }
    } else {
      if (!heroesMap.has(heroNormKey)) {
        heroesMap.set(heroNormKey, hero);
      }
    }
  });

  return {
    heroes: Array.from(heroesMap.values()),
    changed
  };
};

/**
 * Resolves multiple duplicate mappings across a hero list.
 */
export const mergeDuplicateHeroList = (
  originalHeroes: Hero[],
  duplicateToPrimary: Record<string, string>
): Hero[] => {
  const mergedMap = new Map<string, Hero>();

  originalHeroes.forEach(hero => {
    const heroName = hero.name.trim();
    if (!heroName) return;

    const canonicalTarget = duplicateToPrimary[heroName] || heroName;
    const targetKey = normalizeHeroKey(canonicalTarget);

    if (!mergedMap.has(targetKey)) {
      mergedMap.set(targetKey, {
        ...hero,
        name: canonicalTarget
      });
    } else {
      const existing = mergedMap.get(targetKey)!;
      const existingRankVal = RANK_VALUES[existing.rank] || 0;
      const currentRankVal = RANK_VALUES[hero.rank] || 0;
      if (currentRankVal > existingRankVal || (!existing.rank && hero.rank)) {
        existing.rank = hero.rank;
      }
    }
  });

  return Array.from(mergedMap.values());
};
