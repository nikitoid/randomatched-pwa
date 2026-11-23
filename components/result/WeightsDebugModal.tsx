import React, { useState, useMemo } from 'react';
import { Terminal, Search } from 'lucide-react';
import { AssignedPlayer, ExtraGenerationMode, Hero } from '../../types';
import { getHeroWeight } from '../../utils/generator';
import { BaseModal } from '../common/BaseModal';

interface WeightsDebugModalProps {
    isOpen: boolean;
    onClose: () => void;
    availableHeroes: Hero[];
    assignments: AssignedPlayer[];
    playerNames: string[];
    activeExtraMode: ExtraGenerationMode;
    weightsMap: Map<string, number>;
    selectedDebugPlayerTab: 'global' | number;
    setSelectedDebugPlayerTab: (tab: 'global' | number) => void;
}

const POSITION_TO_INDEX: Record<string, number> = {
    bottom: 0,
    top: 1,
    left: 2,
    right: 3
};

/**
 * Debug modal displaying calculated generation weights and rank powers for available heroes.
 */
export const WeightsDebugModal: React.FC<WeightsDebugModalProps> = ({
    isOpen,
    onClose,
    availableHeroes,
    assignments,
    playerNames,
    activeExtraMode,
    weightsMap,
    selectedDebugPlayerTab,
    setSelectedDebugPlayerTab
}) => {
    const [weightsSearchTerm, setWeightsSearchTerm] = useState('');

    const sortedHeroesWithWeights = useMemo(() => {
        return availableHeroes
            .map(hero => {
                const weight = weightsMap.get(hero.id) || 1;
                const power = getHeroWeight(hero);
                return { hero, weight, power };
            })
            .sort((a, b) => b.weight - a.weight);
    }, [availableHeroes, weightsMap]);

    const filteredHeroes = useMemo(() => {
        return sortedHeroesWithWeights.filter(item =>
            item.hero.name.toLowerCase().includes(weightsSearchTerm.toLowerCase())
        );
    }, [sortedHeroesWithWeights, weightsSearchTerm]);

    const handleClose = () => {
        setWeightsSearchTerm('');
        onClose();
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={handleClose}
            title="Таблица весов героев"
            subtitle={`Всего героев: ${availableHeroes.length}`}
            icon={<Terminal size={20} className="text-primary-500" />}
            maxWidth="lg"
            variant="auto"
            modalId="generation-weights-modal"
            priority={40}
            showCloseButton={false}
            subHeader={
                <div className="flex flex-col gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={16} />
                        <input
                            type="text"
                            placeholder="Поиск героя..."
                            value={weightsSearchTerm}
                            onChange={(e) => setWeightsSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                        />
                        {weightsSearchTerm && (
                            <button
                                onClick={() => setWeightsSearchTerm('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 active:text-slate-600 dark:active:text-slate-200 transition-colors"
                            >
                                Очистить
                            </button>
                        )}
                    </div>

                    {activeExtraMode === 'player_freshness' && (
                        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
                            <button
                                onClick={() => setSelectedDebugPlayerTab('global')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${selectedDebugPlayerTab === 'global' ? 'bg-primary-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
                            >
                                Общий
                            </button>
                            {assignments.map(a => {
                                const idx = POSITION_TO_INDEX[a.position] ?? 0;
                                const pName = playerNames[idx]?.trim() || `Игрок ${a.playerNumber}`;
                                const isTabActive = selectedDebugPlayerTab === a.playerNumber;
                                return (
                                    <button
                                        key={a.playerNumber}
                                        onClick={() => setSelectedDebugPlayerTab(a.playerNumber)}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${isTabActive ? 'bg-primary-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
                                    >
                                        {pName}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            }
            footer={() => (
                <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 w-full">
                    <div>
                        <span>Сортировка по весу (убывание)</span>
                    </div>
                    <button
                        onClick={handleClose}
                        className="py-2 px-4 bg-slate-100 dark:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold transition-colors"
                    >
                        Закрыть
                    </button>
                </div>
            )}
        >
            <div className="flex-1 overflow-y-auto scrollbar-thin">
                <table className="w-full text-left text-sm border-collapse">
                    <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                            <th className="py-2.5 px-2">Герой</th>
                            <th className="py-2.5 px-2 text-center">Ранг</th>
                            <th className="py-2.5 px-2 text-right">Вес (W)</th>
                            <th className="py-2.5 px-2 text-right">Сила (P)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                        {filteredHeroes.length > 0 ? (
                            filteredHeroes.map(({ hero, weight, power }) => {
                                const isSelected = assignments.some(a => a.hero?.id === hero.id);
                                return (
                                    <tr
                                        key={hero.id}
                                        className={`transition-colors ${isSelected
                                            ? 'bg-primary-50/50 dark:bg-primary-950/20 font-medium'
                                            : ''
                                            }`}
                                    >
                                        <td className="py-2.5 px-2 flex items-center gap-2">
                                            <span className={`truncate text-slate-800 dark:text-slate-200 ${isSelected ? 'text-primary-600 dark:text-primary-400 font-bold' : ''}`}>
                                                {hero.name}
                                            </span>
                                            {isSelected && (
                                                <span className="px-1 py-0.5 rounded bg-primary-100 dark:bg-primary-900/40 text-[9px] text-primary-600 dark:text-primary-400 font-black uppercase tracking-wider">
                                                    В игре
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-2.5 px-2 text-center">
                                            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                                                {hero.rank || '—'}
                                            </span>
                                        </td>
                                        <td className="py-2.5 px-2 text-right font-mono text-xs text-slate-500 dark:text-slate-400">
                                            {weight.toFixed(2)}
                                        </td>
                                        <td className="py-2.5 px-2 text-right font-mono text-xs text-slate-500 dark:text-slate-400">
                                            {power}
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={4} className="py-8 text-center text-slate-400 dark:text-slate-500 text-sm">
                                    Герои не найдены
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </BaseModal>
    );
};
