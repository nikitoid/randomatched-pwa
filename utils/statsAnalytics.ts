import { MatchRecord } from '../types';
import { normalizeHeroKey } from './heroNormalization';
import { calculatePlayerLevel, PlayerLevelInfo } from './playerLevel';
import { calculateWilsonScore, getPlayerWeightedBreakdown } from '../components/stats/hooks/useStatsCalculations';

export interface RankedEntityStat {
    name: string;
    matches: number;
    wins: number;
    score: number;
}

export interface PlayerStreaks {
    bestStreak: number;
    worstStreak: number;
}

export interface PlayerAnalyticsResult {
    recentMatches: MatchRecord[];
    topHeroes: RankedEntityStat[];
    partnerStats: RankedEntityStat[];
    bestStreak: number;
    worstStreak: number;
    totalKills: number;
    maxKills: number;
    matchesCount: number;
    winsCount: number;
    lossesCount: number;
    dynamicScore: number;
    levelInfo: PlayerLevelInfo;
}

export interface HeroAnalyticsResult {
    recentMatches: MatchRecord[];
    topPlayers: RankedEntityStat[];
    topSynergies: RankedEntityStat[];
}

const DEFAULT_SERIES_GAP_MS = 6 * 60 * 60 * 1000;

/**
 * Calculates the maximum kills scored by a player within a single continuous play session.
 */
export function calculateMaxKillsInSeries(
    matches: MatchRecord[],
    playerName: string,
    seriesGapMs: number = DEFAULT_SERIES_GAP_MS
): number {
    if (!playerName || matches.length === 0) return 0;

    const chronologicalMatches = [...matches].sort((a, b) => a.timestamp - b.timestamp);
    let maxKills = 0;
    let currentSeriesKills = 0;
    let lastTimestamp = 0;

    chronologicalMatches.forEach(m => {
        const isTeam1 = m.team1.some(p => p.name === playerName);
        const pData = isTeam1 ? m.team1.find(p => p.name === playerName) : m.team2.find(p => p.name === playerName);
        const kills = (pData && pData.kills !== undefined && pData.kills !== null) ? pData.kills : 0;

        if (lastTimestamp === 0) {
            currentSeriesKills = kills;
            lastTimestamp = m.timestamp;
        } else if (m.timestamp - lastTimestamp <= seriesGapMs) {
            currentSeriesKills += kills;
            lastTimestamp = m.timestamp;
        } else {
            if (currentSeriesKills > maxKills) {
                maxKills = currentSeriesKills;
            }
            currentSeriesKills = kills;
            lastTimestamp = m.timestamp;
        }
    });

    if (currentSeriesKills > maxKills) {
        maxKills = currentSeriesKills;
    }

    return maxKills;
}

/**
 * Calculates best win streak and worst lose streak for a player from newest-first match history.
 */
export function calculatePlayerStreaks(matchesNewestFirst: MatchRecord[], playerName: string): PlayerStreaks {
    if (!playerName || matchesNewestFirst.length === 0) {
        return { bestStreak: 0, worstStreak: 0 };
    }

    let currentStreak = 0;
    let bestStreak = 0;
    let currentLoseStreak = 0;
    let worstStreak = 0;

    // Iterate backwards (oldest to newest) for streak
    [...matchesNewestFirst].reverse().forEach(m => {
        const isTeam1 = m.team1.some(p => p.name === playerName);
        const won = (isTeam1 && m.winner === 'team1') || (!isTeam1 && m.winner === 'team2');
        if (won) {
            currentStreak++;
            if (currentStreak > bestStreak) bestStreak = currentStreak;
            currentLoseStreak = 0;
        } else {
            currentLoseStreak++;
            if (currentLoseStreak > worstStreak) worstStreak = currentLoseStreak;
            currentStreak = 0;
        }
    });

    return { bestStreak, worstStreak };
}

/**
 * Computes full player analytics (recent matches, top heroes, partners, streaks, kills, Wilson score, level).
 */
export function calculatePlayerAnalytics(playerName: string, history: MatchRecord[]): PlayerAnalyticsResult {
    if (!playerName) {
        return {
            recentMatches: [],
            topHeroes: [],
            partnerStats: [],
            bestStreak: 0,
            worstStreak: 0,
            totalKills: 0,
            maxKills: 0,
            matchesCount: 0,
            winsCount: 0,
            lossesCount: 0,
            dynamicScore: 0,
            levelInfo: calculatePlayerLevel(0, 0, 0)
        };
    }

    // Filter matches involving this player
    const playerMatches = history
        .filter(m =>
            m.team1.some(p => p.name === playerName) ||
            m.team2.some(p => p.name === playerName)
        )
        .sort((a, b) => b.timestamp - a.timestamp); // Newest first

    let winsCount = 0;
    let lossesCount = 0;
    let totalKills = 0;

    const heroesMap = new Map<string, { matches: number; wins: number }>();

    playerMatches.forEach(m => {
        const isTeam1 = m.team1.some(p => p.name === playerName);
        const pData = isTeam1 ? m.team1.find(p => p.name === playerName) : m.team2.find(p => p.name === playerName);
        const won = (isTeam1 && m.winner === 'team1') || (!isTeam1 && m.winner === 'team2');

        if (won) winsCount++;
        else lossesCount++;

        if (pData && pData.heroName) {
            const hStart = heroesMap.get(pData.heroName) || { matches: 0, wins: 0 };
            hStart.matches++;
            if (won) hStart.wins++;
            heroesMap.set(pData.heroName, hStart);
        }

        if (pData && pData.kills !== undefined && pData.kills !== null) {
            totalKills += pData.kills;
        }
    });

    const matchesCount = playerMatches.length;

    // Calculate dynamic Wilson Score for this history selection
    const weightedBreakdown = getPlayerWeightedBreakdown(playerName, history);
    const dynamicScore = calculateWilsonScore(weightedBreakdown.totalWeightedWins, weightedBreakdown.totalWeightedMatches);

    const maxKills = calculateMaxKillsInSeries(playerMatches, playerName);

    const topHeroes = Array.from(heroesMap.entries())
        .map(([name, stats]) => {
            const score = calculateWilsonScore(stats.wins, stats.matches);
            return { name, ...stats, score };
        })
        .sort((a, b) => b.score - a.score || b.matches - a.matches || b.wins - a.wins)
        .slice(0, 5);

    const { bestStreak, worstStreak } = calculatePlayerStreaks(playerMatches, playerName);

    // Partner Stats (Other players played WITH this player)
    const partnerMap = new Map<string, { matches: number; wins: number }>();
    playerMatches.forEach(m => {
        if (m.team1.some(p => p.name === playerName)) {
            const won = m.winner === 'team1';
            m.team1.forEach(p => {
                if (p.name !== playerName && p.name) {
                    const s = partnerMap.get(p.name) || { matches: 0, wins: 0 };
                    s.matches++;
                    if (won) s.wins++;
                    partnerMap.set(p.name, s);
                }
            });
        }
        if (m.team2.some(p => p.name === playerName)) {
            const won = m.winner === 'team2';
            m.team2.forEach(p => {
                if (p.name !== playerName && p.name) {
                    const s = partnerMap.get(p.name) || { matches: 0, wins: 0 };
                    s.matches++;
                    if (won) s.wins++;
                    partnerMap.set(p.name, s);
                }
            });
        }
    });

    const partnerStats = Array.from(partnerMap.entries())
        .filter(([_, stats]) => stats.matches >= 1)
        .map(([name, stats]) => {
            const score = calculateWilsonScore(stats.wins, stats.matches);
            return { name, ...stats, score };
        })
        .sort((a, b) => b.score - a.score || b.matches - a.matches || b.wins - a.wins)
        .slice(0, 5);

    const levelInfo = calculatePlayerLevel(winsCount, lossesCount, totalKills);

    return {
        recentMatches: playerMatches.slice(0, 10),
        topHeroes,
        partnerStats,
        bestStreak,
        worstStreak,
        totalKills,
        maxKills,
        matchesCount,
        winsCount,
        lossesCount,
        dynamicScore,
        levelInfo
    };
}

/**
 * Computes hero analytics (recent matches, top players on the hero, best teammate synergies).
 */
export function calculateHeroAnalytics(heroName: string, history: MatchRecord[]): HeroAnalyticsResult {
    if (!heroName) {
        return {
            recentMatches: [],
            topPlayers: [],
            topSynergies: []
        };
    }

    const targetHeroKey = normalizeHeroKey(heroName);

    const heroMatches = history
        .filter(m =>
            m.team1.some(p => normalizeHeroKey(p.heroName) === targetHeroKey) ||
            m.team2.some(p => normalizeHeroKey(p.heroName) === targetHeroKey)
        )
        .sort((a, b) => b.timestamp - a.timestamp);

    const playersMap = new Map<string, { matches: number; wins: number }>();
    heroMatches.forEach(m => {
        const t1Idx = m.team1.findIndex(p => normalizeHeroKey(p.heroName) === targetHeroKey);
        const t2Idx = m.team2.findIndex(p => normalizeHeroKey(p.heroName) === targetHeroKey);

        if (t1Idx !== -1) {
            const pName = m.team1[t1Idx].name;
            const won = m.winner === 'team1';
            const pStart = playersMap.get(pName) || { matches: 0, wins: 0 };
            pStart.matches++;
            if (won) pStart.wins++;
            playersMap.set(pName, pStart);
        }
        if (t2Idx !== -1) {
            const pName = m.team2[t2Idx].name;
            const won = m.winner === 'team2';
            const pStart = playersMap.get(pName) || { matches: 0, wins: 0 };
            pStart.matches++;
            if (won) pStart.wins++;
            playersMap.set(pName, pStart);
        }
    });

    const topPlayers = Array.from(playersMap.entries())
        .map(([name, stats]) => {
            const score = calculateWilsonScore(stats.wins, stats.matches);
            return { name, ...stats, score };
        })
        .sort((a, b) => b.score - a.score || b.matches - a.matches || b.wins - a.wins)
        .slice(0, 5);

    const synergyMap = new Map<string, { matches: number; wins: number }>();
    heroMatches.forEach(m => {
        if (m.team1.some(p => normalizeHeroKey(p.heroName) === targetHeroKey)) {
            const won = m.winner === 'team1';
            m.team1.forEach(p => {
                if (normalizeHeroKey(p.heroName) !== targetHeroKey && p.heroName) {
                    const s = synergyMap.get(p.heroName) || { matches: 0, wins: 0 };
                    s.matches++;
                    if (won) s.wins++;
                    synergyMap.set(p.heroName, s);
                }
            });
        }
        if (m.team2.some(p => normalizeHeroKey(p.heroName) === targetHeroKey)) {
            const won = m.winner === 'team2';
            m.team2.forEach(p => {
                if (normalizeHeroKey(p.heroName) !== targetHeroKey && p.heroName) {
                    const s = synergyMap.get(p.heroName) || { matches: 0, wins: 0 };
                    s.matches++;
                    if (won) s.wins++;
                    synergyMap.set(p.heroName, s);
                }
            });
        }
    });

    const topSynergies = Array.from(synergyMap.entries())
        .filter(([_, stats]) => stats.matches >= 1)
        .map(([name, stats]) => {
            const score = calculateWilsonScore(stats.wins, stats.matches);
            return { name, ...stats, score };
        })
        .sort((a, b) => b.score - a.score || b.matches - a.matches || b.wins - a.wins)
        .slice(0, 5);

    return {
        recentMatches: heroMatches.slice(0, 10),
        topPlayers,
        topSynergies
    };
}
