import { describe, it, expect } from 'vitest';
import {
  XP_PER_WIN,
  XP_PER_LOSS,
  XP_PER_KILL,
  getXpForNextLevel,
  getTotalXpForLevel,
  getRankTier,
  ALL_RANK_TIERS_INFO,
  calculatePlayerLevel,
} from '../../utils/playerLevel';

describe('utils/playerLevel', () => {
  it('computes XP thresholds per level and cumulative XP accurately', () => {
    expect(getXpForNextLevel(1)).toBe(200);
    expect(getXpForNextLevel(2)).toBe(300);
    expect(getXpForNextLevel(0)).toBe(200);

    expect(getTotalXpForLevel(1)).toBe(0);
    expect(getTotalXpForLevel(2)).toBe(200);
    expect(getTotalXpForLevel(3)).toBe(500); // 200 + 300
    expect(getTotalXpForLevel(4)).toBe(900); // 200 + 300 + 400
  });

  it('maps levels to all 6 rank tiers cleanly at boundaries', () => {
    expect(getRankTier(1).name).toBe('Новичок');
    expect(getRankTier(3).name).toBe('Новичок');
    expect(getRankTier(4).name).toBe('Боец');
    expect(getRankTier(6).name).toBe('Боец');
    expect(getRankTier(7).name).toBe('Ветеран');
    expect(getRankTier(10).name).toBe('Ветеран');
    expect(getRankTier(11).name).toBe('Мастер');
    expect(getRankTier(15).name).toBe('Мастер');
    expect(getRankTier(16).name).toBe('Грандмастер');
    expect(getRankTier(20).name).toBe('Грандмастер');
    expect(getRankTier(21).name).toBe('Легенда');
    expect(ALL_RANK_TIERS_INFO).toHaveLength(6);
  });

  it('calculates player level, remaining XP, progress percentage, and clamps negatives', () => {
    const empty = calculatePlayerLevel(-2, -1, -5);
    expect(empty.totalXP).toBe(0);
    expect(empty.level).toBe(1);
    expect(empty.currentXP).toBe(0);
    expect(empty.progressPercent).toBe(0);
    expect(empty.tier.name).toBe('Новичок');

    // 5 wins (500) + 2 losses (80) + 10 kills (150) = 730 XP
    // Level 1->2 costs 200 (rem 530), 2->3 costs 300 (rem 230), 3->4 costs 400 -> Level 3, currentXP 230
    const info = calculatePlayerLevel(5, 2, 10);
    expect(info.xpFromWins).toBe(5 * XP_PER_WIN);
    expect(info.xpFromLosses).toBe(2 * XP_PER_LOSS);
    expect(info.xpFromKills).toBe(10 * XP_PER_KILL);
    expect(info.totalXP).toBe(730);
    expect(info.level).toBe(3);
    expect(info.currentXP).toBe(230);
    expect(info.xpForNextLevel).toBe(400);
    expect(info.progressPercent).toBe(Math.round((230 / 400) * 100));
  });
});
