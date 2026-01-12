import React from 'react';
import { BarChart3, X } from 'lucide-react';
import { RANKS } from '../constants';

interface GroupStatsModalProps {
    isOpen: boolean;
    onClose: () => void;
    getSelectionStats: () => { counts: Record<string, number>, max: number, total: number };
    getRankBarColor: (rank: string) => string;
}

export const GroupStatsModal: React.FC<GroupStatsModalProps> = ({
    isOpen,
    onClose,
    getSelectionStats,
    getRankBarColor,
}) => {
    return (
        <div
            className={`fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm transition-all duration-300 ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}
            onClick={onClose}
        >
            <div className={`bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl transition-all duration-300 border border-slate-100 dark:border-slate-800 ring-1 ring-slate-900/5 dark:ring-white/10 max-h-[90dvh] flex flex-col ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center text-violet-600 dark:text-violet-400">
                            <BarChart3 size={20} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Баланс героев</h3>
                    </div>
                    <button onClick={onClose} className="p-2 -mr-2 text-slate-400 md:hover:text-slate-900 dark:md:hover:text-white active:text-slate-900 rounded-full">
                        <X size={20} />
                    </button>
                </div>

                <div className="overflow-y-auto no-scrollbar flex-1 -mr-2 pr-2">
                    {(() => {
                        // Only calculate when open to save resources? Actually React renders, so it calculates.
                        const { counts, max, total } = getSelectionStats();
                        return (
                            <>
                                <div className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-4 text-center">
                                    Всего героев: <span className="text-slate-900 dark:text-white font-bold">{total}</span>
                                </div>
                                {RANKS.map((rank, idx) => {
                                    const count = counts[rank] || 0;
                                    const percent = (count / max) * 100;
                                    const colorClass = getRankBarColor(rank);

                                    return (
                                        <div key={rank} className="mb-3 last:mb-0">
                                            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                                                <span>{rank}</span>
                                                <span>{count}</span>
                                            </div>
                                            <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-1000 ease-out ${colorClass} ${percent === 0 ? 'opacity-0' : 'opacity-100'}`}
                                                    style={{
                                                        width: isOpen ? `${percent}%` : '0%',
                                                        transitionDelay: `${idx * 50}ms`
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </>
                        );
                    })()}
                </div>
            </div>
        </div>
    );
};
