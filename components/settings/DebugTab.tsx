import React from 'react';
import { Database, RefreshCw, Trash, Sparkles } from 'lucide-react';
import { HeroList, MatchRecord } from '../../types';
import { CHANGELOG } from '../../utils/changelog';
import { generateUUID } from '../../utils/uuid';
import { shuffleArray } from '../../utils/generator';
import { getStorageSnapshot } from '../../utils/storage';

interface DebugTabProps {
    lists: HeroList[];
    onImportData?: (data: { history: MatchRecord[]; deletedHistory: MatchRecord[] }) => boolean;
    addToast?: (message: string, type: 'info' | 'success' | 'error' | 'warning', duration?: number) => void;
    lastSeenVersion?: string | null;
    onSetLastSeenVersion?: (version: string | null) => void;
    onOpenChangelog: () => void;
    triggerHaptic: (pattern?: number | number[]) => void;
}

/**
 * Developer debug tab: localStorage usage inspector, demo match generator, history wipe, and changelog tester.
 */
export const DebugTab: React.FC<DebugTabProps> = ({
    lists,
    onImportData,
    addToast,
    lastSeenVersion,
    onSetLastSeenVersion,
    onOpenChangelog,
    triggerHaptic
}) => {
    const handleGenerateDemoHistory = () => {
        triggerHaptic(20);
        const allHeroes = lists.flatMap(l => l.heroes).filter(h => h.name.trim());
        if (allHeroes.length < 4) {
            if (addToast) addToast('Сначала добавьте героев в списки (минимум 4)', 'warning');
            return;
        }

        const players = ['Игрок 1', 'Игрок 2', 'Игрок 3', 'Игрок 4'];
        const demoHistory: MatchRecord[] = [];
        const now = Date.now();

        for (let i = 0; i < 15; i++) {
            const shuffledHeroes = shuffleArray(allHeroes);
            const selectedHeroes = shuffledHeroes.slice(0, 4);

            const team1 = [
                { name: players[0], heroId: selectedHeroes[0].id, heroName: selectedHeroes[0].name },
                { name: players[1], heroId: selectedHeroes[1].id, heroName: selectedHeroes[1].name }
            ];
            const team2 = [
                { name: players[2], heroId: selectedHeroes[2].id, heroName: selectedHeroes[2].name },
                { name: players[3], heroId: selectedHeroes[3].id, heroName: selectedHeroes[3].name }
            ];

            const winner: 'team1' | 'team2' = Math.random() > 0.5 ? 'team1' : 'team2';

            demoHistory.push({
                id: generateUUID(),
                timestamp: now - i * 3600 * 1000 * 12,
                lastUpdated: now,
                team1,
                team2,
                winner
            });
        }

        if (onImportData) {
            onImportData({ history: demoHistory, deletedHistory: [] });
            if (addToast) addToast('Сгенерировано 15 демо-матчей', 'success');
        }
    };

    const handleClearAllHistory = () => {
        triggerHaptic(30);
        if (window.confirm('Вы уверены, что хотите полностью очистить всю историю матчей? Это действие перезапишет локальные данные и синхронизируется с облаком при следующем обмене.')) {
            if (onImportData) {
                onImportData({ history: [], deletedHistory: [] });
                if (addToast) addToast('История полностью очищена', 'success');
            }
        }
    };

    return (
        <div className="flex flex-col items-center justify-start min-h-full p-4 sm:p-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="w-full max-w-sm flex flex-col gap-4">
                {/* LocalStorage Summary Card */}
                <div className="bg-white/80 dark:bg-slate-900/80 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
                    <h3 className="font-bold mb-3 flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        <Database size={15} /> Сводка LocalStorage
                    </h3>
                    <div className="text-xs font-mono space-y-1.5 max-h-40 overflow-y-auto no-scrollbar bg-slate-900 text-slate-200 p-3 rounded-xl border border-slate-800">
                        {getStorageSnapshot().map(({ key, value }) => {
                            const displaySize = parseFloat(`${(value.length * 2) / 1024}`).toFixed(2);
                            return (
                                <div key={key} className="flex justify-between gap-4 border-b border-slate-800/80 pb-1 last:border-0 last:pb-0">
                                    <span className="truncate text-slate-400">{key}</span>
                                    <span className="font-bold text-emerald-400 shrink-0">{displaySize} KB</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Quick Actions Card */}
                <div className="bg-white/80 dark:bg-slate-900/80 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800/80 space-y-2.5 shadow-xs">
                    <h3 className="font-bold flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                        Быстрые действия
                    </h3>

                    <button
                        onClick={handleGenerateDemoHistory}
                        className="w-full py-3 px-4 flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 active:scale-95 text-white rounded-xl font-bold text-xs shadow-md shadow-violet-600/20 transition-all"
                    >
                        <RefreshCw size={15} />
                        <span>Создать демо-историю (15 игр)</span>
                    </button>

                    <button
                        onClick={handleClearAllHistory}
                        className="w-full py-3 px-4 flex items-center justify-center gap-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 active:scale-95 text-white rounded-xl font-bold text-xs shadow-md shadow-rose-600/20 transition-all"
                    >
                        <Trash size={15} />
                        <span>Полная очистка истории</span>
                    </button>
                </div>

                {/* Changelog Debug Card */}
                <div className="bg-white/80 dark:bg-slate-900/80 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800/80 space-y-3 shadow-xs">
                    <h3 className="font-bold flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                        <Sparkles size={15} /> Прочитанная версия чейнджлога
                    </h3>

                    <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600 dark:text-slate-400 font-medium">Сохраненная версия:</span>
                        <span className="font-mono font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/50 px-2 py-0.5 rounded-md border border-primary-200/40 dark:border-primary-800/30">
                            {lastSeenVersion ? `v${lastSeenVersion}` : 'null (Новый юзер)'}
                        </span>
                    </div>

                    <div className="space-y-2">
                        <select
                            value={lastSeenVersion || 'ALL_UNREAD'}
                            onChange={(e) => {
                                onSetLastSeenVersion && onSetLastSeenVersion(e.target.value === 'ALL_UNREAD' ? null : e.target.value);
                                triggerHaptic(10);
                            }}
                            className="w-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white text-xs font-bold rounded-xl px-3 py-2.5 border border-slate-200 dark:border-slate-800 focus:outline-none truncate cursor-pointer"
                        >
                            <option value="ALL_UNREAD">null — (Новый юзер: ВСЁ непрочитано)</option>
                            <option value="2.2.6">v2.2.6 — (Старый юзер: от v2.3.0 непрочитано)</option>
                            {CHANGELOG.map(r => (
                                <option key={r.version} value={r.version}>
                                    v{r.version} — {r.title ? r.title.slice(0, 26) + '...' : r.date}
                                </option>
                            ))}
                        </select>

                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => {
                                    onSetLastSeenVersion && onSetLastSeenVersion('2.2.6');
                                    triggerHaptic(10);
                                }}
                                className="py-2.5 px-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-xl text-[11px] font-bold transition-all shadow-xs text-center truncate"
                                title="От v2.3.0 и выше непрочитано (существующий юзер)"
                            >
                                v2.2.6 (Старый)
                            </button>
                            <button
                                onClick={() => {
                                    onSetLastSeenVersion && onSetLastSeenVersion(null);
                                    triggerHaptic(10);
                                }}
                                className="py-2.5 px-2 bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white rounded-xl text-[11px] font-bold transition-all shadow-xs text-center truncate"
                                title="Вся история непрочитана (новый юзер)"
                            >
                                Всё новое (Новый)
                            </button>
                        </div>

                        <button
                            onClick={() => {
                                onOpenChangelog();
                                triggerHaptic(10);
                            }}
                            className="w-full py-2.5 px-2.5 bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs shadow-primary-500/20 truncate"
                        >
                            <Sparkles size={15} />
                            <span>Протестировать чейнджлог</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
