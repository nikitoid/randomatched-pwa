import { describe, it, expect, beforeEach } from 'vitest';
import {
  getPlural,
  formatPlural,
  normalizeHeroKey,
  getLevenshteinDistance,
  areAliases,
  areHeroNamesSimilar,
  getBestCanonicalDisplayName,
  findDuplicateOrSimilarHeroGroups,
  addIgnoredMergeGroup,
  getIgnoredMergeGroups,
  removeIgnoredMergeGroup,
  clearAllIgnoredMergeGroups,
  mergeHeroInList,
  mergeDuplicateHeroList,
} from '../../utils/heroNormalization';
import type { Hero } from '../../types';

describe('utils/heroNormalization', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Russian pluralization', () => {
    it('declines nouns properly', () => {
      expect(getPlural(0, 'матч', 'матча', 'матчей')).toBe('матчей');
      expect(getPlural(1, 'матч', 'матча', 'матчей')).toBe('матч');
      expect(getPlural(2, 'матч', 'матча', 'матчей')).toBe('матча');
      expect(getPlural(4, 'матч', 'матча', 'матчей')).toBe('матча');
      expect(getPlural(5, 'матч', 'матча', 'матчей')).toBe('матчей');
      expect(getPlural(11, 'матч', 'матча', 'матчей')).toBe('матчей');
      expect(getPlural(21, 'матч', 'матча', 'матчей')).toBe('матч');
      expect(formatPlural(23, 'герой', 'героя', 'героев')).toBe('23 героя');
    });
  });

  describe('normalizeHeroKey', () => {
    it('normalizes case, ё/е, dashes, quotes, punctuation, and connectors', () => {
      expect(normalizeHeroKey('  «Чёрная  Пантера» ')).toBe('черная пантера');
      expect(normalizeHeroKey('Плащ & Кинжал')).toBe('плащ и кинжал');
      expect(normalizeHeroKey('Трисс+Йеннифер')).toBe('трисс и йеннифер');
      expect(normalizeHeroKey('Cloak and Dagger')).toBe('cloak и dagger');
      expect(normalizeHeroKey('Ти — Рекс')).toBe('ти-рекс');
      expect(normalizeHeroKey('')).toBe('');
    });
  });

  describe('getLevenshteinDistance & areAliases', () => {
    it('computes edit distance up to 2 and short-circuits on length difference > 2', () => {
      expect(getLevenshteinDistance('Шерлок', 'Шерлок')).toBe(0);
      expect(getLevenshteinDistance('Шерлок', 'Шерлак')).toBe(1);
      expect(getLevenshteinDistance('Дракула', 'Дрокуло')).toBe(2);
      expect(getLevenshteinDistance('Алиса', 'Алиса-Воин')).toBe(5); // lenDiff > 2
    });

    it('detects known hero aliases across Russian and English variants', () => {
      expect(areAliases('Геральт из Ривии', 'Ведьмак')).toBe(true);
      expect(areAliases('Spider-Man', 'Человек паук')).toBe(true);
      expect(areAliases('Алиса', 'Медуза')).toBe(false);
    });
  });

  describe('areHeroNamesSimilar', () => {
    it('recognizes exact normalized, aliases, word permutations, and typos', () => {
      expect(areHeroNamesSimilar('Плащ & Кинжал', 'Плащ и Кинжал')).toEqual({
        isSimilar: true,
        reason: 'exact_normalized',
      });
      expect(areHeroNamesSimilar('Геральт', 'Ведьмак')).toEqual({
        isSimilar: true,
        reason: 'alias',
      });
      expect(areHeroNamesSimilar('Трисс и Йеннифер', 'Йеннифер и Трисс')).toEqual({
        isSimilar: true,
        reason: 'alias',
      });
      expect(areHeroNamesSimilar('Медуза', 'Медуса')).toEqual({
        isSimilar: true,
        reason: 'typo',
      });
    });

    it('does not confuse numbered, rank-suffixed, or sequel variants as duplicates', () => {
      expect(areHeroNamesSimilar('Бэтмен 1', 'Бэтмен 2').isSimilar).toBe(false);
      expect(areHeroNamesSimilar('Ахиллес S+', 'Ахиллес B-').isSimilar).toBe(false);
      expect(areHeroNamesSimilar('Ахиллес', 'Ахиллес II').isSimilar).toBe(false);
      expect(areHeroNamesSimilar('Конан', 'Конан 2').isSimilar).toBe(false);
    });
  });

  describe('getBestCanonicalDisplayName', () => {
    it('prefers Title Case over ALL CAPS and lowercase and breaks ties by frequency', () => {
      expect(getBestCanonicalDisplayName(['КРАСНАЯ ШАПОЧКА', 'красная шапочка', 'Красная Шапочка'])).toBe(
        'Красная Шапочка'
      );
      expect(getBestCanonicalDisplayName(['Медуза', 'Медуза', 'МЕДУЗА'])).toBe('Медуза');
      expect(getBestCanonicalDisplayName([])).toBe('');
    });
  });

  describe('findDuplicateOrSimilarHeroGroups & ignored groups', () => {
    it('clusters similar names and respects ignored groups', () => {
      const names = ['Геральт', 'Ведьмак', 'Шерлок Холмс', 'Шерлок Холмс ', 'Алиса', 'Медуза'];
      const groups = findDuplicateOrSimilarHeroGroups(names);

      expect(groups).toHaveLength(1);
      expect(groups[0].reason).toBe('alias');
      expect([groups[0].primaryName, ...groups[0].duplicateNames].sort()).toEqual(['Ведьмак', 'Геральт']);

      const ignored = addIgnoredMergeGroup(['Геральт', 'Ведьмак']);
      expect(ignored).toHaveLength(1);
      expect(findDuplicateOrSimilarHeroGroups(names)).toHaveLength(0);

      // Duplicate ignore entry should not be added twice
      expect(addIgnoredMergeGroup([' ведьмак ', 'геральт'])).toHaveLength(1);

      const id = getIgnoredMergeGroups()[0].id;
      expect(removeIgnoredMergeGroup(id)).toHaveLength(0);
      addIgnoredMergeGroup(['Геральт', 'Ведьмак']);
      clearAllIgnoredMergeGroups();
      expect(getIgnoredMergeGroups()).toHaveLength(0);
    });
  });

  describe('mergeHeroInList & mergeDuplicateHeroList', () => {
    it('merges source variants into target preserving the highest rank', () => {
      const heroes: Hero[] = [
        { id: '1', name: 'Ведьмак', rank: 'B+' },
        { id: '2', name: 'Геральт', rank: 'S-' },
        { id: '3', name: 'Медуза', rank: 'S+' },
      ];

      const { heroes: merged, changed } = mergeHeroInList(heroes, 'Геральт', ['Ведьмак']);
      expect(changed).toBe(true);
      expect(merged).toHaveLength(2);
      expect(merged.find((h) => h.name === 'Геральт')?.rank).toBe('S-');

      const noOp = mergeHeroInList(heroes, 'Геральт', []);
      expect(noOp.changed).toBe(false);
    });

    it('resolves duplicate mappings across a list and keeps highest rank', () => {
      const heroes: Hero[] = [
        { id: '1', name: 'ведьмак', rank: 'C+' },
        { id: '2', name: 'Геральт', rank: 'A+' },
        { id: '3', name: 'Ведьмак', rank: 'S+' },
      ];
      const result = mergeDuplicateHeroList(heroes, {
        ведьмак: 'Геральт',
        Ведьмак: 'Геральт',
      });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Геральт');
      expect(result[0].rank).toBe('S+');
    });
  });
});
