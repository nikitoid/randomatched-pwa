import React from 'react';
import { BarChart3 } from 'lucide-react';
import { RANKS } from '../constants';
import { BaseModal } from './common/BaseModal';

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
    const { counts, max, total } = isOpen ? getSelectionStats() : { counts: {}, max: 1, total: 0 };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="Баланс героев"
            icon={<BarChart3 size={20} className="text-violet-600 dark:text-violet-400" />}
            maxWidth="sm"
            variant="auto"
            modalId="group-stats-modal"
            priority={20}
        >
            <div className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-4 text-center">
                Всего героев: <span className="text-slate-900 dark:text-white font-bold">{total}</span>
            </div>

            {RANKS.map((rank, idx) => {
                const count = counts[rank] || 0;
                const percent = max > 0 ? (count / max) * 100 : 0;
                const colorClass = getRankBarColor(rank);

                return (
                    <div key={rank} className="mb-3.5 last:mb-0">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                            <span>{rank}</span>
                            <span>{count}</span>
                        </div>
                        <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-700 ease-out ${colorClass} ${percent === 0 ? 'opacity-0' : 'opacity-100'}`}
                                style={{
                                    width: isOpen ? `${percent}%` : '0%',
                                    transitionDelay: `${idx * 40}ms`
                                }}
                            />
                        </div>
                    </div>
                );
            })}
        </BaseModal>
    );
};
