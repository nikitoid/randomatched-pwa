import React, { useState, useMemo } from 'react';
import { 
    Clock, Sparkles, Layers, Filter, Check, History, UserX, 
    AlertCircle, SlidersHorizontal, ArrowRight, Shield
} from 'lucide-react';
import { BaseModal } from './common/BaseModal';
import { Avatar } from './common/Avatar';
import { CustomScrollbar } from './CustomScrollbar';
import { Hero, HeroList, MatchRecord } from '../types';
import { 
    calculateHeroesInactivity, 
    getFilteredInactiveHeroes, 
    getSourceHeroesForInactiveFilter, 
    InactivityCriterion, 
    InactiveHeroesFilterOptions 
} from '../utils/inactiveHeroes';
import { formatPlural, getPlural } from '../utils/heroNormalization';

interface InactiveHeroesModalProps {
    isOpen: boolean;
    onClose: () => void;
    lists: HeroList[];
    history: MatchRecord[];
    onCreateTemporaryList: (heroes: Hero[], name: string) => string;
    onSelectList: (id: string) => void;
    triggerHaptic: (pattern?: number | number[]) => void;
    addToast?: (message: string, type: 'info' | 'success' | 'error' | 'warning', duration?: number) => void;
}

const MATCHES_DEPTH_OPTIONS = [5, 10, 15, 20, 30, 50];
const DAYS_DEPTH_OPTIONS = [7, 14, 30, 60, 90];
const LIMIT_OPTIONS = [
    { value: 5, label: '5' },
    { value: 10, label: '10' },
    { value: 15, label: '15' },
    { value: 20, label: '20' },
    { value: 30, label: '30' },
    { value: 0, label: 'Все' }
];

export const InactiveHeroesModal: React.FC<InactiveHeroesModalProps> = ({
    isOpen,
    onClose,
    lists,
    history,
    onCreateTemporaryList,
    onSelectList,
    triggerHaptic,
    addToast
}) => {
    const [criterion, setCriterion] = useState<InactivityCriterion>('matches');
    const [depthMatches, setDepthMatches] = useState<number>(10);
    const [depthDays, setDepthDays] = useState<number>(30);
    const [limit, setLimit] = useState<number>(15);
    const [includeNeverPlayed, setIncludeNeverPlayed] = useState<boolean>(true);
    const [sourceListId, setSourceListId] = useState<string>('all');
    const [customListName, setCustomListName] = useState<string>('Забытые герои');

    // Reset custom list name when modal opens
    React.useEffect(() => {
        if (isOpen) {
            setCustomListName('Забытые герои');
        }
    }, [isOpen]);

    // Compute qualified inactive heroes in real-time
    const qualifiedItems = useMemo(() => {
        const sourceHeroes = getSourceHeroesForInactiveFilter(lists, sourceListId);
        const allInactive = calculateHeroesInactivity(sourceHeroes, history);
        const filterOptions: InactiveHeroesFilterOptions = {
            criterion,
            depthMatches,
            depthDays,
            limit,
            includeNeverPlayed,
            sourceListId
        };
        return getFilteredInactiveHeroes(allInactive, filterOptions);
    }, [lists, history, criterion, depthMatches, depthDays, limit, includeNeverPlayed, sourceListId]);

    const defaultListName = 'Забытые герои';

    const handleCreate = () => {
        if (qualifiedItems.length === 0) {
            if (addToast) addToast("Нет героев, соответствующих выбранным критериям", "warning");
            return;
        }

        triggerHaptic(20);
        const selectedHeroes = qualifiedItems.map(item => item.hero);
        const finalListName = customListName.trim() || defaultListName;

        const newId = onCreateTemporaryList(selectedHeroes, finalListName);
        onSelectList(newId);

        if (addToast) {
            addToast(`Временный список "${finalListName}" создан (${selectedHeroes.length} героев)`, "success");
        }

        onClose();
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            priority={35}
            icon={<Clock size={20} className="text-primary-500" />}
            title="Забытые герои"
            subtitle="Создание временного списка по давности игр"
        >
            <div className="p-4 sm:p-5 space-y-5">
                {/* 1. Источник героев */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Layers size={14} className="text-primary-500" />
                        Пул-источник персонажей
                    </label>
                    <select
                        value={sourceListId}
                        onChange={(e) => {
                            triggerHaptic(5);
                            setSourceListId(e.target.value);
                        }}
                        className="w-full h-11 px-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-sm font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/40 transition-all cursor-pointer"
                    >
                        <option value="all">Все доступные герои (объединенный пул)</option>
                        {lists.map(l => (
                            <option key={l.id} value={l.id}>
                                {l.name} ({l.heroes.length} героев){l.isTemporary ? ' [Врем.]' : ''}
                            </option>
                        ))}
                    </select>
                </div>

                {/* 2. Критерий глубины отбора */}
                <div className="space-y-2.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <SlidersHorizontal size={14} className="text-primary-500" />
                        Критерий давности
                    </label>
                    <div className="grid grid-cols-3 gap-2 bg-slate-100 dark:bg-slate-800/60 p-1.5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
                        <button
                            type="button"
                            onClick={() => { triggerHaptic(10); setCriterion('matches'); }}
                            className={`py-2 px-1 rounded-xl text-xs font-bold transition-all text-center flex flex-col items-center gap-0.5 ${
                                criterion === 'matches'
                                    ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm border border-slate-200/50 dark:border-slate-600/50'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                            }`}
                        >
                            <History size={15} />
                            <span>По матчам</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => { triggerHaptic(10); setCriterion('days'); }}
                            className={`py-2 px-1 rounded-xl text-xs font-bold transition-all text-center flex flex-col items-center gap-0.5 ${
                                criterion === 'days'
                                    ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm border border-slate-200/50 dark:border-slate-600/50'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                            }`}
                        >
                            <Clock size={15} />
                            <span>По дням</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => { triggerHaptic(10); setCriterion('top_inactive'); }}
                            className={`py-2 px-1 rounded-xl text-xs font-bold transition-all text-center flex flex-col items-center gap-0.5 ${
                                criterion === 'top_inactive'
                                    ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm border border-slate-200/50 dark:border-slate-600/50'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                            }`}
                        >
                            <UserX size={15} />
                            <span>Топ забытых</span>
                        </button>
                    </div>

                    {/* Настройка глубины (матчи / дни) */}
                    {criterion === 'matches' && (
                        <div className="pt-1">
                            <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                                <span>Не играли в последних:</span>
                                <span className="text-primary-600 dark:text-primary-400 font-bold">{depthMatches} матчах</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {MATCHES_DEPTH_OPTIONS.map(opt => (
                                    <button
                                        key={opt}
                                        type="button"
                                        onClick={() => { triggerHaptic(5); setDepthMatches(opt); }}
                                        className={`flex-1 min-w-[44px] py-1.5 rounded-xl text-xs font-bold border transition-all ${
                                            depthMatches === opt
                                                ? 'bg-primary-500 text-white border-primary-500 shadow-xs'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                                        }`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {criterion === 'days' && (
                        <div className="pt-1">
                            <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                                <span>Не появлялись более:</span>
                                <span className="text-primary-600 dark:text-primary-400 font-bold">{depthDays} дней</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {DAYS_DEPTH_OPTIONS.map(opt => (
                                    <button
                                        key={opt}
                                        type="button"
                                        onClick={() => { triggerHaptic(5); setDepthDays(opt); }}
                                        className={`flex-1 min-w-[44px] py-1.5 rounded-xl text-xs font-bold border transition-all ${
                                            depthDays === opt
                                                ? 'bg-primary-500 text-white border-primary-500 shadow-xs'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                                        }`}
                                    >
                                        {opt}д
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* 3. Ограничение количества героев & Чекбокс несыгравших */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                            Макс. героев в списке
                        </label>
                        <div className="flex gap-1">
                            {LIMIT_OPTIONS.map(opt => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => { triggerHaptic(5); setLimit(opt.value); }}
                                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                                        limit === opt.value
                                            ? 'bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-800 dark:border-slate-100 shadow-xs'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                        <div className="pr-2">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                                Несыгравшие (0 игр)
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 block leading-tight">
                                Включать героев без матчей
                            </span>
                        </div>
                        <input
                            type="checkbox"
                            checked={includeNeverPlayed}
                            onChange={(e) => { triggerHaptic(5); setIncludeNeverPlayed(e.target.checked); }}
                            className="w-5 h-5 rounded-lg border-slate-300 text-primary-600 focus:ring-primary-500 cursor-pointer accent-primary-500"
                        />
                    </div>
                </div>

                {/* 4. Имя создаваемого списка */}
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                        Название списка
                    </label>
                    <input
                        type="text"
                        value={customListName}
                        onChange={(e) => setCustomListName(e.target.value)}
                        placeholder={defaultListName}
                        className="w-full h-11 px-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                    />
                </div>

                {/* 5. Живой предпросмотр (Live Preview) */}
                <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <Sparkles size={14} className="text-amber-500" />
                            Предпросмотр героев
                        </span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-300">
                            {formatPlural(qualifiedItems.length, 'герой', 'героя', 'героев')}
                        </span>
                    </div>

                    <div className="max-h-[220px] rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 p-2 overflow-y-auto">
                        {qualifiedItems.length > 0 ? (
                            <div className="space-y-1.5">
                                {qualifiedItems.map(({ hero, matchesAgo, daysAgo, neverPlayed, totalMatchesPlayed }) => (
                                    <div
                                        key={hero.id || hero.name}
                                        className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/50 shadow-2xs"
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <Avatar entityType="hero" entityId={hero.name} name={hero.name} size="sm" />
                                            <div className="min-w-0">
                                                <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                                    {hero.name}
                                                </h4>
                                                <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate">
                                                    Ранг: {hero.rank || 'Обычный'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="text-right shrink-0">
                                            {neverPlayed ? (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                                    <UserX size={10} /> 0 игр (Никогда)
                                                </span>
                                            ) : (
                                                <div className="space-y-0.5">
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                                        <History size={10} /> {matchesAgo} {getPlural(matchesAgo, 'матч', 'матча', 'матчей')} назад
                                                    </span>
                                                    <div className="text-[9px] text-slate-400 dark:text-slate-500">
                                                        {daysAgo} дн. назад ({formatPlural(totalMatchesPlayed, 'игра', 'игры', 'игр')} всего)
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                                <AlertCircle size={24} className="mx-auto mb-1.5 opacity-40" />
                                Нет героев, подходящих под выбранные критерии.<br />
                                Попробуйте уменьшить глубину или включить героев с 0 игр.
                            </div>
                        )}
                    </div>
                </div>

                {/* 6. Кнопка создания */}
                <div className="pt-2">
                    <button
                        type="button"
                        onClick={handleCreate}
                        disabled={qualifiedItems.length === 0}
                        className="w-full h-12 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm shadow-lg shadow-primary-600/25 active:scale-[0.99] transition-all"
                    >
                        <Sparkles size={18} />
                        <span>Сформировать список ({qualifiedItems.length})</span>
                    </button>
                </div>
            </div>
        </BaseModal>
    );
};
