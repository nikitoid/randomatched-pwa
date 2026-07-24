
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
  
  // Сопоставление истории по нормализованным именам (и fallback heroId)
  const lastPlayedIndicesByName = new Map<string, number>();
  const playCountsByName = new Map<string, number>();

  for (let i = 0; i < DEPTH; i++) {
    const match = history[i];
    const heroKeysInMatch = new Set<string>();
    
    const processPlayer = (p: { heroId?: string; heroName?: string }) => {
      if (p.heroName && p.heroName.trim()) {
        heroKeysInMatch.add(p.heroName.trim().toLowerCase());
      }
      if (p.heroId && p.heroId !== 'manual' && p.heroId !== 'unknown') {
        heroKeysInMatch.add(p.heroId);
      }
    };

    if (match.team1) match.team1.forEach(processPlayer);
    if (match.team2) match.team2.forEach(processPlayer);

    for (const key of heroKeysInMatch) {
      if (!lastPlayedIndicesByName.has(key)) {
        lastPlayedIndicesByName.set(key, i);
      }
      playCountsByName.set(key, (playCountsByName.get(key) || 0) + 1);
    }
  }

  // Жесткий кулдаун для последних 2 матчей сессии (если в пуле достаточно героев)
  const HARD_COOLDOWN_MATCHES = 2;
  const allowHardCooldown = allHeroes.length >= 6;

  allHeroes.forEach(hero => {
    const normName = hero.name.trim().toLowerCase();
    const lastPlayedIndex = lastPlayedIndicesByName.get(normName) ?? lastPlayedIndicesByName.get(hero.id);
    const playCount = (playCountsByName.get(normName) || 0) + (playCountsByName.get(hero.id) || 0);

    let inactivityScore = DEPTH;

    if (lastPlayedIndex !== undefined) {
      inactivityScore = lastPlayedIndex;
    }

    // Если герой играл в последних 2 матчах и пул достаточен — ставим почти нулевой вес
    if (allowHardCooldown && lastPlayedIndex !== undefined && lastPlayedIndex < HARD_COOLDOWN_MATCHES) {
      weights.set(hero.id, 0.001);
      return;
    }

    // Степенная зави  weights.set(hero.id, Math.max(0.001, finalWeight));
  });

  return weights;
};

// Calculate hero weights for a specific player based on their match history
export const getPlayerHeroHistoryWeights = (
  history: MatchRecord[],
  allHeroes: Hero[],
  playerName: string,
  prioritizeUnplayed: boolean = true
): Map<string, number> => {
  const weights = new Map<string, number>();

  if (!prioritizeUnplayed || !playerName.trim() || history.length === 0) {
    allHeroes.forEach(h => weights.set(h.id, 1));
    return weights;
  }

  const normTargetName = playerName.trim().toLowerCase();

  // Динамическая глубина на основе истории игр
  const DEPTH = Math.min(
    Math.max(20, Math.floor(allHeroes.length * 2)),
    history.length
  );

  const lastPlayedIndicesByName = new Map<string, number>();
  const playCountsByName = new Map<string, number>();

  for (let i = 0; i < DEPTH; i++) {
    const match = history[i];
    let foundPlayerInMatch = false;
    const heroKeysForPlayerInMatch = new Set<string>();

    const checkMatchPlayer = (p: { name: string; heroId?: string; heroName?: string }) => {
      if (p.name && p.name.trim().toLowerCase() === normTargetName) {
        foundPlayerInMatch = true;
        if (p.heroName && p.heroName.trim()) {
          heroKeysForPlayerInMatch.add(p.heroName.trim().toLowerCase());
        }
        if (p.heroId && p.heroId !== 'manual' && p.heroId !== 'unknown') {
          heroKeysForPlayerInMatch.add(p.heroId);
        }
      }
    };

    if (match.team1) match.team1.forEach(checkMatchPlayer);
    if (match.team2) match.team2.forEach(checkMatchPlayer);

    if (foundPlayerInMatch) {
      for (const key of heroKeysForPlayerInMatch) {
        if (!lastPlayedIndicesByName.has(key)) {
          lastPlayedIndicesByName.set(key, i);
        }
        playCountsByName.set(key, (playCountsByName.get(key) || 0) + 1);
      }
    }
  }

  const HARD_COOLDOWN_MATCHES = 2;
  const allowHardCooldown = allHeroes.length >= 6;

  allHeroes.forEach(hero => {
    const normName = hero.name.trim().toLowerCase();
    const lastPlayedIndex = lastPlayedIndicesByName.get(normName) ?? lastPlayedIndicesByName.get(hero.id);
    const playCount = (playCountsByName.get(normName) || 0) + (playCountsByName.get(hero.id) || 0);

    let inactivityScore = DEPTH;

    if (lastPlayedIndex !== undefined) {
      inactivityScore = lastPlayedIndex;
    }

    if (allowHardCooldown && lastPlayedIndex !== undefined && lastPlayedIndex < HARD_COOLDOWN_MATCHES) {
      weights.set(hero.id, 0.001);
      return;
    }

    const recencyWeight = 1 + Math.pow(inactivityScore, 1.5) * 1.5;
    const finalWeight = recencyWeight / (1 + playCount * 0.7);

    weights.set(hero.id, Math.max(0.001, finalWeight));
  });

  return weights;
};

// Helper to get best assignment of 4 heroes to 4 specific player slots considering teams & player weights
export const getBestPlayerAssignmentForPermutation = (
  perm: { groupA: Hero[]; groupB: Hero[]; diff: number },
  assignments: AssignedPlayer[],
  playerWeightsArray?: Map<string, number>[]
): { assignmentHeroes: (Hero | null)[]; freshnessScore: number } => {
  if (!playerWeightsArray || playerWeightsArray.length !== 4) {
    const res: (Hero | null)[] = new Array(4).fill(null);
    let gA = 0, gB = 0;
    assignments.forEach((a, idx) => {
      if (a.team === 'Odd') {
        res[idx] = perm.groupA[gA++];
      } else {
        res[idx] = perm.groupB[gB++];
      }
    });
    const freshnessScore = res.reduce((sum, h) => sum + 1, 0);
    return { assignmentHeroes: res, freshnessScore };
  }

  const oddIndices = assignments.map((a, i) => (a.team === 'Odd' ? i : -1)).filter(i => i !== -1);
  const evenIndices = assignments.map((a, i) => (a.team === 'Even' ? i : -1)).filter(i => i !== -1);

  if (oddIndices.length !== 2 || evenIndices.length !== 2) {
    const res: (Hero | null)[] = new Array(4).fill(null);
    let gA = 0, gB = 0;
    assignments.forEach((a, idx) => {
      if (a.team === 'Odd') {
        res[idx] = perm.groupA[gA++];
      } else {
        res[idx] = perm.groupB[gB++];
      }
    });
    const freshnessScore = res.reduce((sum, h, idx) => sum + (h ? (playerWeightsArray[idx].get(h.id) || 1) : 1), 0);
    return { assignmentHeroes: res, freshnessScore };
  }

  const oddOptions = [
    [perm.groupA[0], perm.groupA[1]],
    [perm.groupA[1], perm.groupA[0]]
  ];
  const evenOptions = [
    [perm.groupB[0], perm.groupB[1]],
    [perm.groupB[1], perm.groupB[0]]
  ];

  let bestScore = -1;
  let bestHeroes: (Hero | null)[] = new Array(4).fill(null);

  for (const oddOpt of oddOptions) {
    for (const evenOpt of evenOptions) {
      const current: (Hero | null)[] = new Array(4).fill(null);
      current[oddIndices[0]] = oddOpt[0];
      current[oddIndices[1]] = oddOpt[1];
      current[evenIndices[0]] = evenOpt[0];
      current[evenIndices[1]] = evenOpt[1];

      const score = current.reduce((sum, h, idx) => {
        return sum + (h ? (playerWeightsArray[idx].get(h.id) || 1) : 1);
      }, 0);

      if (score > bestScore) {
        bestScore = score;
        bestHeroes = current;
      }
    }
  }

  return { assignmentHeroes: bestHeroes, freshnessScore: bestScore };
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
    weights?: Map<string, number>,
    playerWeightsArray?: Map<string, number>[]
): AssignedPlayer[] => {
  // Use unique heroes logic to avoid duplicates across lists
  const allHeroes = getUniqueHeroesFromLists(lists);

  if (allHeroes.length < 4 || currentAssignments.length !== 4) return currentAssignments;

  let chosenHeroes: Hero[] = [];
  let newAssignments = [...currentAssignments];

  const hasPlayerWeights = Array.isArray(playerWeightsArray) && playerWeightsArray.length === 4;

  if (mode === 'random') {
      if (hasPlayerWeights) {
          const NUM_SAMPLES = 200;
          const samples: { heroes: Hero[]; assignmentHeroes: (Hero | null)[]; freshnessScore: number }[] = [];

          for (let s = 0; s < NUM_SAMPLES; s++) {
              const sample = shuffleArray(allHeroes).slice(0, 4);
              const perm = getBestPermutation(sample);
              const { assignmentHeroes, freshnessScore } = getBestPlayerAssignmentForPermutation(perm, currentAssignments, playerWeightsArray);
              samples.push({ heroes: sample, assignmentHeroes, freshnessScore });
          }

          const chosenSample = selectWeightedSingle(samples, s => Math.max(0.01, s.freshnessScore));
          chosenSample.assignmentHeroes.forEach((h, idx) => {
              if (h) newAssignments[idx] = { ...newAssignments[idx], hero: h };
          });
      } else if (weights) {
          chosenHeroes = selectWeightedUnique(allHeroes, h => weights.get(h.id) || 1, 4);
          newAssignments.forEach((assign, idx) => {
             newAssignments[idx] = { ...assign, hero: chosenHeroes[idx] };
          });
      } else {
          chosenHeroes = shuffleArray(allHeroes).slice(0, 4);
          newAssignments.forEach((assign, idx) => {
             newAssignments[idx] = { ...assign, hero: chosenHeroes[idx] };
          });
      }
  } 
  else if (mode === 'balanced') {
      const TARGET_DIFF = 1;
      const NUM_SAMPLES = 120;
      
      const samples: { heroes: Hero[]; perm: ReturnType<typeof getBestPermutation>; freshnessScore: number; assignmentHeroes?: (Hero | null)[] }[] = [];

      for (let s = 0; s < NUM_SAMPLES; s++) {
          const sample = hasPlayerWeights
              ? shuffleArray(allHeroes).slice(0, 4)
              : (weights ? selectWeightedUnique(allHeroes, h => weights.get(h.id) || 1, 4) : shuffleArray(allHeroes).slice(0, 4));
          
          const perm = getBestPermutation(sample);

          if (hasPlayerWeights) {
              const { assignmentHeroes, freshnessScore } = getBestPlayerAssignmentForPermutation(perm, currentAssignments, playerWeightsArray);
              samples.push({ heroes: sample, perm, freshnessScore, assignmentHeroes });
          } else {
              const freshnessScore = sample.reduce((sum, h) => sum + (weights ? (weights.get(h.id) || 1) : 1), 0);
              samples.push({ heroes: sample, perm, freshnessScore });
          }
      }

      // Находим кандидатов с diff <= TARGET_DIFF
      const balancedSamples = samples.filter(s => s.perm.diff <= TARGET_DIFF);

      let chosenSample: typeof samples[0];

      if (balancedSamples.length > 0) {
          // Выбираем из сбалансированных наборов взвешенно по показателю свежести
          chosenSample = selectWeightedSingle(balancedSamples, s => Math.max(0.01, s.freshnessScore));
      } else {
          // Если идеального баланса нет, выбираем из вариантов с наименьшим diff
          samples.sort((a, b) => a.perm.diff - b.perm.diff);
          const minDiff = samples[0].perm.diff;
          const bestDiffSamples = samples.filter(s => s.perm.diff <= minDiff + 0.5);
          chosenSample = selectWeightedSingle(bestDiffSamples, s => Math.max(0.01, s.freshnessScore));
      }

      if (hasPlayerWeights && chosenSample.assignmentHeroes) {
          chosenSample.assignmentHeroes.forEach((h, idx) => {
              if (h) newAssignments[idx] = { ...newAssignments[idx], hero: h };
          });
      } else {
          const bestResult = chosenSample.perm;
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
  }
  else if (mode === 'strict') {
      const NUM_SAMPLES = 200;
      const samples: { heroes: Hero[]; perm: ReturnType<typeof getBestPermutation>; freshnessScore: number; assignmentHeroes?: (Hero | null)[] }[] = [];

      for (let s = 0; s < NUM_SAMPLES; s++) {
          const sample = hasPlayerWeights
              ? shuffleArray(allHeroes).slice(0, 4)
              : (weights ? selectWeightedUnique(allHeroes, h => weights.get(h.id) || 1, 4) : shuffleArray(allHeroes).slice(0, 4));
          
          const perm = getBestPermutation(sample);

          if (hasPlayerWeights) {
              const { assignmentHeroes, freshnessScore } = getBestPlayerAssignmentForPermutation(perm, currentAssignments, playerWeightsArray);
              samples.push({ heroes: sample, perm, freshnessScore, assignmentHeroes });
          } else {
              const freshnessScore = sample.reduce((sum, h) => sum + (weights ? (weights.get(h.id) || 1) : 1), 0);
              samples.push({ heroes: sample, perm, freshnessScore });
          }
      }

      const validStrictSamples = samples.filter(s => s.perm.diff <= threshold);
      let chosenSample: typeof samples[0];

      if (validStrictSamples.length > 0) {
          chosenSample = selectWeightedSingle(validStrictSamples, s => Math.max(0.01, s.freshnessScore));
      } else {
          samples.sort((a, b) => a.perm.diff - b.perm.diff);
          chosenSample = samples[0];
          if (onToast) {
              onToast(`Не удалось найти баланс с погрешностью ${threshold}. Лучшая разница: ${chosenSample.perm.diff}`, "warning", 3000);
          }
      }

      if (hasPlayerWeights && chosenSample.assignmentHeroes) {
          chosenSample.assignmentHeroes.forEach((h, idx) => {
              if (h) newAssignments[idx] = { ...newAssignments[idx], hero: h };
          });
      } else {
          const bestFound = chosenSample.perm;
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
  }

  return newAssignments;
};
