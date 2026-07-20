import { useMemo } from 'react';
import { MatchRecord, PlayerStat, HeroStat, MatchPlayer } from '../../../types';

export const calculateWilsonScore = (wins: number, total: number, z = 1.28): number => {
    if (total <= 0) return 0;
    const p = wins / total;
    const z2 = z * z;
    const numerator = p + z2 / (2 * total) - z * Math.sqrt((p * (1 - p) + z2 / (4 * total)) / total);
    const denominator = 1 + z2 / total;
    return Math.max(0, numerator / denominator);
};

export interface PeriodBreakdown {
    key: string;
    label: string;
    weightRange: string;
    icon: string;
    matches: number;
    wins: number;
    weightedMatches: number;
    weightedWins: number;
}

export interface PlayerWeightedBreakdown {
    playerName: string;
    totalMatches: number;
    totalWins: number;
    totalWeightedMatches: number;
    totalWeightedWins: number;
    periods: PeriodBreakdown[];
}

export const getPlayerWeightedBreakdown = (
    playerName: string,
    history: MatchRecord[],
    now: number = Date.now()
): PlayerWeightedBreakdown => {
    const HALF_LIFE_DAYS = 180;
    const cleanTargetName = playerName.trim().toLowerCase();

    const periods: PeriodBreakdown[] = [
        { key: 'fresh', label: 'Свежие (< 30 дн.)', weightRange: '100%–89%', icon: '⚡', matches: 0, wins: 0, weightedMatches: 0, weightedWins: 0 },
        { key: 'recent', label: 'Недавние (1–6 мес.)', weightRange: '88%–50%', icon: '⌛', matches: 0, wins: 0, weightedMatches: 0, weightedWins: 0 },
        { key: 'old', label: 'Старые (6–12 мес.)', weightRange: '49%–25%', icon: '📜', matches: 0, wins: 0, weightedMatches: 0, weightedWins: 0 },
        { key: 'ancient', label: 'Давние (> 1 года)', weightRange: '< 25%', icon: '⏳', matches: 0, wins: 0, weightedMatches: 0, weightedWins: 0 },
    ];

    let totalMatches = 0;
    let totalWins = 0;
    let totalWeightedMatches = 0;
    let totalWeightedWins = 0;

    history.forEach(match => {
        const winner = match.winner;
        const matchTimestamp = match.timestamp || now;
        const ageInDays = Math.max(0, (now - matchTimestamp) / (1000 * 60 * 60 * 24));
        const weight = Math.pow(2, -ageInDays / HALF_LIFE_DAYS);

        const inTeam1 = match.team1.some(p => p.name.trim().toLowerCase() === cleanTargetName);
        const inTeam2 = match.team2.some(p => p.name.trim().toLowerCase() === cleanTargetName);

        if (!inTeam1 && !inTeam2) return;

        const won = (inTeam1 && winner === 'team1') || (inTeam2 && winner === 'team2');

        totalMatches++;
        totalWeightedMatches += weight;
        if (won) {
            totalWins++;
            totalWeightedWins += weight;
        }

        let periodIndex = 0;
        if (ageInDays <= 30) {
            periodIndex = 0;
        } else if (ageInDays <= 180) {
            periodIndex = 1;
        } else if (ageInDays <= 365) {
            periodIndex = 2;
        } else {
            periodIndex = 3;
        }

        periods[periodIndex].matches++;
        periods[periodIndex].weightedMatches += weight;
        if (won) {
            periods[periodIndex].wins++;
            periods[periodIndex].weightedWins += weight;
        }
    });

    periods.forEach(p => {
        p.weightedMatches = Number(p.weightedMatches.toFixed(2));
        p.weightedWins = Number(p.weightedWins.toFixed(2));
    });

    return {
        playerName,
        totalMatches,
        totalWins,
        totalWeightedMatches: Number(totalWeightedMatches.toFixed(2)),
        totalWeightedWins: Number(totalWeightedWins.toFixed(2)),
        periods
    };
};


export const useStatsCalculations = (filteredHistory: MatchRecord[]) => {
    return useMemo(() => {
        const playerStats: Record<string, PlayerStat> = {};
        const heroStats: Record<string, HeroStat> = {};
        let totalMatches = 0;

        const playerWeightedStats: Record<string, { weightedWins: number; weightedMatches: number }> = {};
        const now = Date.now();
        const INACTIVITY_DAYS = 60;
        const INACTIVITY_MS = INACTIVITY_DAYS * 24 * 60 * 60 * 1000;
        const HALF_LIFE_DAYS = 180;

        filteredHistory.forEach(match => {
            totalMatches++;
            const winner = match.winner;
            const matchTimestamp = match.timestamp || now;
            const ageInDays = Math.max(0, (now - matchTimestamp) / (1000 * 60 * 60 * 24));
            // Экспоненциальное затухание по времени: W = 2^(-ageInDays / HALF_LIFE_DAYS)
            const weight = Math.pow(2, -ageInDays / HALF_LIFE_DAYS);

            const processPlayer = (name: string, won: boolean, heroName: string, kills?: number) => {
                const cleanName = name.trim();
                const cleanHero = heroName.trim() || 'Unknown';
                if (!cleanName) return;

                if (!playerStats[cleanName]) {
                    playerStats[cleanName] = {
                        name: cleanName,
                        matches: 0,
                        wins: 0,
                        losses: 0,
                        heroesPlayed: {},
                        score: 0,
                        totalKills: 0,
                        avgKills: 0,
                        lastMatchTimestamp: 0,
                        isInactive: false
                    };
                    playerWeightedStats[cleanName] = { weightedWins: 0, weightedMatches: 0 };
                }
                playerStats[cleanName].matches++;
                if (won) playerStats[cleanName].wins++;
                else playerStats[cleanName].losses++;

                playerWeightedStats[cleanName].weightedMatches += weight;
                if (won) {
                    playerWeightedStats[cleanName].weightedWins += weight;
                }

                if (!playerStats[cleanName].lastMatchTimestamp || matchTimestamp > playerStats[cleanName].lastMatchTimestamp!) {
                    playerStats[cleanName].lastMatchTimestamp = matchTimestamp;
                }

                if (kills !== undefined && kills !== null) {
                    playerStats[cleanName].totalKills = (playerStats[cleanName].totalKills || 0) + kills;
                }

                playerStats[cleanName].heroesPlayed[cleanHero] = (playerStats[cleanName].heroesPlayed[cleanHero] || 0) + 1;

                // Hero Stats
                if (cleanHero !== 'Unknown') {
                    if (!heroStats[cleanHero]) {
                        heroStats[cleanHero] = { name: cleanHero, matches: 0, wins: 0, losses: 0, totalKills: 0, avgKills: 0 };
                    }
                    heroStats[cleanHero].matches++;
                    if (won) heroStats[cleanHero].wins++;
                    else heroStats[cleanHero].losses++;
                    if (kills !== undefined && kills !== null) {
                        heroStats[cleanHero].totalKills = (heroStats[cleanHero].totalKills || 0) + kills;
                    }
                }
            };

            match.team1.forEach(p => processPlayer(p.name, winner === 'team1', p.heroName, p.kills));
            match.team2.forEach(p => processPlayer(p.name, winner === 'team2', p.heroName, p.kills));
        });

        // Calculate avgKills for Heroes
        Object.values(heroStats).forEach(h => {
            h.avgKills = h.matches > 0 ? (h.totalKills || 0) / h.matches : 0;
        });

        // Calculate Weighted Score for Players (Wilson Score Interval with Time-Decay)
        Object.values(playerStats).forEach(p => {
            const weighted = playerWeightedStats[p.name] || { weightedWins: p.wins, weightedMatches: p.matches };
            p.weightedWins = Number(weighted.weightedWins.toFixed(2));
            p.weightedMatches = Number(weighted.weightedMatches.toFixed(2));
            p.score = calculateWilsonScore(weighted.weightedWins, weighted.weightedMatches);
            p.avgKills = p.matches > 0 ? (p.totalKills || 0) / p.matches : 0;
            if (p.lastMatchTimestamp && (now - p.lastMatchTimestamp > INACTIVITY_MS)) {
                p.isInactive = true;
            } else {
                p.isInactive = false;
            }
        });

        const isQualified = (p: PlayerStat) => !p.isInactive && p.matches >= 3 && (p.weightedMatches ?? p.matches) >= 3.0;

        const sortedPlayers = Object.values(playerStats).sort((a, b) => {
            const aActive = !a.isInactive ? 1 : 0;
            const bActive = !b.isInactive ? 1 : 0;
            if (aActive !== bActive) return bActive - aActive;

            return b.score - a.score || b.wins - a.wins;
        });
        const sortedHeroes = Object.values(heroStats).sort((a, b) => (b.wins / b.matches) - (a.wins / a.matches) || b.matches - a.matches);

        // Hero Nominations
        const qualifiedHeroes = sortedHeroes.filter(h => h.matches >= 3);
        const topWinrateHero = qualifiedHeroes.length > 0 ? qualifiedHeroes[0] : (sortedHeroes.length > 0 ? sortedHeroes[0] : null);
        const mostPopularHero = [...sortedHeroes].sort((a, b) => b.matches - a.matches || (b.wins / b.matches) - (a.wins / a.matches))[0] || null;
        const mostDeadlyHero = [...(qualifiedHeroes.length > 0 ? qualifiedHeroes : sortedHeroes)]
            .filter(h => (h.totalKills || 0) > 0)
            .sort((a, b) => (b.avgKills || 0) - (a.avgKills || 0) || (b.totalKills || 0) - (a.totalKills || 0))[0] || null;

        const qualifiedPlayers = sortedPlayers.filter(isQualified);
        const mvp = qualifiedPlayers.length > 0 ? qualifiedPlayers[0] : (sortedPlayers.length > 0 ? sortedPlayers[0] : null);
        // Базовый underdog по винрейту (fallback) — минимум 3 матча для объективности
        const qualifiedForUnderdog = sortedPlayers.filter(p => isQualified(p) && (!mvp || p.name !== mvp.name));
        const fallbackUnderdog = qualifiedForUnderdog.length > 0
            ? qualifiedForUnderdog[qualifiedForUnderdog.length - 1]
            : (qualifiedPlayers.length > 1 ? qualifiedPlayers[qualifiedPlayers.length - 1] : null);

        // Streak Calculation (победы и поражения)
        // lastStreakMatchIndex отслеживает индекс последнего матча в серии игрока
        const streakStats: Record<string, {
            current: number, // текущая серия побед (положительное) 
            max: number,
            lastStreakMatchIndex: number,
            loseStreak: number, // текущая серия поражений
            lastLoseStreakMatchIndex: number
        }> = {};
        // History is Newest -> Oldest. Reverse to process chronologically.
        const reversedHistory = [...filteredHistory].reverse();
        reversedHistory.forEach((match, matchIndex) => {
            const winner = match.winner;
            const processStreak = (p: MatchPlayer, won: boolean) => {
                const name = p.name;
                if (!streakStats[name]) streakStats[name] = {
                    current: 0,
                    max: 0,
                    lastStreakMatchIndex: -1,
                    loseStreak: 0,
                    lastLoseStreakMatchIndex: -1
                };

                if (won) {
                    streakStats[name].current += 1;
                    streakStats[name].lastStreakMatchIndex = matchIndex;
                    if (streakStats[name].current > streakStats[name].max) {
                        streakStats[name].max = streakStats[name].current;
                    }
                    // Сбрасываем серию поражений при победе
                    streakStats[name].loseStreak = 0;
                    streakStats[name].lastLoseStreakMatchIndex = -1;
                } else {
                    // Сбрасываем серию побед при поражении
                    streakStats[name].current = 0;
                    streakStats[name].lastStreakMatchIndex = -1;
                    // Увеличиваем серию поражений
                    streakStats[name].loseStreak += 1;
                    streakStats[name].lastLoseStreakMatchIndex = matchIndex;
                }
            };

            match.team1.forEach(p => processStreak(p, winner === 'team1'));
            match.team2.forEach(p => processStreak(p, winner === 'team2'));
        });

        // Find Best Active Win Streak ("В огне")
        // При равных сериях приоритет отдаётся тому, кто последним получил этот статус
        let bestStreakPlayer: { name: string, streak: number } | null = null;
        let bestStreakMatchIndex = -1;
        Object.entries(streakStats).forEach(([name, stats]) => {
            if (stats.current >= 3) {
                if (!bestStreakPlayer ||
                    stats.current > bestStreakPlayer.streak ||
                    (stats.current === bestStreakPlayer.streak && stats.lastStreakMatchIndex > bestStreakMatchIndex)) {
                    bestStreakPlayer = { name, streak: stats.current };
                    bestStreakMatchIndex = stats.lastStreakMatchIndex;
                }
            }
        });

        // Find Underdog (комбинированный подход)
        // Приоритет 1: Игрок с активной серией поражений >= 3
        // Приоритет 2: При равных сериях — последний получивший этот статус
        // Fallback: Игрок с худшим винрейтом (>= 3 матчей)
        let underdogByLoseStreak: { name: string, loseStreak: number, player: PlayerStat } | null = null;
        let underdogLoseStreakMatchIndex = -1;
        Object.entries(streakStats).forEach(([name, stats]) => {
            if (stats.loseStreak >= 3) {
                const player = playerStats[name];
                if (player && (!mvp || player.name !== mvp.name)) {
                    if (!underdogByLoseStreak ||
                        stats.loseStreak > underdogByLoseStreak.loseStreak ||
                        (stats.loseStreak === underdogByLoseStreak.loseStreak && stats.lastLoseStreakMatchIndex > underdogLoseStreakMatchIndex)) {
                        underdogByLoseStreak = { name, loseStreak: stats.loseStreak, player };
                        underdogLoseStreakMatchIndex = stats.lastLoseStreakMatchIndex;
                    }
                }
            }
        });

        // Финальный underdog: приоритет серии поражений, иначе fallback
        const underdog = underdogByLoseStreak ? underdogByLoseStreak.player : fallbackUnderdog;

        // --- РАСЧЕТ БОЕВОЙ СТАТИСТИКИ (КИЛЛОВ) ---
        const playerMatchesMap: Record<string, MatchRecord[]> = {};
        filteredHistory.forEach(match => {
            const processPlayerMatch = (p: MatchPlayer) => {
                const name = p.name.trim();
                if (!name) return;
                if (!playerMatchesMap[name]) {
                    playerMatchesMap[name] = [];
                }
                playerMatchesMap[name].push(match);
            };
            match.team1.forEach(processPlayerMatch);
            match.team2.forEach(processPlayerMatch);
        });

        const playerKillsStats: Record<string, { total: number, maxSeries: number }> = {};
        Object.entries(playerMatchesMap).forEach(([name, matches]) => {
            const sorted = [...matches].sort((a, b) => a.timestamp - b.timestamp);
            let total = 0;
            let maxSeries = 0;
            let currentSeriesKills = 0;
            let lastTimestamp = 0;

            sorted.forEach(m => {
                const isTeam1 = m.team1.some(p => p.name === name);
                const pData = isTeam1 ? m.team1.find(p => p.name === name) : m.team2.find(p => p.name === name);
                const kills = (pData && pData.kills !== undefined && pData.kills !== null) ? pData.kills : 0;
                total += kills;

                if (lastTimestamp === 0) {
                    currentSeriesKills = kills;
                    lastTimestamp = m.timestamp;
                } else if (m.timestamp - lastTimestamp <= 6 * 60 * 60 * 1000) {
                    currentSeriesKills += kills;
                    lastTimestamp = m.timestamp;
                } else {
                    if (currentSeriesKills > maxSeries) {
                        maxSeries = currentSeriesKills;
                    }
                    currentSeriesKills = kills;
                    lastTimestamp = m.timestamp;
                }
            });
            if (currentSeriesKills > maxSeries) {
                maxSeries = currentSeriesKills;
            }

            playerKillsStats[name] = {
                total,
                maxSeries
            };
        });

        // 1. Лидер по серии убийств
        let topKillsSeriesPlayer: { name: string, record: number } | null = null;
        Object.entries(playerKillsStats).forEach(([name, stats]) => {
            if (stats.maxSeries > 0) {
                if (!topKillsSeriesPlayer || stats.maxSeries > topKillsSeriesPlayer.record) {
                    topKillsSeriesPlayer = { name, record: stats.maxSeries };
                }
            }
        });

        // 2. Лидеры по общему числу убийств (топ-3)
        const topTotalKillers = Object.entries(playerKillsStats)
            .map(([name, stats]) => ({ name, total: stats.total }))
            .filter(k => k.total > 0)
            .sort((a, b) => b.total - a.total)
            .slice(0, 3);

        // 3. Самый кровавый матч
        let bloodiestMatch: { id: string, timestamp: number, totalKills: number, players: string } | null = null;
        let totalKillsAll = 0;
        filteredHistory.forEach(m => {
            const t1Kills = m.team1.reduce((sum, p) => sum + (p.kills || 0), 0);
            const t2Kills = m.team2.reduce((sum, p) => sum + (p.kills || 0), 0);
            const total = t1Kills + t2Kills;
            totalKillsAll += total;

            if (total > 0) {
                if (!bloodiestMatch || total > bloodiestMatch.totalKills) {
                    const playerNames = [...m.team1, ...m.team2].map(p => p.name).join(', ');
                    bloodiestMatch = {
                        id: m.id,
                        timestamp: m.timestamp,
                        totalKills: total,
                        players: playerNames
                    };
                }
            }
        });

        const avgKillsPerMatch = filteredHistory.length > 0 ? totalKillsAll / filteredHistory.length : 0;

        // 1. Кандидаты на MVP (топ-5 по эффективности из игроков с >= 3 матчами)
        const mvpCandidates = sortedPlayers.filter(p => p.matches >= 3).slice(0, 5);

        // 2. Кандидаты на Underdog (топ-5)
        const playersWithStats = sortedPlayers.filter(p => p.matches >= 3 && (!mvp || p.name !== mvp.name));
        const withLoseStreak = playersWithStats
            .filter(p => (streakStats[p.name]?.loseStreak || 0) >= 3)
            .sort((a, b) => {
                const sA = streakStats[a.name];
                const sB = streakStats[b.name];
                return sB.loseStreak - sA.loseStreak || sB.lastLoseStreakMatchIndex - sA.lastLoseStreakMatchIndex;
            });
        const withoutLoseStreak = playersWithStats
            .filter(p => (streakStats[p.name]?.loseStreak || 0) < 3)
            .reverse();
        const underdogCandidates = [...withLoseStreak, ...withoutLoseStreak].slice(0, 5);

        // 3. Кандидаты на "В огне" (топ-5 по текущей серии побед >= 3)
        const streakCandidates = Object.entries(streakStats)
            .map(([name, stats]) => ({ name, streak: stats.current }))
            .filter(s => s.streak >= 3)
            .sort((a, b) => b.streak - a.streak || (streakStats[b.name]?.lastStreakMatchIndex || 0) - (streakStats[a.name]?.lastStreakMatchIndex || 0))
            .slice(0, 5);

        // 4. Кандидаты на Рекорд за встречу (серия убийств, топ-5)
        const seriesKillsCandidates = Object.entries(playerKillsStats)
            .map(([name, stats]) => ({ name, record: stats.maxSeries }))
            .filter(k => k.record > 0)
            .sort((a, b) => b.record - a.record)
            .slice(0, 5);

        // 5. Кандидаты на Короля убийств (топ-5 по общему числу убийств)
        const totalKillsCandidates = Object.entries(playerKillsStats)
            .map(([name, stats]) => ({ name, total: stats.total }))
            .filter(k => k.total > 0)
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);

        return {
            totalMatches,
            sortedPlayers,
            sortedHeroes,
            topWinrateHero,
            mostPopularHero,
            mostDeadlyHero,
            mvp,
            underdog,
            streakStats,
            bestStreakPlayer,
            topKillsSeriesPlayer,
            topTotalKillers,
            bloodiestMatch,
            totalKillsAll,
            avgKillsPerMatch,
            mvpCandidates,
            underdogCandidates,
            streakCandidates,
            seriesKillsCandidates,
            totalKillsCandidates
        };
    }, [filteredHistory]);
};
