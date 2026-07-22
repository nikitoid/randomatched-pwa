import React from 'react';
import { ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';
import { BaseModal } from '../common/BaseModal';

interface StatsBackupMenuProps {
    isDataMenuOpen: boolean;
    setIsDataMenuOpen: (open: boolean) => void;
    handleExport: () => void;
    handleImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
    isDebugMode: boolean;
    triggerHaptic: (pattern?: number | number[]) => void;
    setIsBackupManagerOpen: (open: boolean) => void;
    cloudBackupsLength: number;
}

export const StatsBackupMenu: React.FC<StatsBackupMenuProps> = ({
    isDataMenuOpen,
    setIsDataMenuOpen,
    handleExport,
    handleImport,
    isDebugMode,
    triggerHaptic,
    setIsBackupManagerOpen,
    cloudBackupsLength
}) => {
    const handleClose = () => setIsDataMenuOpen(false);

    const modalFooter = (
        <button
            onClick={handleClose}
            data-testid="backup-close-btn"
            className="w-full py-3.5 px-4 rounded-2xl text-slate-700 dark:text-slate-200 font-bold transition-all bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/80 active:scale-95 text-sm min-h-[48px]"
        >
            Закрыть
        </button>
    );

    return (
        <BaseModal
            isOpen={isDataMenuOpen}
            onClose={handleClose}
            title="Резервное копирование"
            subtitle="Сохраните статистику локально или в облаке"
            maxWidth="md"
            variant="auto"
            modalId="stats-backup-menu"
            priority={50}
            showCloseButton={false}
            footer={modalFooter}
        >
            <div className="space-y-5">
                {/* Local Backup Section */}
                <div className="space-y-2.5">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Локальный бэкап
                    </h4>
                    <div className="space-y-2">
                        <button
                            onClick={handleExport}
                            data-testid="backup-export-btn"
                            className="w-full flex items-center gap-3.5 p-4 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 rounded-2xl text-slate-900 dark:text-white font-bold text-sm active:scale-[0.98] transition-all min-h-[52px]"
                        >
                            <ArrowUp className="text-emerald-500 shrink-0" size={20} />
                            <span>Экспорт в файл</span>
                        </button>

                        <label className="w-full flex items-center gap-3.5 p-4 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 rounded-2xl text-slate-900 dark:text-white font-bold text-sm active:scale-[0.98] transition-all cursor-pointer relative overflow-hidden min-h-[52px]">
                            <ArrowDown className="text-blue-500 shrink-0" size={20} />
                            <span>Импорт из файла</span>
                            <input
                                type="file"
                                accept=".json"
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                onChange={handleImport}
                                data-testid="backup-import-input"
                            />
                        </label>
                    </div>
                </div>

                {/* Cloud Backup Section */}
                <div className="space-y-2.5">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Облачный бэкап
                    </h4>

                    <button
                        onClick={() => {
                            if (isDebugMode) return;
                            triggerHaptic(10);
                            setIsDataMenuOpen(false);
                            setIsBackupManagerOpen(true);
                        }}
                        disabled={isDebugMode}
                        className={`w-full flex items-center justify-center gap-3 p-4 rounded-2xl font-bold text-sm transition-all min-h-[52px] ${
                            isDebugMode
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none'
                                : 'bg-primary-50 hover:bg-primary-100 dark:bg-primary-950/40 dark:hover:bg-primary-900/40 text-primary-600 dark:text-primary-400 active:scale-[0.98]'
                        }`}
                        aria-label={isDebugMode ? "Облачный бэкап отключен в режиме разработчика" : "Управление облачными бэкапами"}
                        data-testid="backup-open-manager-btn"
                    >
                        <RefreshCw size={20} className={isDebugMode ? "opacity-50" : ""} />
                        <span>Управление облачными бэкапами</span>
                    </button>

                    {isDebugMode && (
                        <p className="text-center text-xs text-red-500 font-medium mt-1">
                            Облачные функции отключены в режиме разработчика!
                        </p>
                    )}

                    {cloudBackupsLength > 0 && (
                        <p className="text-center text-xs text-slate-400 mt-2">
                            Доступно бэкапов: {cloudBackupsLength}
                        </p>
                    )}
                </div>
            </div>
        </BaseModal>
    );
};
