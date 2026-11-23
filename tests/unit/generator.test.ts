import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  selectWeightedSingle,
  selectWeightedUnique,
  getHeroHistoryWeights,
  getPlayerHeroHistoryWeights,
  getHeroWeight,
  getUniqueHeroesFromLists,
  getBestPermutation,
  shuffleArray,
  generateAssignmentsWithMode,
} from '../../utils/generator';
import type { AssignedPlayer, Hero, HeroList, MatchRecord } from '../../types';

const makeHeroes = (ranks: string[]): Hero[] =>
  ranks.map((rank, idx) => ({
    id: `h-${idx + 1}`,
    name: `Hero ${idx + 1}`,
    rank,
  }));

const makeAssignments = (): AssignedPlayer[] => [
  { playerNumber: 1, hero: null, position: 'top', team: 'Odd' },
  { playerNumber: 2, hero: null, position: 'right', team: 'Even' },
  { playerNumber: 3, hero: null, position: 'bottom', team: 'Odd' },
  { playerNumber: 4, hero: null, position: 'left', team: 'Even' },
];

const makeMatch = (
  id: string,
  timestamp: number,
  t1: Array<[string, string, string]>,
  t2: Array<[string, string, string]>,
  winner: 'team1' | 'team2' = 'team1'
): MatchRecord => ({
  id,
  timestamp,
  lastUpdated: timestamp,
  team1: t1.map(([name, heroId, heroName]) => ({ name, heroId, heroName })),
  team2: t2.map(([name, heroId, heroName]) => ({ name, heroId, heroName })),
  winner,
});

describe('utils/generator', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('shuffleArray', () => {
    it('returns a new array with the same elements without mutating input', () => {
      const original = [1, 2, 3, 4, 5, 6];
      const copy = [...original];
      const shuffled = shuffleArray(original);

      expect(original).toEqual(copy);
      expect(shuffled).not.toBe(original);
      expect(shuffled).toHaveLength(original.length);
      expect([...shuffled].sort((a, b) => a - b)).toEqual(original);
    });
  });

  describe('getHeroWeight', () => {
    it('maps known ranks and falls back to 6 for missing/unknown ranks', () => {
      expect(getHeroWeight({ id: '1', name: 'A', rank: 'S+' })).toBe(12);
      expect(getHeroWeight({ id: '2', name: 'B', rank: 'E-' })).toBe(1);
      expect(getHeroWeight({ id: '3', name: 'C', rank: ' A+ ' })).toBe(10);
      expect(getHeroWeight({ id: '4', name: 'D', rank: 'UNKNOWN' })).toBe(6);
      expect(getHeroWeight({ id: '5', name: 'E', rank: '' })).toBe(6);
      expect(getHeroWeight(null)).toBe(6);
    });
  });

  describe('getUniqueHeroesFromLists', () => {
    it('deduplicates heroes case-insensitively keeping the first occurrence', () => {
      const list1: HeroList = {
        id: 'l1',
        name: 'L1',
        isLocal: true,
        heroes: [
          { id: '1', name: 'Медуза', rank: 'S+' },
          { id: '2', name: '  ', rank: 'C+' },
        ],
      };
      const list2: HeroList = {
        id: 'l2',
        name: 'L2',
        isLocal: true,
        heroes: [
          { id: '3', name: ' медуза ', rank: 'E-' },
          { id: '4', name: 'Ахиллес', rank: 'A+' },
        ],
      };

      const unique = getUniqueHeroesFromLists([list1, list2]);
      expect(unique).toHaveLength(2);
      expect(unique[0]).toEqual({ id: '1', name: 'Медуза', rank: 'S+' });
      expect(unique[1]).toEqual({ id: '4', name: 'Ахиллес', rank: 'A+' });
    });
  });

  describe('getBestPermutation', () => {
    it('splits 4 heroes into two pairs with minimum rank weight difference', () => {
      // Weights: S+ (12), S- (11), E+ (2), E- (1)
      // Optimal pairing: (12 + 1 = 13) vs (11 + 2 = 13) => diff 0
      const heroes = makeHeroes(['S+', 'S-', 'E+', 'E-']);
      const perm = getBestPermutation(heroes);

      expect(perm.diff).toBe(0);
      const sumA = perm.groupA.reduce((s, h) => s + getHeroWeight(h), 0);
      const sumB = perm.groupB.reduce((s, h) => s + getHeroWeight(h), 0);
      expect(sumA).toBe(13);
      expect(sumB).toBe(13);
    });
  });

  describe('selectWeightedSingle & selectWeightedUnique', () => {
    it('throws when selectWeightedSingle receives an empty array', () => {
      expect(() => selectWeightedSingle([], () => 1)).toThrow('Empty array');
    });

    it('selects items proportionally to weights in selectWeightedSingle', () => {
      const items = ['low', 'high'];
      vi.spyOn(Math, 'random').mockReturnValue(0.5);
      // weights: [1, 9] -> total 10, r = 5 -> hits 'high'
      expect(selectWeightedSingle(items, (x) => (x === 'high' ? 9 : 1))).toBe('high');

      vi.spyOn(Math, 'random').mockReturnValue(0.05);
      // r = 0.5 -> hits 'low'
      expect(selectWeightedSingle(items, (x) => (x === 'high' ? 9 : 1))).toBe('low');
    });

    it('selectWeightedUnique returns unique items bounded by pool size', () => {
      const pool = makeHeroes(['S+', 'A+', 'B+', 'C+', 'D+']);
      const chosen = selectWeightedUnique(pool, () => 1, 4);

      expect(chosen).toHaveLength(4);
      expect(new Set(chosen.map((h) => h.id)).size).toBe(4);
      expect(selectWeightedUnique(pool, () => 1, 10)).toHaveLength(5);
    });
  });

  describe('getHeroHistoryWeights & getPlayerHeroHistoryWeights', () => {
    it('returns uniform weights of 1 when prioritizeUnplayed is false or history is empty', () => {
      const heroes = makeHeroes(['S+', 'A+', 'B+', 'C+', 'D+', 'E+']);
      const wOff = getHeroHistoryWeights([], heroes, false);
      expect(Array.from(wOff.values())).toEqual([1, 1, 1, 1, 1, 1]);

      const wPlayer = getPlayerHeroHistoryWeights([], heroes, 'Алекс', true);
      expect(Array.from(wPlayer.values())).toEqual([1, 1, 1, 1, 1, 1]);
    });

    it('applies hard cooldown (0.001) to heroes played in last 2 matches when pool >= 6 and boosts unplayed heroes', () => {
      const heroes = makeHeroes(['S+', 'A+', 'B+', 'C+', 'D+', 'E+']);
      const history: MatchRecord[] = [
        makeMatch('m1', 3000, [['P1', 'h-1', 'Hero 1'], ['P2', 'h-2', 'Hero 2']], [['P3', 'h-3', 'Hero 3'], ['P4', 'h-4', 'Hero 4']]),
        makeMatch('m2', 2000, [['P1', 'h-5', 'Hero 5'], ['P2', 'h-2', 'Hero 2']], [['P3', 'h-3', 'Hero 3'], ['P4', 'h-4', 'Hero 4']]),
      ];

      const weights = getHeroHistoryWeights(history, heroes, true);
      // h-1..h-5 were played in the last 2 matches -> hard cooldown 0.001
      expect(weights.get('h-1')).toBe(0.001);
      expect(weights.get('h-5')).toBe(0.001);
      // h-6 was never played -> much higher weight (1 + 2^1.5 * 1.5 ≈ 5.24)
      expect(weights.get('h-6')).toBeCloseTo(1 + Math.pow(2, 1.5) * 1.5, 5);
    });

    it('computes player-specific freshness weights ignoring matches without the target player', () => {
      const heroes = makeHeroes(['S+', 'A+', 'B+', 'C+', 'D+', 'E+']);
      const history: MatchRecord[] = [
        makeMatch('m1', 3000, [['Алекс', 'h-1', 'Hero 1'], ['Борис', 'h-2', 'Hero 2']], [['Виктор', 'h-3', 'Hero 3'], ['Глеб', 'h-4', 'Hero 4']]),
        makeMatch('m2', 2000, [['Кто-то', 'h-6', 'Hero 6'], ['Борис', 'h-2', 'Hero 2']], [['Виктор', 'h-3', 'Hero 3'], ['Глеб', 'h-4', 'Hero 4']]),
      ];

      const weights = getPlayerHeroHistoryWeights(history, heroes, ' алекс ', true);
      expect(weights.get('h-1')).toBe(0.001); // played by Alex at index 0
      expect(weights.get('h-6')).toBeCloseTo(1 + Math.pow(2, 1.5) * 1.5, 5); // not played by Alex
    });
  });

  describe('generateAssignmentsWithMode', () => {
    it('returns currentAssignments unchanged if unique heroes < 4 or slots !== 4', () => {
      const smallList: HeroList[] = [{ id: 'l1', name: 'Small', isLocal: true, heroes: makeHeroes(['S+', 'A+', 'B+']) }];
      const initial = makeAssignments();
      expect(generateAssignmentsWithMode(smallList, 'random', 1, initial)).toBe(initial);

      const bigList: HeroList[] = [{ id: 'l2', name: 'Big', isLocal: true, heroes: makeHeroes(['S+', 'A+', 'B+', 'C+']) }];
      expect(generateAssignmentsWithMode(bigList, 'random', 1, initial.slice(0, 3))).toHaveLength(3);
    });

    it('assigns 4 unique heroes in random, balanced, and strict modes', () => {
      const lists: HeroList[] = [
        { id: 'l1', name: 'Main', isLocal: true, heroes: makeHeroes(['S+', 'S-', 'A+', 'A-', 'B+', 'B-', 'E+', 'E-']) },
      ];

      for (const mode of ['random', 'balanced', 'strict'] as const) {
        const res = generateAssignmentsWithMode(lists, mode, 1, makeAssignments());
        expect(res).toHaveLength(4);
        const ids = res.map((a) => a.hero?.id);
        expect(ids.every(Boolean)).toBe(true);
        expect(new Set(ids).size).toBe(4);
      }
    });

    it('balances Odd and Even teams in strict mode when exact match is possible', () => {
      const lists: HeroList[] = [
        { id: 'l1', name: 'Exact', isLocal: true, heroes: makeHeroes(['S+', 'S-', 'E+', 'E-']) },
      ];
      const res = generateAssignmentsWithMode(lists, 'strict', 0, makeAssignments());
      const oddSum = res.filter((a) => a.team === 'Odd').reduce((s, a) => s + getHeroWeight(a.hero), 0);
      const evenSum = res.filter((a) => a.team === 'Even').reduce((s, a) => s + getHeroWeight(a.hero), 0);
      expect(Math.abs(oddSum - evenSum)).toBe(0);
    });

    it('invokes warning toast in strict mode when threshold cannot be satisfied', () => {
      const lists: HeroList[] = [
        { id: 'l1', name: 'Skewed', isLocal: true, heroes: makeHeroes(['S+', 'E+', 'E-', 'E-']) },
      ];
      const onToast = vi.fn();
      const res = generateAssignmentsWithMode(lists, 'strict', 0, makeAssignments(), onToast);

      expect(res).toHaveLength(4);
      expect(onToast).toHaveBeenCalledTimes(1);
      expect(onToast).toHaveBeenCalledWith(expect.stringContaining('Не удалось найти баланс'), 'warning', 3000);
    });

    it('supports player-specific freshness weights in all modes', () => {
      const lists: HeroList[] = [
        { id: 'l1', name: 'Pool', isLocal: true, heroes: makeHeroes(['S+', 'A+', 'B+', 'C+', 'D+', 'E+']) },
      ];
      const playerWeights = Array.from({ length: 4 }, () => new Map<string, number>([
        ['h-1', 100],
        ['h-2', 100],
        ['h-3', 100],
        ['h-4', 100],
        ['h-5', 1],
        ['h-6', 1],
      ]));

      const res = generateAssignmentsWithMode(lists, 'balanced', 1, makeAssignments(), undefined, undefined, playerWeights);
      expect(res.every((a) => a.hero !== null)).toBe(true);
      expect(new Set(res.map((a) => a.hero?.id)).size).toBe(4);
    });
  });
});
