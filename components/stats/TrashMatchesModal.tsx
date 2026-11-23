import React from 'react';
import { Trash2, RefreshCw, X } from 'lucide-react';
import { MatchRecord } from '../../types';
import { ConfirmModal } from '../common/ConfirmModal';

export type DeleteMatchAction = 'move-to-trash' | 'permanent' | 'clear-trash';

interface TrashMatchesModalProps {
    isOpen: boolean;
    action: DeleteMatchAction;
    onCancel: () => void;
    onConfirm: () => void;
}

/**
 * Confirmation modal for moving matches to trash, permanently deleting, or clearing trash.
 */
export const TrashMatchesModal: React.FC<TrashMatchesModalProps> = ({
    isOpen,
    action,
    onCancel,
    onConfirm
}) => {
    return (
        <ConfirmModal
            isOpen={isOpen}
            onCancel={onCancel}
            onConfirm={onConfirm}
            title={
                action === 'clear-trash' ? 'Очистить корзину?' :
                action === 'permanent' ? 'Удалить навсегда?' : 'Удалить матч?'
            }
            description={
                action === 'move-to-trash' ? 'Матч будет перемещен в корзину.' : 'Это действие нельзя отменить.'
            }
            confirmText={action === 'move-to-trash' ? 'В корзину' : 'Удалить'}
            cancelText="Отмена"
            confirmVariant="danger"
            icon={<Trash2 size={24} />}
            priority={80}
            modalId="stats-delete-confirm-modal"
        />
    );
};

interface TrashMatchesSectionProps {
    deletedHistory: MatchRecord[];
    onRestoreMatch: (id: string) => void;
    setDeleteConfirmId: (id: string | null) => void;
    setDeleteConfirmAction: (action: DeleteMatchAction) => void;
    triggerHaptic: (pattern?: number | number[]) => void;
}

/**
 * Renders the deleted matches trash list with restore and permanent-delete actions.
 */
export const TrashMatchesSection: React.FC<TrashMatchesSectionProps> = ({
    deletedHistory,
    onRestoreMatch,
    setDeleteConfirmId,
    setDeleteConfirmAction,
    triggerHaptic
}) => {
    if (deletedHistory.length === 0) return null;

    return (
        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 bg-white dark:bg-slate-900 text-xs font-bold text-slate-400 uppercase tracking-wider">
                Корзина ({deletedHistory.length})
            </div>
            <div className="space-y-3 opacity-90 transition-opacity">
                {deletedHistory.map(match => {
                    const date = new Date(match.timestamp).toLocaleDateString();
                    const time = new Date(match.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                    return (
                        <div
                            key={match.id}
                            className="relative overflow-hidden p-3 rounded-2xl bg-slate-50/90 dark:bg-slate-900/60 glass-card-gradient shadow-sm border border-red-200/60 dark:border-red-950/40 pr-20"
                        >
                            <div className="flex justify-between items-start mb-3 border-b border-slate-100 dark:border-slate-700/50 pb-2">
                                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><Trash2 size={10} /> {date} <span className="opacity-50">|</span> {time}</span>
                            </div>

                            <div className="space-y-2 opacity-60 grayscale-[50%]">
                                {/* Team 1 */}
                                <div className={`flex items-center gap-2 ${match.winner === 'team1' ? 'opacity-100' : 'opacity-60'}`}>
                                    <div className={`w-1.5 h-8 rounded-full ${match.winner === 'team1' ? 'bg-secondary-500' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                                            {match.team1.map(p => p.name).join(', ')}
                                        </div>
                                    </div>
                                </div>

                                {/* Team 2 */}
                                <div className={`flex items-center gap-2 ${match.winner === 'team2' ? 'opacity-100' : 'opacity-60'}`}>
                                    <div className={`w-1.5 h-8 rounded-full ${match.winner === 'team2' ? 'bg-primary-500' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                                            {match.team2.map(p => p.name).join(', ')}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="absolute right-0 top-0 bottom-0 w-20 flex flex-col items-center justify-center gap-1 bg-slate-100 dark:bg-slate-800 border-l border-red-100 dark:border-red-900/30 z-10">
                                <button onClick={() => { onRestoreMatch(match.id); triggerHaptic(20); }} className="p-2 text-green-500 active:scale-90 transition-transform" aria-label="Восстановить">
                                    <RefreshCw size={16} />
                                </button>
                                <button onClick={() => { setDeleteConfirmId(match.id); setDeleteConfirmAction('permanent'); triggerHaptic(50); }} className="p-2 text-red-500 active:scale-90 transition-transform" aria-label="Удалить навсегда">
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="text-center mt-6 mb-4">
                <button
                    onClick={() => { setDeleteConfirmId('all'); setDeleteConfirmAction('clear-trash'); triggerHaptic(50); }}
                    className="text-xs font-bold text-red-400 active:text-red-500 py-2 px-4 rounded-full active:bg-red-50 dark:active:bg-red-900/20 transition-colors flex items-center gap-2 mx-auto"
                >
                    <Trash2 size={14} /> Очистить корзину ({deletedHistory.length})
                </button>
            </div>
        </div>
    );
};
