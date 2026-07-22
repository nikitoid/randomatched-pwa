import React, { useState, useMemo } from 'react';
import { X, Search, Cloud, RefreshCw, Trash2, Eye, Calendar, Loader2, AlertCircle } from 'lucide-react';
import { CloudBackup } from '../types';
import { BackupViewer } from './BackupViewer';
import { BaseModal } from './common/BaseModal';
import { ConfirmModal } from './common/ConfirmModal';

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
                onClose();
            }
        }
    };

    return (
        <>
            <BaseModal
                isOpen={isOpen && !viewingBackup}
                onClose={onClose}
                title="Облачные бэкапы"
                subtitle={`${backups.length} ${backups.length === 1 ? 'бэкап' : 'бэкапов'} доступно`}
                icon={<Cloud size={24} className="text-primary-500" />}
                maxWidth="2xl"
                variant="auto"
                modalId="cloud-backup-manager"
                priority={50}
            >
                <div className="space-y-4">
                    {/* Create Backup Button */}
                    <button
                        onClick={handleCreate}
                        data-testid="backup-manager-create-btn"
                        disabled={isCreatingBackup || !isOnline}
                        className={`w-full flex items-center justify-center gap-2.5 p-3.5 rounded-2xl font-bold text-sm shadow-md transition-all active:scale-[0.98] min-h-[48px] ${
                            isCreatingBackup || !isOnline
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none'
                                : 'bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white shadow-primary-500/20'
                        }`}
                    >
                        {isCreatingBackup ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : (
                            <Cloud size={18} />
                        )}
                        <span>Создать бэкап</span>
                    </button>

                    {/* Search bar */}
                    <div className="relative">
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Поиск по дате или количеству..."
                            className="w-full pl-10 pr-10 py-3 bg-slate-100 dark:bg-slate-800/80 rounded-2xl text-sm border border-slate-200/80 dark:border-slate-700/80 outline-none focus:ring-2 focus:ring-primary-500 transition-all text-slate-900 dark:text-white placeholder:text-slate-400 min-h-[48px]"
                        />
                        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        {search && (
                            <button
                                onClick={() => setSearch('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    {/* Backups List */}
                    <div className="space-y-2.5 pb-2">
                        {isLoadingBackups ? (
                            <div data-testid="backup-loading" className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                                <Loader2 size={32} className="animate-spin text-primary-500" />
                                <p className="text-sm font-medium">Загрузка бэкапов...</p>
                            </div>
                        ) : filteredBackups.length === 0 ? (
                            <div data-testid="backup-list-empty" className="text-center py-12 text-slate-400 space-y-2">
                                <Cloud size={40} className="mx-auto text-slate-300 dark:text-slate-700" />
                                <p className="text-sm font-medium">Бэкапы не найдены</p>
                            </div>
                        ) : (
                            <div data-testid="backup-list" className="space-y-2.5">
                                {filteredBackups.map(b => (
                                    <div
                                        key={b.id}
                                        data-testid="backup-item"
                                        className="p-4 bg-slate-50/60 dark:bg-slate-800/40 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between gap-3 min-h-[64px]"
                                    >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                                            <Calendar size={16} className="text-slate-400 shrink-0" />
                                            <span>{new Date(b.createdAt).toLocaleString('ru-RU')}</span>
                                        </div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                            Матчей: <strong className="text-slate-700 dark:text-slate-200">{b.matchCount}</strong>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                            onClick={() => handleView(b.id)}
                                            disabled={isLoadingDetailsId === b.id}
                                            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
                                            title="Просмотр"
                                            aria-label="Просмотреть"
                                        >
                                            {isLoadingDetailsId === b.id ? (
                                                <Loader2 size={16} className="animate-spin" />
                                            ) : (
                                                <Eye size={16} />
                                            )}
                                        </button>

                                        <button
                                            onClick={() => setRestoreConfirmId(b.id)}
                                            data-testid="backup-manager-restore-btn"
                                            disabled={isRestoringBackup || !isOnline}
                                            className="px-3 py-2.5 rounded-xl bg-primary-50 hover:bg-primary-100 dark:bg-primary-950/40 dark:hover:bg-primary-900/40 text-primary-600 dark:text-primary-400 font-bold text-xs transition-all min-h-[44px] flex items-center gap-1.5"
                                        >
                                            <RefreshCw size={14} />
                                            <span>Восстановить</span>
                                        </button>

                                        <button
                                            onClick={() => setDeleteConfirmId(b.id)}
                                            disabled={isDeletingId === b.id || !isOnline}
                                            className="p-2.5 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
                                            title="Удалить"
                                            aria-label="Удалить"
                                        >
                                            {isDeletingId === b.id ? (
                                                <Loader2 size={16} className="animate-spin" />
                                            ) : (
                                                <Trash2 size={16} />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ))}
                            </div>
                        )}
                    </div>
                </div>
            </BaseModal>

            {/* Viewer Component */}
            {viewingBackup && (
                <BackupViewer
                    backup={viewingBackup}
                    isOpen={!!viewingBackup}
                    onClose={() => setViewingBackup(null)}
                />
            )}

            {/* Confirm Restore Dialog */}
            <BaseModal
                isOpen={!!restoreConfirmId}
                onClose={() => {
                    setRestoreConfirmId(null);
                    setRestoreConfirmInput('');
                }}
                title="Восстановить бэкап?"
                subtitle="Текущая статистика будет перезаписана"
                icon={<RefreshCw size={24} className="text-primary-500" />}
                maxWidth="xs"
                variant="center"
                isAlert={true}
                priority={80}
                modalId="restore-backup-confirm"
            >
                <div className="space-y-4">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Введите <strong className="text-slate-900 dark:text-white uppercase">ВОССТАНОВИТЬ</strong> для подтверждения:
                    </p>
                    <input
                        type="text"
                        value={restoreConfirmInput}
                        onChange={(e) => setRestoreConfirmInput(e.target.value)}
                        data-testid="restore-confirm-input"
                        placeholder="ВОССТАНОВИТЬ"
                        className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-primary-500 font-bold min-h-[44px]"
                    />
                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <button
                            onClick={() => {
                                setRestoreConfirmId(null);
                                setRestoreConfirmInput('');
                            }}
                            data-testid="restore-cancel-btn"
                            className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs min-h-[44px]"
                        >
                            Отмена
                        </button>
                        <button
                            onClick={handleRestore}
                            data-testid="restore-confirm-btn"
                            disabled={restoreConfirmInput !== 'ВОССТАНОВИТЬ'}
                            className={`py-3 px-4 rounded-xl font-bold text-xs text-white transition-all min-h-[44px] ${
                                restoreConfirmInput === 'ВОССТАНОВИТЬ'
                                    ? 'bg-primary-500 hover:bg-primary-600 active:scale-95 shadow-md shadow-primary-500/20'
                                    : 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed opacity-60'
                            }`}
                        >
                            Восстановить
                        </button>
                    </div>
                </div>
            </BaseModal>

            {/* Confirm Delete Dialog */}
            <BaseModal
                isOpen={!!deleteConfirmId}
                onClose={() => {
                    setDeleteConfirmId(null);
                    setDeleteBackupInput('');
                }}
                title="Удаление бэкапа"
                subtitle="Действие нельзя будет отменить"
                icon={<Trash2 size={24} className="text-red-500" />}
                maxWidth="xs"
                variant="center"
                isAlert={true}
                priority={80}
                modalId="delete-backup-confirm"
            >
                <div className="space-y-4">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Введите <strong className="text-slate-900 dark:text-white uppercase">УДАЛИТЬ</strong> для подтверждения:
                    </p>
                    <input
                        type="text"
                        value={deleteBackupInput}
                        onChange={(e) => setDeleteBackupInput(e.target.value)}
                        placeholder="УДАЛИТЬ"
                        className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-red-500 font-bold min-h-[44px]"
                    />
                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <button
                            onClick={() => {
                                setDeleteConfirmId(null);
                                setDeleteBackupInput('');
                            }}
                            className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs min-h-[44px]"
                        >
                            Отмена
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={deleteBackupInput !== 'УДАЛИТЬ'}
                            className={`py-3 px-4 rounded-xl font-bold text-xs text-white transition-all min-h-[44px] ${
                                deleteBackupInput === 'УДАЛИТЬ'
                                    ? 'bg-red-600 hover:bg-red-700 active:scale-95 shadow-md shadow-red-500/20'
                                    : 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed opacity-60'
                            }`}
                        >
                            Удалить
                        </button>
                    </div>
                </div>
            </BaseModal>
        </>
    );
};
