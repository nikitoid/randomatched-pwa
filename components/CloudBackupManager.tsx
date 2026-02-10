import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Cloud, RefreshCw, Trash2, Eye, Calendar, Loader2, AlertCircle } from 'lucide-react';
import { CloudBackup, MatchRecord } from '../types';
import { BackupViewer } from './BackupViewer';

interface CloudBackupManagerProps {
    isOpen: boolean;
    onClose: () => void;
    backups: Array<{ id: string; createdAt: number; matchCount: number }>;
    isLoadingBackups: boolean;
    isCreatingBackup: boolean;
    isRestoringBackup: boolean;
    onCreateBackup: () => Promise<string | null>;
    onRestoreBackup: (id: string) => Promise<boolean>;
    onDeleteBackup: (id: string) => Promise<boolean>;
    onGetBackupDetails: (id: string) => Promise<CloudBackup | null>;
    triggerHaptic: (pattern?: number | number[]) => void;
    isOnline: boolean;
}

export const CloudBackupManager: React.FC<CloudBackupManagerProps> = ({
    isOpen,
    onClose,
    backups,
    isLoadingBackups,
    isCreatingBackup,
    isRestoringBackup,
    onCreateBackup,
    onRestoreBackup,
    onDeleteBackup,
    onGetBackupDetails,
    triggerHaptic,
    isOnline
}) => {
    const [search, setSearch] = useState('');
    const [viewingBackup, setViewingBackup] = useState<CloudBackup | null>(null);
    const [isLoadingDetailsId, setIsLoadingDetailsId] = useState<string | null>(null);

    // Confirmation States
    const [restoreConfirmId, setRestoreConfirmId] = useState<string | null>(null);
    const [restoreConfirmInput, setRestoreConfirmInput] = useState('');

    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [deleteBackupInput, setDeleteBackupInput] = useState('');
    const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

    const filteredBackups = useMemo(() => {
        if (!search.trim()) return backups;
        const lower = search.toLowerCase();
        return backups.filter(b => {
            const date = new Date(b.createdAt);
            const dateStr = date.toLocaleDateString('ru-RU');
            const timeStr = date.toLocaleTimeString('ru-RU');
            return dateStr.includes(lower) || timeStr.includes(lower) || b.matchCount.toString().includes(lower);
        });
    }, [backups, search]);

    if (!isOpen) return null;

    const handleCreate = async () => {
        triggerHaptic(10);
        await onCreateBackup();
    };

    const handleView = async (id: string) => {
        triggerHaptic(10);
        setIsLoadingDetailsId(id);
        const details = await onGetBackupDetails(id);
        setViewingBackup(details);
        setIsLoadingDetailsId(null);
    };

    const handleDelete = async () => {
        if (deleteBackupInput === 'УДАЛИТЬ' && deleteConfirmId) {
            triggerHaptic([20, 50]);
            setIsDeletingId(deleteConfirmId);
            const success = await onDeleteBackup(deleteConfirmId);
            setIsDeletingId(null);
            if (success) {
                setDeleteConfirmId(null);
                setDeleteBackupInput('');
            }
        }
    };

    const handleRestore = async () => {
        if (restoreConfirmInput === 'ВОССТАНОВИТЬ' && restoreConfirmId) {
            triggerHaptic([20, 50, 20]);
            const success = await onRestoreBackup(restoreConfirmId);
            if (success) {
                setRestoreConfirmId(null);
                setRestoreConfirmInput('');
                onClose(); // Close manager after successful restore? Or stay open? Usually better to close or show success.
                // Original behavior closed the menu.
            }
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl h-[85vh] rounded-3xl shadow-2xl flex flex-col border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-t-3xl z-10">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Cloud className="text-primary-500" size={24} />
                            Облачные бэкапы
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                            {backups.length} {backups.length === 1 ? 'бэкап' : 'бэкапов'} доступно
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <X size={24} className="text-slate-500" />
                    </button>
                </div>

                {/* Actions & Search */}
                <div className="p-5 pb-2 space-y-4 shrink-0">
                    <button
                        onClick={handleCreate}
                        disabled={!isOnline || isCreatingBackup}
                        className={`w-full flex items-center justify-center gap-3 p-4 rounded-2xl font-bold transition-all ${isOnline && !isCreatingBackup
                            ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20 active:scale-95'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                            }`}
                        data-testid="backup-manager-create-btn"
                    >
                        {isCreatingBackup ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                <span>Создание бэкапа...</span>
                            </>
                        ) : (
                            <>
                                <RefreshCw size={20} />
                                <span>Создать новый бэкап</span>
                            </>
                        )}
                    </button>

                    <div className="relative">
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Поиск по дате..."
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm border border-slate-200 dark:border-slate-700 outline-none focus:border-primary-500 transition-colors"
                        />
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-5 pt-2 space-y-3 custom-scrollbar">
                    {isLoadingBackups && backups.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-3">
                            <Loader2 size={32} className="animate-spin text-primary-500" />
                            <span>Загрузка списка...</span>
                        </div>
                    ) : !isOnline ? (
                        <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-3">
                            <Cloud size={48} className="text-slate-300 dark:text-slate-700" />
                            <span>Нет подключения к интернету</span>
                        </div>
                    ) : filteredBackups.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-3" data-testid="backup-list-empty">
                            <Cloud size={48} className="text-slate-300 dark:text-slate-700" />
                            <span>Бэкапов не найдено</span>
                        </div>
                    ) : (
                        filteredBackups.map(backup => {
                            const date = new Date(backup.createdAt);
                            const dateStr = date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
                            const timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

                            return (
                                <div key={backup.id} className="bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 transition-all hover:border-primary-500/30 flex flex-col sm:flex-row gap-4 items-start sm:items-center" data-testid="backup-item">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Calendar size={14} className="text-primary-500" />
                                            <span className="font-bold text-slate-900 dark:text-white">{dateStr}</span>
                                            <span className="text-slate-400">|</span>
                                            <span className="text-slate-600 dark:text-slate-300">{timeStr}</span>
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {backup.matchCount} {backup.matchCount === 1 ? 'матч' : backup.matchCount < 5 ? 'матча' : 'матчей'}
                                        </div>
                                    </div>

                                    <div className="flex gap-2 w-full sm:w-auto">
                                        <button
                                            onClick={() => handleView(backup.id)}
                                            disabled={isLoadingDetailsId === backup.id || isRestoringBackup}
                                            className="flex-1 sm:flex-none p-2.5 flex items-center justify-center gap-2 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 hover:text-primary-600 dark:hover:text-primary-400 rounded-xl transition-colors disabled:opacity-50"
                                            title="Просмотреть"
                                        >
                                            {isLoadingDetailsId === backup.id ? <Loader2 size={18} className="animate-spin" /> : <Eye size={18} />}
                                            <span className="hidden sm:inline text-xs font-bold">Просмотр</span>
                                        </button>

                                        <button
                                            onClick={() => {
                                                triggerHaptic(10);
                                                setRestoreConfirmId(backup.id);
                                                setRestoreConfirmInput('');
                                            }}
                                            disabled={isRestoringBackup}
                                            className="flex-1 sm:flex-none p-2.5 flex items-center justify-center gap-2 text-primary-600 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/40 rounded-xl transition-colors disabled:opacity-50 font-bold text-xs"
                                            data-testid="backup-manager-restore-btn"
                                            title="Восстановить"
                                        >
                                            <RefreshCw size={18} />
                                            <span className="hidden sm:inline">Восстановить</span>
                                        </button>

                                        <button
                                            onClick={() => {
                                                triggerHaptic(10);
                                                setDeleteConfirmId(backup.id);
                                                setDeleteBackupInput('');
                                            }}
                                            disabled={isRestoringBackup}
                                            className="flex-1 sm:flex-none p-2.5 flex items-center justify-center gap-2 text-red-500 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl transition-colors disabled:opacity-50"
                                            title="Удалить"
                                        >
                                            <Trash2 size={18} />
                                            <span className="hidden sm:inline text-xs font-bold">Удалить</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Backup Viewer Modal */}
            {viewingBackup && (
                <BackupViewer
                    isOpen={!!viewingBackup}
                    backup={viewingBackup}
                    onClose={() => setViewingBackup(null)}
                />
            )}

            {/* Restore Confirmation Modal */}
            {restoreConfirmId && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 bg-red-100 dark:bg-red-900/30 rounded-xl">
                                <AlertCircle className="text-red-500" size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Подтверждение</h3>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                            <span className="text-red-500 font-bold">Внимание!</span> Восстановление перезапишет текущую историю матчей.
                            Действие необратимо.
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                            Введите <span className="font-mono font-bold text-slate-900 dark:text-white">ВОССТАНОВИТЬ</span>:
                        </p>
                        <input
                            type="text"
                            value={restoreConfirmInput}
                            onChange={e => setRestoreConfirmInput(e.target.value)}
                            placeholder="ВОССТАНОВИТЬ"
                            className="w-full p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm font-mono border border-slate-200 dark:border-slate-700 focus:border-primary-500 outline-none mb-4"
                            data-testid="restore-confirm-input"
                        />
                        <div className="flex gap-3">
                            <button onClick={() => setRestoreConfirmId(null)} className="flex-1 py-3 font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm">Отмена</button>
                            <button
                                onClick={handleRestore}
                                disabled={restoreConfirmInput !== 'ВОССТАНОВИТЬ' || isRestoringBackup}
                                className={`flex-1 py-3 font-bold rounded-xl text-sm transition-colors ${restoreConfirmInput === 'ВОССТАНОВИТЬ' && !isRestoringBackup ? 'bg-red-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                                    }`}
                                data-testid="restore-confirm-btn"
                            >
                                {isRestoringBackup ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Восстановить'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirmId && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 bg-red-100 dark:bg-red-900/30 rounded-xl">
                                <Trash2 className="text-red-500" size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Удаление бэкапа</h3>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                            Это действие <span className="text-red-500 font-bold">нельзя отменить</span>.
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                            Введите <span className="font-mono font-bold text-slate-900 dark:text-white">УДАЛИТЬ</span>:
                        </p>
                        <input
                            type="text"
                            value={deleteBackupInput}
                            onChange={e => setDeleteBackupInput(e.target.value)}
                            placeholder="УДАЛИТЬ"
                            className="w-full p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm font-mono border border-slate-200 dark:border-slate-700 focus:border-red-500 outline-none mb-4"
                        />
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteConfirmId(null)} disabled={!!isDeletingId} className="flex-1 py-3 font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm">Отмена</button>
                            <button
                                onClick={handleDelete}
                                disabled={deleteBackupInput !== 'УДАЛИТЬ' || !!isDeletingId}
                                className={`flex-1 py-3 font-bold rounded-xl text-sm transition-colors ${deleteBackupInput === 'УДАЛИТЬ' && !isDeletingId ? 'bg-red-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                                    }`}
                            >
                                {isDeletingId ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Удалить'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>,
        document.body
    );
};
