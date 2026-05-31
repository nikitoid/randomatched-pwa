
import { Hero, HeroList, AssignedPlayer, GenerationMode, MatchRecord } from '../types';
import { RANK_VALUES } from '../constants';

// Helper to select a single item based on weights
export const selectWeightedSingle = <T>(
  items: T[],
  getWeight: (item: T) => number
): T => {
  if (items.length === 0) throw new Error("Empty array");
  let totalWeight = 0;
  const itemWeights = items.map(item => {
    const w = Math.max(0.01, getWeight(item));
    totalWeight += w;
    return w;
  });
  
  const r = Math.random() * totalWeight;
  let sum = 0;
  for (let i = 0; i < items.length; i++) {
    sum += itemWeights[i];
    if (sum >= r) {
      return items[i];
    }
  }
  return items[items.length - 1];
};

// Helper to select multiple unique items based on weights
export const selectWeightedUnique = <T extends { id: string }>(
  pool: T[],
  getWeight: (item: T) => number,
  count: number
): T[] => {
  const result: T[] = [];
  const candidates = [...pool];
  
  const weights = new Map<string, number>();
  candidates.forEach(c => {
    weights.set(c.id, Math.max(0.01, getWeight(c)));
  });

  const limit = Math.min(count, candidates.length);

  for (let i = 0; i < limit; i++) {
    let totalWeight = 0;
    for (const c of candidates) {
      totalWeight += weights.get(c.id) || 0.01;
    }

    if (totalWeight <= 0) {
      const randIdx = Math.floor(Math.random() * candidates.length);
      const chosen = candidates.splice(randIdx, 1)[0];
      result.push(chosen);
      continue;
    }

    const r = Math.random() * totalWeight;
    let sum = 0;
    let chosenIndex = 0;

    for (let j = 0; j < candidates.length; j++) {
      sum += weights.get(candidates[j].id) || 0.01;
      if (sum >= r) {
        chosenIndex = j;
        break;
      }
    }

    const chosen = candidates.splice(chosenIndex, 1)[0];
    result.push(chosen);
  }

  return result;
};

// Calculate hero weights based on match history
export const getHeroHistoryWeights = (
  history: MatchRecord[],
  allHeroes: Hero[],
  prioritizeUnplayed: boolean
): Map<string, number> => {
  const weights = new Map<string, number>();
  
  if (!prioritizeUnplayed || history.length === 0) {
    allHeroes.forEach(h => weights.set(h.id, 1));
    return weights;
  }

  // Динамическая глубина на основе пула героев
  const DEPTH = Math.min(
    Math.max(20, Math.floor(allHeroes.length * 1.5)),
    history.length
  );
  const lastPlayedIndices = new Map<string, number>();
  const playCounts = new Map<string, number>();

  for (let i = 0; i < DEPTH; i++) {
    const match = history[i];
    const heroIdsInMatch = new Set<string>();
    
    if (match.team1) match.team1.forEach(p => { if (p.heroId) heroIdsInMatch.add(p.heroId); });
    if (match.team2) match.team2.forEach(p => { if (p.heroId) heroIdsInMatch.add(p.heroId); });

    for (const heroId of heroIdsInMatch) {
      if (!lastPlayedIndices.has(heroId)) {
        lastPlayedIndices.set(heroId, i);
      }
      playCounts.set(heroId, (playCounts.get(heroId) || 0) + 1);
    }
  }

  allHeroes.forEach(hero => {
    const lastPlayedIndex = lastPlayedIndices.get(hero.id);
    let inactivityScore = DEPTH;

    if (lastPlayedIndex !== undefined) {
      inactivityScore = lastPlayedIndex;
    }

    // Степенная зависимость давности (1.5) для лучшего контраста
    const recencyWeight = 1 + Math.pow(inactivityScore, 1.5) * 1.5;

    // Штраф за частоту игр в анализируемом периоде
    const playCount = playCounts.get(hero.id) || 0;
    const finalWeight = recencyWeight / (1 + playCount * 0.5);

    weights.set(hero.id, finalWeight);
  });

  return weights;
};

// Helper to get weight
export const getHeroWeight = (hero: Hero | null): number => {
  if (!hero || !hero.rank) return 6; // Default middle value (C+/C-)
  const r = hero.rank.trim();
  return typeof RANK_VALUES[r] === 'number' ? RANK_VALUES[r] : 6;
};

// Helper to merge lists and remove duplicates based on name (case-insensitive)
// It prioritizes the hero (and rank) from the first list where it appears.
export const getUniqueHeroesFromLists = (lists: HeroList[]): Hero[] => {
    const uniqueMap = new Map<string, Hero>();
    
    for (const list of lists) {
        for (const hero of list.heroes) {
            const normalizedName = hero.name.trim().toLowerCase();
            if (normalizedName && !uniqueMap.has(normalizedName)) {
                uniqueMap.set(normalizedName, hero);
            }
        }
    }
    
    return Array.from(uniqueMap.values());
};

// Helper to split 4 heroes into two balanced groups (A and B)
export const getBestPermutation = (heroes: Hero[]): { groupA: Hero[], groupB: Hero[], diff: number } => {
  const permutations = [
      { a: [0, 1], b: [2, 3] },
      { a: [0, 2], b: [1, 3] },
      { a: [0, 3], b: [1, 2] },
  ];

  let bestPerm = permutations[0];
  let minDiff = Infinity;

  for (const p of permutations) {
      const wA = getHeroWeight(heroes[p.a[0]]) + getHeroWeight(heroes[p.a[1]]);
      const wB = getHeroWeight(heroes[p.b[0]]) + getHeroWeight(heroes[p.b[1]]);
      const diff = Math.abs(wA - wB);
      
      if (!isNaN(diff) && diff < minDiff) {
          minDiff = diff;
          bestPerm = p;
      }
  }
  
  if (minDiff === Infinity) minDiff = 0;

  return { 
      groupA: [heroes[bestPerm.a[0]], heroes[bestPerm.a[1]]],
      groupB: [heroes[bestPerm.b[0]], heroes[bestPerm.b[1]]],
      diff: minDiff 
  }; 
};

// Helper for Fisher-Yates Shuffle
export const shuffleArray = <T>(array: T[]): T[] => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export const generateAssignmentsWithMode = (
    lists: HeroList[], 
    mode: GenerationMode, 
    threshold: number, 
    currentAssignments: AssignedPlayer[],
    onToast?: (msg: string, type: 'warning' | 'info', duration?: number) => void,
    weights?: Map<string, number>
): AssignedPlayer[] => {
  // Use unique heroes logic to avoid duplicates across lists
  const allHeroes = getUniqueHeroesFromLists(lists);

  if (allHeroes.length < 4 || currentAssignments.length !== 4) return currentAssignments;

  let chosenHeroes: Hero[] = [];
  let newAssignments = [...currentAssignments];

  if (mode === 'random') {
      if (weights) {
          chosenHeroes = selectWeightedUnique(allHeroes, h => weights.get(h.id) || 1, 4);
      } else {
          chosenHeroes = shuffleArray(allHeroes).slice(0, 4);
      }
      newAssignments.forEach((assign, idx) => {
         newAssignments[idx] = { ...assign, hero: chosenHeroes[idx] };
      });
  } 
  else if (mode === 'balanced') {
      if (weights) {
          chosenHeroes = selectWeightedUnique(allHeroes, h => weights.get(h.id) || 1, 4);
      } else {
          chosenHeroes = shuffleArray(allHeroes).slice(0, 4);
      }

      const TARGET_DIFF = 1;
      const MAX_SWAPS = 2;

      let bestResult = getBestPermutation(chosenHeroes);

      for (let swapCount = 0; swapCount < MAX_SWAPS; swapCount++) {
          if (bestResult.diff <= TARGET_DIFF) break;

          const currentIds = new Set(chosenHeroes.map(h => h.id));
          const pool = allHeroes.filter(h => !currentIds.has(h.id));
          
          const potentialMoves: { idx: number, hero: Hero, diff: number }[] = [];

          for (let i = 0; i < 4; i++) {
              for (const candidate of pool) {
                  const testSet = [...chosenHeroes];
                  testSet[i] = candidate;
                  const res = getBestPermutation(testSet);

                  if (res.diff < bestResult.diff) {
                      potentialMoves.push({ idx: i, hero: candidate, diff: res.diff });
                  }
              }
          }

          if (potentialMoves.length === 0) break;

          const solvers = potentialMoves.filter(m => m.diff <= TARGET_DIFF);
          
          if (solvers.length > 0) {
              const move = weights
                  ? selectWeightedSingle(solvers, m => weights.get(m.hero.id) || 1)
                  : solvers[Math.floor(Math.random() * solvers.length)];
              chosenHeroes[move.idx] = move.hero;
              bestResult = getBestPermutation(chosenHeroes);
              break;
          } else {
              potentialMoves.sort((a, b) => a.diff - b.diff);
              const topTierCount = Math.max(1, Math.floor(potentialMoves.length * 0.25));
              const topMoves = potentialMoves.slice(0, topTierCount);
              
              const move = weights
                  ? selectWeightedSingle(topMoves, m => weights.get(m.hero.id) || 1)
                  : topMoves[Math.floor(Math.random() * topMoves.length)];
              chosenHeroes[move.idx] = move.hero;
              bestResult = getBestPermutation(chosenHeroes);
          }
      }

      let groupAIndex = 0;
      let groupBIndex = 0;

      newAssignments.forEach((assign, idx) => {
          if (assign.team === 'Odd') {
             newAssignments[idx] = { ...assign, hero: bestResult.groupA[groupAIndex] };
             groupAIndex++;
          } else {
             newAssignments[idx] = { ...assign, hero: bestResult.groupB[groupBIndex] };
             groupBIndex++;
          }
      });
  }
  else if (mode === 'strict') {
      let attempts = 0;
      const MAX_STRICT_ATTEMPTS = 200;

      let sample = weights
          ? selectWeightedUnique(allHeroes, h => weights.get(h.id) || 1, 4)
          : shuffleArray(allHeroes).slice(0, 4);
      let bestFound = getBestPermutation(sample);
      let bestDiffFound = bestFound.diff;

      while (attempts < MAX_STRICT_ATTEMPTS) {
          if (bestDiffFound <= threshold) break;
          sample = weights
              ? selectWeightedUnique(allHeroes, h => weights.get(h.id) || 1, 4)
              : shuffleArray(allHeroes).slice(0, 4);
          const result = getBestPermutation(sample);
          if (result.diff <= threshold) {
              bestFound = result;
              bestDiffFound = result.diff;
              break; 
          }
          if (result.diff < bestDiffFound) {
              bestDiffFound = result.diff;
              bestFound = result;
          }
          attempts++;
      }
      
      if (bestDiffFound > threshold && onToast) {
          onToast(`Не удалось найти баланс с погрешностью ${threshold}. Лучшая разница: ${bestDiffFound}`, "warning", 3000);
      }
      
      let groupAIndex = 0;
      let groupBIndex = 0;
      newAssignments.forEach((assign, idx) => {
          if (assign.team === 'Odd') {
             newAssignments[idx] = { ...assign, hero: bestFound.groupA[groupAIndex] };
             groupAIndex++;
          } else {
             newAssignments[idx] = { ...assign, hero: bestFound.groupB[groupBIndex] };
             groupBIndex++;
          }
      });
  }

  return newAssignments;
};
