export interface RankTier {
    name: string;
    iconName: string;
    bgClass: string;
    textClass: string;
    borderClass: string;
    badgeBg: string;
    colorHex: string;
}

export interface PlayerLevelInfo {
    totalXP: number;
    level: number;
    currentXP: number;
    xpForNextLevel: number;
    progressPercent: number;
    xpFromWins: number;
    xpFromLosses: number;
    xpFromKills: number;
    tier: RankTier;
}

export const XP_PER_WIN = 100;
export const XP_PER_LOSS = 40;
export const XP_PER_KILL = 15;
export const XP_PER_LEVEL = 200;

export function getRankTier(level: number): RankTier {
    if (level <= 3) {
        return {
            name: 'Новичок',
            iconName: 'Shield',
            bgClass: 'bg-amber-900/10 dark:bg-amber-950/40',
            textClass: 'text-amber-800 dark:text-amber-300',
            borderClass: 'border-amber-300/80 dark:border-amber-700/60',
            badgeBg: 'from-amber-700 to-amber-900 text-amber-100',
            colorHex: '#d97706'
        };
    }
    if (level <= 6) {
        return {
            name: 'Боец',
            iconName: 'Swords',
            bgClass: 'bg-slate-500/10 dark:bg-slate-800/60',
            textClass: 'text-slate-700 dark:text-slate-200',
            borderClass: 'border-slate-300 dark:border-slate-700',
            badgeBg: 'from-slate-600 to-slate-800 text-slate-100',
            colorHex: '#64748b'
        };
    }
    if (level <= 10) {
        return {
            name: 'Ветеран',
            iconName: 'Award',
            bgClass: 'bg-blue-500/10 dark:bg-blue-950/50',
            textClass: 'text-blue-700 dark:text-blue-300',
            borderClass: 'border-blue-300 dark:border-blue-700/60',
            badgeBg: 'from-blue-600 to-indigo-800 text-blue-100',
            colorHex: '#3b82f6'
        };
    }
    if (level <= 15) {
        return {
            name: 'Мастер',
            iconName: 'Trophy',
            bgClass: 'bg-amber-500/15 dark:bg-amber-500/20',
            textClass: 'text-amber-700 dark:text-amber-300',
            borderClass: 'border-amber-400 dark:border-amber-500/60',
            badgeBg: 'from-amber-400 to-yellow-600 text-amber-950',
            colorHex: '#f59e0b'
        };
    }
    if (level <= 20) {
        return {
            name: 'Грандмастер',
            iconName: 'Sparkles',
            bgClass: 'bg-emerald-500/15 dark:bg-emerald-500/20',
            textClass: 'text-emerald-700 dark:text-emerald-300',
            borderClass: 'border-emerald-400 dark:border-emerald-500/60',
            badgeBg: 'from-teal-500 to-emerald-700 text-teal-50',
            colorHex: '#10b981'
        };
    }
    return {
        name: 'Легенда',
        iconName: 'Crown',
        bgClass: 'bg-gradient-to-r from-orange-500/15 via-rose-500/15 to-purple-500/15 dark:from-orange-950/40 dark:via-rose-950/40 dark:to-purple-950/40',
        textClass: 'text-rose-600 dark:text-rose-300 font-extrabold',
        borderClass: 'border-rose-400/80 dark:border-rose-500/70',
        badgeBg: 'from-orange-500 via-rose-600 to-purple-600 text-white shadow-md shadow-rose-500/20',
        colorHex: '#f43f5e'
    };
}

export interface RankTierDetail extends RankTier {
    levelRange: string;
    xpRange: string;
}

export const ALL_RANK_TIERS_INFO: RankTierDetail[] = [
    { ...getRankTier(1), levelRange: 'LVL 1 – 3', xpRange: '0 – 599 XP' },
    { ...getRankTier(4), levelRange: 'LVL 4 – 6', xpRange: '600 – 1 199 XP' },
    { ...getRankTier(7), levelRange: 'LVL 7 – 10', xpRange: '1 200 – 1 999 XP' },
    { ...getRankTier(11), levelRange: 'LVL 11 – 15', xpRange: '2 000 – 2 999 XP' },
    { ...getRankTier(16), levelRange: 'LVL 16 – 20', xpRange: '3 000 – 3 999 XP' },
    { ...getRankTier(21), levelRange: 'LVL 21+', xpRange: '4 000+ XP' },
];

export function calculatePlayerLevel(wins: number, losses: number, totalKills: number = 0): PlayerLevelInfo {
    const xpFromWins = wins * XP_PER_WIN;
    const xpFromLosses = losses * XP_PER_LOSS;
    const xpFromKills = totalKills * XP_PER_KILL;

    const totalXP = xpFromWins + xpFromLosses + xpFromKills;
    const level = Math.floor(totalXP / XP_PER_LEVEL) + 1;
    const currentXP = totalXP % XP_PER_LEVEL;
    const xpForNextLevel = XP_PER_LEVEL;
    const progressPercent = Math.min(100, Math.round((currentXP / XP_PER_LEVEL) * 100));
    const tier = getRankTier(level);

    return {
        totalXP,
        level,
        currentXP,
        xpForNextLevel,
        progressPercent,
        xpFromWins,
        xpFromLosses,
        xpFromKills,
        tier
    };
}
