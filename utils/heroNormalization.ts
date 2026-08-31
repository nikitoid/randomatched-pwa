import { Hero } from '../types';
import { RANK_VALUES } from '../constants';

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
  'гарри гудини': ['гудини', 'houdini', 'harry houdini'],
  'ти-рекс': ['тирекс', 't-rex', 'тираннозавр', 't rex'],
  'двуликий': ['двуликий (харви дент)', 'two-face', 'two face'],
  'супермен': ['супермэн', 'superman'],
  'бэтмен': ['бэтмэн', 'batman'],
  'черная пантера': ['чёрная пантера', 'black panther'],
  'лунный рыцарь': ['moon knight'],
  'люк скайуокер': ['люк скайвокер', 'luke skywalker'],
  'дарт вейдер': ['дарт вэйдер', 'darth vader'],
};

/**
 * Creates a normalized search key for hero matching:
 * - Trims whitespace
 * - Converts to lower case
 * - Replaces 'ё' with 'е'
 * - Normalizes various dashes (—, –, -) to a single hyphen and removes surrounding spaces ('Человек - Паук' -> 'человек-паук')
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
    .replace(/[.,/#!$%^&*;:{}=\_`~()]/g, ' ') // remove other special chars
    .replace(/\s+/g, ' ') // collapse spaces
    .trim();
};

/**
 * Calculates the Levenshtein Distance between two strings.
 */
export const getLevenshteinDistance = (a: string, b: string): number => {
  const normA = normalizeHeroKey(a);
  const normB = normalizeHeroKey(b);

  if (normA === normB) return 0;
  if (normA.length === 0) return normB.length;
  if (normB.length === 0) return normA.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= normB.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= normA.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= normB.length; i++) {
    for (let j = 1; j <= normA.length; j++) {
      if (normB.charAt(i - 1) === normA.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[normB.length][normA.length];
};

/**
 * Checks if two hero names are aliases according to KNOWN_HERO_ALIASES.
 */
export const areAliases = (nameA: string, nameB: string): boolean => {
  const normA = normalizeHeroKey(nameA);
  const normB = normalizeHeroKey(nameB);

  if (!normA || !normB) return false;
  if (normA === normB) return true;

  for (const [canonical, aliases] of Object.entries(KNOWN_HERO_ALIASES)) {
    const allGroup = [canonical, ...aliases].map(normalizeHeroKey);
    if (allGroup.includes(normA) && allGroup.includes(normB)) {
      return true;
    }
  }

  return false;
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

  // 1. Exact normalized match (e.g., case differences, 'ё' vs 'е', spaces)
  if (normA === normB) {
    return { isSimilar: true, reason: 'exact_normalized' };
  }

  // 2. Known aliases
  if (areAliases(nameA, nameB)) {
    return { isSimilar: true, reason: 'alias' };
  }

  // 3. Check for distinct numbered or rank-suffixed variants (e.g. "Герой S+" vs "Герой S-", "Бот 1" vs "Бот 2")
  const wordsA = normA.split(/\s+/).filter(Boolean);
  const wordsB = normB.split(/\s+/).filter(Boolean);

  if (wordsA.length > 1 && wordsB.length > 1 && wordsA.length === wordsB.length) {
    const prefixA = wordsA.slice(0, -1).join(' ');
    const prefixB = wordsB.slice(0, -1).join(' ');

    if (prefixA === prefixB) {
      const lastA = wordsA[wordsA.length - 1];
      const lastB = wordsB[wordsB.length - 1];

      // If trailing tokens are different single chars, digits, or rank markers, they are distinct entities
      const isDigitA = /^\d+$/.test(lastA);
      const isDigitB = /^\d+$/.test(lastB);
      const isShortSuffix = (lastA.length <= 2 && lastB.length <= 2);
      const isRankLike = /^[sabcdef][+-]?$/i.test(lastA) || /^[sabcdef][+-]?$/i.test(lastB);

      if (isDigitA || isDigitB || isShortSuffix || isRankLike) {
        return { isSimilar: false };
      }
    }
  }

  // Check if one name is a prefix with sequel/part number (e.g. "Герой" vs "Герой 2")
  const longer = normA.length > normB.length ? normA : normB;
  const shorter = normA.length > normB.length ? normB : normA;
  if (longer.startsWith(shorter)) {
    const remainder = longer.slice(shorter.length).trim();
    if (/^\d+$/.test(remainder) || /^[ivx]+$/i.test(remainder) || remainder === 'младший' || remainder === 'старший') {
      return { isSimilar: false };
    }
  }

  // 4. Typo check via Levenshtein
  // For short strings (< 4 chars), require exact match.
  // For medium strings (4-6 chars), max 1 distance.
  // For long strings (> 6 chars), max 2 distance with at least 80% similarity.
  const minLen = Math.min(normA.length, normB.length);
  const maxLen = Math.max(normA.length, normB.length);

  if (minLen >= 4) {
    const dist = getLevenshteinDistance(normA, normB);
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

/**
 * Finds all groups of duplicate or suspicious similar names in a list of hero names.
 */
export const findDuplicateOrSimilarHeroGroups = (
  heroNames: string[]
): DuplicateGroup[] => {
  const uniqueNames = Array.from(new Set(heroNames.map(n => n.trim()).filter(Boolean)));
  const visited = new Set<string>();
  const groups: DuplicateGroup[] = [];

  for (let i = 0; i < uniqueNames.length; i++) {
    const nameA = uniqueNames[i];
    if (visited.has(nameA)) continue;

    const cluster: string[] = [nameA];
    let dominantReason: 'exact_normalized' | 'typo' | 'alias' = 'exact_normalized';

    for (let j = i + 1; j < uniqueNames.length; j++) {
      const nameB = uniqueNames[j];
      if (visited.has(nameB)) continue;

      const check = areHeroNamesSimilar(nameA, nameB);
      if (check.isSimilar && check.reason) {
        cluster.push(nameB);
        visited.add(nameB);
        if (check.reason === 'alias') dominantReason = 'alias';
        else if (check.reason === 'typo' && dominantReason !== 'alias') dominantReason = 'typo';
      }
    }

    if (cluster.length > 1) {
      visited.add(nameA);
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
