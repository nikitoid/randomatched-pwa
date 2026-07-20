import React from 'react';
import { createPortal } from 'react-dom';
import { ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';

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
    if (!isDataMenuOpen) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        >
            <div
                className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200 max-h-[85dvh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6 pb-3 shrink-0">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Резервное копирование</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Сохраните статистику локально или в облако.
                    </p>
                </div>

                <div className="flex-1 overflow-y-auto px-6 space-y-4">
                    <div className="space-y-2">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Локальный бэкап</h4>
                        <div className="space-y-2">
                            <button
                                onClick={handleExport}
                                data-testid="backup-export-btn"
                                className="w-full flex items-center gap-3 p-3.5 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-900 dark:text-white font-medium active:bg-slate-200 dark:active:bg-slate-700 transition-colors"
                            >
                                <ArrowUp className="text-green-500" size={20} />
                                <span>Экспорт в файл</span>
                            </button>

                            <label className="w-full flex items-center gap-3 p-3.5 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-900 dark:text-white font-medium active:bg-slate-200 dark:active:bg-slate-700 transition-colors cursor-pointer relative overflow-hidden">
                                <ArrowDown className="text-blue-500" size={20} />
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

                    <div className="space-y-2">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Облачный бэкап</h4>

                        <button
                            onClick={() => {
                                if (isDebugMode) return;
                                triggerHaptic(10);
                                setIsDataMenuOpen(false);
                                setIsBackupManagerOpen(true);
                            }}
                            disabled={isDebugMode}
                            className={`w-full flex items-center justify-center gap-3 p-3.5 rounded-2xl font-medium transition-colors ${isDebugMode
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none'
                                : 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 active:bg-primary-100 dark:active:bg-primary-900/40'
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

                <div className="p-6 pt-4 shrink-0">
                    <button
                        onClick={() => setIsDataMenuOpen(false)}
                        data-testid="backup-close-btn"
                        className="w-full p-3 rounded-xl text-slate-500 active:text-slate-900 dark:active:text-white font-medium transition-colors bg-slate-100 dark:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700"
                    >
                        Закрыть
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};
