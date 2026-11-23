import React from 'react';
import {
    Dice5, Sparkles, SlidersHorizontal, ChevronDown, Check, Minus, History,
    UserCheck, Terminal, HelpCircle, Info
} from 'lucide-react';
import { GenerationMode, ExtraGenerationMode } from '../../types';
import { Z_INDEX_BASE } from '../../constants/zIndex';
import { BaseModal } from '../common/BaseModal';

export const GENERATION_MODES = [
    { id: 'random', label: 'Рандом', desc: 'Чистая случайность', icon: Dice5, color: 'text-slate-500 dark:text-slate-400', bg: 'bg-slate-100 dark:bg-slate-800' },
    { id: 'balanced', label: 'Баланс', desc: 'Умный баланс сил', icon: Sparkles, color: 'text-primary-600 dark:text-primary-400', bg: 'bg-primary-50 dark:bg-primary-900/20' },
    { id: 'strict', label: 'Лимит', desc: 'Точный контроль (±)', icon: SlidersHorizontal, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20' }
] as const;

export const EXTRA_MODES = [
    { id: 'none', label: 'Без истории', desc: 'Все герои равны', icon: Minus, color: 'text-slate-400', bg: 'bg-slate-100 dark:bg-slate-800' },
    { id: 'global_freshness', label: 'История матчей', desc: 'Общая свежесть героев', icon: History, color: 'text-primary-600 dark:text-primary-400', bg: 'bg-primary-50 dark:bg-primary-900/20' },
    { id: 'player_freshness', label: 'Свежесть игрока', desc: 'Индивидуально для игрока', icon: UserCheck, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' }
] as const;

interface GenerationModePopoverProps {
    generationMode: GenerationMode;
    setGenerationMode: (mode: GenerationMode) => void;
    balanceThreshold: number;
    setBalanceThreshold?: (val: number) => void;
    activeExtraMode: ExtraGenerationMode;
    setExtraMode?: (mode: ExtraGenerationMode) => void;
    prioritizeUnplayed: boolean;
    setPrioritizeUnplayed?: (val: boolean) => void;
    isModeSelectorOpen: boolean;
    setIsModeSelectorOpen: (open: boolean) => void;
    isExtraModeSelectorOpen: boolean;
    setIsExtraModeSelectorOpen: (open: boolean) => void;
    isDebugMode: boolean;
    onOpenWeightsModal: () => void;
    showInfo: boolean;
    setShowInfo: (show: boolean) => void;
}

/**
 * Mode selector pill, generation/freshness dropdowns, debug weights button, and algorithm info modal.
 */
export const GenerationModePopover: React.FC<GenerationModePopoverProps> = ({
    generationMode,
    setGenerationMode,
    balanceThreshold,
    setBalanceThreshold,
    activeExtraMode,
    setExtraMode,
    prioritizeUnplayed,
    setPrioritizeUnplayed,
    isModeSelectorOpen,
    setIsModeSelectorOpen,
    isExtraModeSelectorOpen,
    setIsExtraModeSelectorOpen,
    isDebugMode,
    onOpenWeightsModal,
    showInfo,
    setShowInfo
}) => {
    const currentMode = GENERATION_MODES.find(m => m.id === generationMode) || GENERATION_MODES[0];

    const getModeTitle = () =>
        generationMode === 'random' ? 'Рандом (Чистый фан)' :
        generationMode === 'balanced' ? 'Умный баланс' :
        'Настраиваемый лимит (±)';

    const getModeDescription = () => {
        if (generationMode === 'random') {
            return 'Герои распределяются абсолютно случайно без учета их силы или винрейта. Этот режим обеспечивает максимальную непредсказуемость. Идеально подходит для веселых, неофициальных матчей, когда важен элемент неожиданности и фан.';
        }
        if (generationMode === 'balanced') {
            return 'Оптимальный режим для честной игры. Алгоритм моделирует множественные варианты составов и находит наиболее равную комбинацию героев с минимальной разницей в силе команд (не более 1 балла). Вы получаете равные шансы на победу, сохраняя дух случайностей.';
        }
        return 'Режим точного контроля баланса. Вы сами задаете максимально допустимую разницу силы между командами (показатель «±»). Алгоритм выполняет серию симуляций и находит комбинацию героев, которая строго вписывается в указанный вами лимит.';
    };

    const getPrioritizeUnplayedDescription = () => {
        if (generationMode === 'random') {
            return prioritizeUnplayed
                ? 'Герои выбираются случайно, но персонажи, давно не игравшие в предыдущих матчах, имеют повышенный шанс выпасть.'
                : 'Включите эту опцию, чтобы сделать случайный выбор более разнообразным и реже видеть недавно игравших героев.';
        }
        if (generationMode === 'balanced') {
            return prioritizeUnplayed
                ? 'Алгоритм подбирает честные равные команды (разница ≤ 1 балла), выбирая из множества вариантов тот состав, который содержит наиболее свежих и давно неигравших персонажей.'
                : 'Включите эту опцию, чтобы при поиске равного состава алгоритм в первую очередь предлагал давно неигравших героев.';
        }
        return prioritizeUnplayed
            ? 'При подборе комбинаций, соответствующих вашему лимиту разницы сил, система формирует варианты преимущественно из редко используемых героев.'
            : 'Включите эту опцию, чтобы сбалансированный по вашей настройке состав формировался из редко играющих персонажей.';
    };

    return (
        <>
            <div
                className={`pointer-events-auto relative flex items-center gap-0 bg-white dark:bg-slate-800 h-12 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 animate-in slide-in-from-top-4 duration-500 transition-shadow ${isModeSelectorOpen || isExtraModeSelectorOpen ? 'ring-2 ring-primary-500/50' : ''}`}
                style={{ zIndex: isModeSelectorOpen || isExtraModeSelectorOpen ? Z_INDEX_BASE.OVERLAY_POPOVER : Z_INDEX_BASE.OVERLAY }}
            >
                <button
                    onClick={() => { setIsModeSelectorOpen(!isModeSelectorOpen); setIsExtraModeSelectorOpen(false); }}
                    className="relative h-full flex items-center pl-2 pr-3 gap-2 outline-none cursor-pointer rounded-l-2xl active:bg-slate-50 dark:active:bg-slate-700/50 transition-colors"
                >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${currentMode.bg} ${currentMode.color}`}>
                        <currentMode.icon size={16} />
                    </div>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200 min-w-[60px] text-left">
                        {currentMode.label}
                    </span>
                    <ChevronDown size={16} className={`text-slate-400 transition-transform duration-300 ${isModeSelectorOpen ? 'rotate-180' : ''}`} />
                </button>

                <div className={`absolute top-[calc(100%+8px)] left-0 w-[240px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden transition-all duration-300 origin-top-left ${isModeSelectorOpen ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-95 invisible pointer-events-none'}`}>
                    <div className="p-1.5 flex flex-col gap-0.5">
                        <div className="px-2.5 py-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                            Основной режим генерации
                        </div>
                        {GENERATION_MODES.map(mode => (
                            <button
                                key={mode.id}
                                onClick={() => { setGenerationMode(mode.id as GenerationMode); setIsModeSelectorOpen(false); }}
                                className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors ${generationMode === mode.id ? 'bg-slate-100 dark:bg-slate-800' : 'active:bg-slate-50 dark:active:bg-slate-800'}`}
                            >
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${generationMode === mode.id ? 'bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-900/5' : 'bg-slate-50 dark:bg-slate-800'} ${mode.color}`}>
                                    <mode.icon size={20} />
                                </div>
                                <div className="flex-1 text-left">
                                    <div className={`text-sm font-bold ${generationMode === mode.id ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>{mode.label}</div>
                                    <div className="text-[10px] text-slate-400">{mode.desc}</div>
                                </div>
                                {generationMode === mode.id && <Check size={16} className="text-primary-500" />}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="w-px h-6 bg-slate-100 dark:bg-slate-700" />

                {generationMode === 'strict' && setBalanceThreshold ? (
                    <div className="flex items-center gap-1 pl-2 pr-2 animate-in fade-in slide-in-from-left-2">
                        <span className="text-[10px] font-bold text-slate-400">±</span>
                        <input
                            type="number"
                            min="0"
                            max="10"
                            step="1"
                            inputMode="numeric"
                            value={Number.isNaN(balanceThreshold) ? '' : balanceThreshold}
                            onChange={(e) => setBalanceThreshold(e.target.value === '' ? NaN : parseInt(e.target.value))}
                            onBlur={() => { if (Number.isNaN(balanceThreshold)) setBalanceThreshold(0); }}
                            className="w-10 py-1 bg-slate-100 dark:bg-slate-700 rounded-md text-center text-sm font-bold outline-none focus:ring-1 focus:ring-primary-500 select-text"
                        />
                    </div>
                ) : (
                    <div className="w-1" />
                )}

                {(setExtraMode || setPrioritizeUnplayed) && (
                    <div className="flex items-center">
                        <button
                            onClick={() => { setIsExtraModeSelectorOpen(!isExtraModeSelectorOpen); setIsModeSelectorOpen(false); }}
                            className={`p-2 rounded-full transition-all duration-200 ${
                                activeExtraMode !== 'none'
                                    ? activeExtraMode === 'player_freshness'
                                        ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 ring-1 ring-emerald-500/20'
                                        : 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 ring-1 ring-primary-500/20'
                                    : 'text-slate-400 active:text-slate-600 dark:active:text-slate-200 active:bg-slate-100 dark:active:bg-slate-700'
                            }`}
                            aria-label="Дополнительный режим свежести"
                            title="Дополнительный режим генерации"
                        >
                            {(() => {
                                const currentExtra = EXTRA_MODES.find(m => m.id === activeExtraMode) || EXTRA_MODES[0];
                                const Icon = currentExtra.icon;
                                return <Icon size={20} />;
                            })()}
                        </button>

                        {/* Dropdown Menu for Extra Mode */}
                        <div
                            className={`absolute top-[calc(100%+8px)] left-0 w-[240px] max-w-[calc(100vw-32px)] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden transition-all duration-300 origin-top-left ${isExtraModeSelectorOpen ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-95 invisible pointer-events-none'}`}
                            style={{ zIndex: Z_INDEX_BASE.OVERLAY_POPOVER + 1 }}
                        >
                            <div className="p-1.5 flex flex-col gap-0.5">
                                <div className="px-2.5 py-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                                    Доп. режим свежести
                                </div>
                                {EXTRA_MODES.map(m => {
                                    const isSelected = activeExtraMode === m.id;
                                    const Icon = m.icon;
                                    return (
                                        <button
                                            key={m.id}
                                            onClick={() => {
                                                if (setExtraMode) setExtraMode(m.id as ExtraGenerationMode);
                                                else if (setPrioritizeUnplayed) setPrioritizeUnplayed(m.id !== 'none');
                                                setIsExtraModeSelectorOpen(false);
                                            }}
                                            className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors ${isSelected ? 'bg-slate-100 dark:bg-slate-800' : 'active:bg-slate-50 dark:active:bg-slate-800'}`}
                                        >
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isSelected ? 'bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-900/5' : 'bg-slate-50 dark:bg-slate-800'} ${m.color}`}>
                                                <Icon size={18} />
                                            </div>
                                            <div className="flex-1 text-left">
                                                <div className={`text-xs font-bold ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>{m.label}</div>
                                                <div className="text-[10px] text-slate-400 leading-tight">{m.desc}</div>
                                            </div>
                                            {isSelected && <Check size={16} className="text-primary-500 shrink-0" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {isDebugMode && (
                    <button
                        onClick={onOpenWeightsModal}
                        className="p-2 rounded-full text-slate-400 active:text-primary-500 active:bg-slate-100 dark:active:bg-slate-700 transition-colors"
                        aria-label="Таблица весов героев"
                    >
                        <Terminal size={20} />
                    </button>
                )}

                <button
                    type="button"
                    onClick={() => setShowInfo(true)}
                    aria-label="Справка по режимам генерации"
                    className="mr-1 p-2 rounded-full text-slate-400 active:text-primary-500 active:bg-slate-100 dark:active:bg-slate-700 transition-colors"
                >
                    <HelpCircle size={20} />
                </button>
            </div>

            {/* INFO Modal */}
            <BaseModal
                isOpen={showInfo}
                onClose={() => setShowInfo(false)}
                title={getModeTitle()}
                subtitle="Режим генерации героев"
                icon={<Info size={20} className="text-primary-600 dark:text-primary-400" />}
                maxWidth="sm"
                variant="auto"
                modalId="algorithm-info-modal"
                priority={40}
                footer={() => (
                    <button onClick={() => setShowInfo(false)} className="w-full py-3 font-bold text-white bg-primary-600 rounded-xl">Понятно</button>
                )}
            >
                <div className="space-y-4 text-left w-full">
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        {getModeDescription()}
                    </p>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                            {activeExtraMode === 'player_freshness' ? (
                                <UserCheck size={14} className="text-emerald-500" />
                            ) : (
                                <History size={14} className={activeExtraMode !== 'none' ? 'text-primary-500' : 'text-slate-400'} />
                            )}
                            {activeExtraMode === 'player_freshness'
                                ? 'Свежесть относительно игрока: Включена'
                                : activeExtraMode === 'global_freshness'
                                    ? 'Свежесть по истории: Включена'
                                    : 'Доп. режим свежести: Выключен'}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                            {getPrioritizeUnplayedDescription()}
                        </p>
                    </div>
                </div>
            </BaseModal>
        </>
    );
};
