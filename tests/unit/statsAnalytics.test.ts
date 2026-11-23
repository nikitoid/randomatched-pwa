import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
import {
  calculateMaxKillsInSeries,
  calculatePlayerStreaks,
  calculatePlayerAnalytics,
  calculateHeroAnalytics,
} from '../../utils/statsAnalytics';
import {
  calculateWilsonScore,
  getPlayerWeightedBreakdown,
  useStatsCalculations,
} from '../../components/stats/hooks/useStatsCalculations';
import type { MatchRecord } from '../../types';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

function makeMatch(
  id: string,
  timestamp: number,
  winner: 'team1' | 'team2',
  t1: Array<{ name: string; heroName: string; kills?: number }>,
  t2: Array<{ name: string; heroName: string; kills?: number }>
): MatchRecord {
  return {
    id,
    timestamp,
    lastUpdated: timestamp,
    winner,
    team1: t1.map((p, idx) => ({ ...p, heroId: `h1-${idx}` })),
    team2: t2.map((p, idx) => ({ ...p, heroId: `h2-${idx}` })),
  };
}

function renderUseStatsHook(history: MatchRecord[]) {
  let result: ReturnType<typeof useStatsCalculations> | null = null;
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  const Harness: React.FC<{ data: MatchRecord[] }> = ({ data }) => {
    result = useStatsCalculations(data);
    return null;
  };

  act(() => {
    root.render(React.createElement(Harness, { data: history }));
  });

  act(() => {
    root.unmount();
  });
  container.remove();

  if (!result) throw new Error('Hook did not render');
  return result as ReturnType<typeof useStatsCalculations>;
}

describe('utils/statsAnalytics & useStatsCalculations', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-23T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('calculateWilsonScore', () => {
    it('returns 0 when total <= 0 and rewards higher winrates / larger samples', () => {
      expect(calculateWilsonScore(0, 0)).toBe(0);
      expect(calculateWilsonScore(1, -5)).toBe(0);

      const smallPerfect = calculateWilsonScore(2, 2);
      const largerPerfect = calculateWilsonScore(10, 10);
      const half = calculateWilsonScore(5, 10);

      expect(largerPerfect).toBeGreaterThan(smallPerfect);
      expect(smallPerfect).toBeGreaterThan(half);
      expect(half).toBeGreaterThan(0);
    });
  });

  describe('getPlayerWeightedBreakdown', () => {
    it('buckets matches into 4 decay periods using 180-day half-life', () => {
      const now = Date.now();
      const history: MatchRecord[] = [
        makeMatch('m1', now - 5 * DAY_MS, 'team1', [{ name: 'Алекс', heroName: 'Геральт' }, { name: 'Б', heroName: 'Алиса' }], [{ name: 'В', heroName: 'Медуза' }, { name: 'Г', heroName: 'Ахиллес' }]),
        makeMatch('m2', now - 180 * DAY_MS, 'team2', [{ name: 'Алекс', heroName: 'Геральт' }, { name: 'Б', heroName: 'Алиса' }], [{ name: 'В', heroName: 'Медуза' }, { name: 'Г', heroName: 'Ахиллес' }]),
        makeMatch('m3', now - 250 * DAY_MS, 'team1', [{ name: 'Алекс', heroName: 'Геральт' }, { name: 'Б', heroName: 'Алиса' }], [{ name: 'В', heroName: 'Медуза' }, { name: 'Г', heroName: 'Ахиллес' }]),
        makeMatch('m4', now - 400 * DAY_MS, 'team2', [{ name: 'Алекс', heroName: 'Геральт' }, { name: 'Б', heroName: 'Алиса' }], [{ name: 'В', heroName: 'Медуза' }, { name: 'Г', heroName: 'Ахиллес' }]),
      ];

      const breakdown = getPlayerWeightedBreakdown(' алекс ', history, now);
      expect(breakdown.totalMatches).toBe(4);
      expect(breakdown.totalWins).toBe(2);
      expect(breakdown.periods.map((p) => p.matches)).toEqual([1, 1, 1, 1]);
      expect(breakdown.periods[1].weightedMatches).toBeCloseTo(0.5, 2);
      expect(breakdown.periods[1].weightedWins).toBe(0);
    });
  });

  describe('calculateMaxKillsInSeries', () => {
    it('sums kills within 6-hour gap and starts a new series after > 6 hours', () => {
      const base = Date.now() - 20 * HOUR_MS;
      const matches: MatchRecord[] = [
        makeMatch('m1', base, 'team1', [{ name: 'Алекс', heroName: 'А', kills: 3 }], [{ name: 'Б', heroName: 'Б', kills: 1 }]),
        makeMatch('m2', base + 2 * HOUR_MS, 'team1', [{ name: 'Алекс', heroName: 'А', kills: 4 }], [{ name: 'Б', heroName: 'Б', kills: 1 }]),
        // New session 8 hours later
        makeMatch('m3', base + 10 * HOUR_MS, 'team2', [{ name: 'Алекс', heroName: 'А', kills: 5 }], [{ name: 'Б', heroName: 'Б', kills: 2 }]),
      ];

      expect(calculateMaxKillsInSeries(matches, 'Алекс')).toBe(7);
      expect(calculateMaxKillsInSeries([], 'Алекс')).toBe(0);
    });
  });

  describe('calculatePlayerStreaks', () => {
    it('computes best win streak and worst lose streak from newest-first history', () => {
      const now = Date.now();
      // Chronological: L, L, L, W, W -> newest-first: W, W, L, L, L
      const newestFirst: MatchRecord[] = [
        makeMatch('5', now - 1000, 'team1', [{ name: 'Алекс', heroName: 'А' }], [{ name: 'Б', heroName: 'Б' }]),
        makeMatch('4', now - 2000, 'team1', [{ name: 'Алекс', heroName: 'А' }], [{ name: 'Б', heroName: 'Б' }]),
        makeMatch('3', now - 3000, 'team2', [{ name: 'Алекс', heroName: 'А' }], [{ name: 'Б', heroName: 'Б' }]),
        makeMatch('2', now - 4000, 'team2', [{ name: 'Алекс', heroName: 'А' }], [{ name: 'Б', heroName: 'Б' }]),
        makeMatch('1', now - 5000, 'team2', [{ name: 'Алекс', heroName: 'А' }], [{ name: 'Б', heroName: 'Б' }]),
      ];

      expect(calculatePlayerStreaks(newestFirst, 'Алекс')).toEqual({
        bestStreak: 2,
        worstStreak: 3,
      });
    });
  });

  describe('calculatePlayerAnalytics & calculateHeroAnalytics', () => {
    it('computes player partners, top heroes, level, and hero synergies', () => {
      const now = Date.now();
      const history: MatchRecord[] = [
        makeMatch(
          'm1',
          now - 1000,
          'team1',
          [{ name: 'Алекс', heroName: 'Геральт', kills: 4 }, { name: 'Борис', heroName: 'Йеннифер', kills: 2 }],
          [{ name: 'Виктор', heroName: 'Медуза', kills: 1 }, { name: 'Глеб', heroName: 'Алиса', kills: 0 }]
        ),
        makeMatch(
          'm2',
          now - 2000,
          'team1',
          [{ name: 'Алекс', heroName: 'Геральт', kills: 3 }, { name: 'Борис', heroName: 'Медуза', kills: 2 }],
          [{ name: 'Виктор', heroName: 'Шерлок', kills: 1 }, { name: 'Глеб', heroName: 'Алиса', kills: 1 }]
        ),
      ];

      const pAnalytics = calculatePlayerAnalytics('Алекс', history);
      expect(pAnalytics.matchesCount).toBe(2);
      expect(pAnalytics.winsCount).toBe(2);
      expect(pAnalytics.lossesCount).toBe(0);
      expect(pAnalytics.totalKills).toBe(7);
      expect(pAnalytics.maxKills).toBe(7);
      expect(pAnalytics.topHeroes[0].name).toBe('Геральт');
      expect(pAnalytics.partnerStats[0].name).toBe('Борис');
      expect(pAnalytics.levelInfo.totalXP).toBe(2 * 100 + 7 * 15);

      const hAnalytics = calculateHeroAnalytics('Геральт', history);
      expect(hAnalytics.recentMatches).toHaveLength(2);
      expect(hAnalytics.topPlayers[0].name).toBe('Алекс');
      expect(hAnalytics.topSynergies.map((s) => s.name)).toContain('Йеннифер');
    });
  });

  describe('useStatsCalculations', () => {
    it('identifies MVP, Underdog (3+ lose streak), active streak ("В огне"), inactive players, bloodiest match, and hero nominations', () => {
      const now = Date.now();
      const history: MatchRecord[] = [
        // 3 recent wins for Алекс + Борис, 3 losses for Виктор + Глеб
        makeMatch(
          'm1',
          now - 1 * DAY_MS,
          'team1',
          [{ name: 'Алекс', heroName: 'Геральт', kills: 5 }, { name: 'Борис', heroName: 'Медуза', kills: 3 }],
          [{ name: 'Виктор', heroName: 'Алиса', kills: 1 }, { name: 'Глеб', heroName: 'Ахиллес', kills: 0 }]
        ),
        makeMatch(
          'm2',
          now - 2 * DAY_MS,
          'team1',
          [{ name: 'Алекс', heroName: 'Геральт', kills: 4 }, { name: 'Борис', heroName: 'Медуза', kills: 2 }],
          [{ name: 'Виктор', heroName: 'Алиса', kills: 1 }, { name: 'Глеб', heroName: 'Ахиллес', kills: 1 }]
        ),
        makeMatch(
          'm3',
          now - 3 * DAY_MS,
          'team1',
          [{ name: 'Алекс', heroName: 'Геральт', kills: 6 }, { name: 'Борис', heroName: 'Алиса', kills: 2 }],
          [{ name: 'Виктор', heroName: 'Медуза', kills: 2 }, { name: 'Глеб', heroName: 'Ахиллес', kills: 2 }]
        ),
        // Inactive player > 60 days ago
        makeMatch(
          'm4',
          now - 70 * DAY_MS,
          'team1',
          [{ name: 'Старичок', heroName: 'Шерлок', kills: 10 }, { name: 'Другой', heroName: 'Дракула', kills: 1 }],
          [{ name: 'Опп1', heroName: 'Робин Гуд', kills: 0 }, { name: 'Опп2', heroName: 'Бигфут', kills: 0 }]
        ),
      ];

      const stats = renderUseStatsHook(history);

      expect(stats.totalMatches).toBe(4);
      expect(stats.mvp?.name).toBe('Алекс');
      expect(stats.bestStreakPlayer).toEqual({ name: 'Алекс', streak: 3 });
      // Both Виктор and Глеб have loseStreak 3, Глеб processed last on team2
      expect(['Виктор', 'Глеб']).toContain(stats.underdog?.name);
      expect(stats.sortedPlayers.find((p) => p.name === 'Старичок')?.isInactive).toBe(true);
      // Bloodiest match is m3 (6+2+2+2 = 12 kills)
      expect(stats.bloodiestMatch?.id).toBe('m3');
      expect(stats.bloodiestMatch?.totalKills).toBe(12);
      expect(stats.topWinrateHero?.name).toBe('Геральт');
      expect(stats.mostDeadlyHero?.name).toBe('Геральт');
      expect(stats.mostPopularHero).toBeTruthy();
    });
  });
});
