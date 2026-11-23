import React, { useState } from 'react';
import { Dice5, Sparkles, Check, Copy, Download, RefreshCw } from 'lucide-react';
import { APP_VERSION, getUnreadReleasesCount } from '../../utils/changelog';
import { copyToClipboard } from '../../utils/clipboard';

interface InfoTabProps {
    lastSeenVersion?: string | null;
    onOpenChangelog: () => void;
    clientId?: string;
    isAdmin: boolean;
    isUpdateAvailable: boolean;
    isCheckingUpdate: boolean;
    onUpdateApp?: () => void;
    checkForUpdate?: () => void;
    addToast?: (message: string, type: 'info' | 'success' | 'error' | 'warning', duration?: number) => void;
    triggerHaptic: (pattern?: number | number[]) => void;
}

/**
 * Info tab: app version, changelog trigger, client ID copy card, and PWA update controls.
 */
export const InfoTab: React.FC<InfoTabProps> = ({
    lastSeenVersion,
    onOpenChangelog,
    clientId,
    isAdmin,
    isUpdateAvailable,
    isCheckingUpdate,
    onUpdateApp,
    checkForUpdate,
    addToast,
    triggerHaptic
}) => {
    const [copiedClientId, setCopiedClientId] = useState(false);
    const unreadChangelogCount = getUnreadReleasesCount(lastSeenVersion ?? null);

    return (
        <div className="flex flex-col items-center justify-center min-h-full p-6 text-center animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="relative mb-4">
                <div className="w-24 h-24 bg-gradient-to-br from-primary-500 to-primary-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-primary-500/25 rotate-3 hover:rotate-0 transition-transform duration-300">
                    <Dice5 size={48} className="drop-shadow-md" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center shadow-md">
                    <Sparkles size={14} className="text-amber-500" />
                </div>
            </div>

            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-1">Randomatched</h3>

            <div className="mb-4">
                <span className="text-xs font-extrabold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/50 px-3 py-1 rounded-full border border-primary-200/40 dark:border-primary-800/30 select-none">
                    v{APP_VERSION}
                </span>
            </div>

            {/* What's New Button */}
            <button
                onClick={() => { onOpenChangelog(); triggerHaptic(10); }}
                className="relative mb-5 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 active:bg-slate-50 dark:active:bg-slate-800 text-slate-800 dark:text-white rounded-xl text-xs font-bold flex items-center gap-2 active:scale-95 transition-all shadow-xs hover:border-slate-300 dark:hover:border-slate-700"
            >
                <Sparkles size={15} className="text-amber-500 fill-amber-500/20" />
                <span>Что нового в приложении?</span>
                {unreadChangelogCount > 0 && (
                    <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-gradient-to-r from-amber-500 to-rose-500 text-white font-black text-[9px] rounded-full shadow-md shadow-amber-500/30 animate-pulse tracking-wider">
                        NEW
                    </span>
                )}
            </button>

            {/* App Info Description Card */}
            <div className="bg-white/80 dark:bg-slate-900/80 rounded-2xl p-5 shadow-xs border border-slate-200/80 dark:border-slate-800/80 w-full max-w-xs text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4 text-center">
                <p className="mb-2.5">
                    Генератор команд 2x2 для настольной игры <strong>Unmatched</strong>.
                </p>
                <p>
                    Создавайте свои списки героев, синхронизируйте их между устройствами и используйте умные алгоритмы для создания идеально сбалансированных матчей.
                </p>
            </div>

            {/* Client ID Card */}
            {clientId && (
                <div className="bg-white/80 dark:bg-slate-900/80 rounded-2xl p-3.5 shadow-xs border border-slate-200/80 dark:border-slate-800/80 w-full max-w-xs flex flex-col gap-2 mb-5">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                            ID Устройства
                        </span>
                        {isAdmin && (
                            <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                ADMIN
                            </span>
                        )}
                    </div>
                    <div className="flex items-center justify-between gap-2 bg-slate-100 dark:bg-slate-800 p-2 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                        <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300 truncate select-all">
                            {clientId}
                        </span>
                        <button
                            onClick={async () => {
                                const success = await copyToClipboard(clientId);
                                if (success) {
                                    setCopiedClientId(true);
                                    triggerHaptic(10);
                                    if (addToast) addToast('Client ID скопирован', 'success');
                                    setTimeout(() => setCopiedClientId(false), 2000);
                                } else {
                                    if (addToast) addToast('Не удалось скопировать Client ID', 'error');
                                }
                            }}
                            className="p-1.5 rounded-lg bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-primary-600 active:scale-95 transition-all shrink-0 shadow-xs"
                            title="Скопировать Client ID"
                        >
                            {copiedClientId ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                        </button>
                    </div>
                </div>
            )}

            {/* App Updates Card */}
            <div className="bg-white/80 dark:bg-slate-900/80 rounded-2xl p-4 shadow-xs border border-slate-200/80 dark:border-slate-800/80 w-full max-w-xs flex flex-col gap-3 mb-6">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        Обновление PWA
                    </span>
                    <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">
                        v{APP_VERSION}
                    </span>
                </div>

                {isUpdateAvailable && onUpdateApp ? (
                    <button
                        onClick={() => { triggerHaptic(15); onUpdateApp(); }}
                        className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
                    >
                        <Download size={16} />
                        <span>Обновить и перезапустить PWA</span>
                    </button>
                ) : (
                    <button
                        onClick={() => { triggerHaptic(10); if (checkForUpdate) checkForUpdate(); }}
                        disabled={isCheckingUpdate}
                        className="w-full px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 active:bg-slate-300 dark:active:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                    >
                        <RefreshCw size={14} className={isCheckingUpdate ? 'animate-spin text-primary-500' : ''} />
                        <span>{isCheckingUpdate ? 'Проверка обновлений...' : 'Проверить обновления'}</span>
                    </button>
                )}
            </div>

            {/* Footer Copyright */}
            <div className="mt-auto pt-2 pb-4 text-[10px] font-extrabold text-slate-400 dark:text-slate-600 uppercase tracking-widest flex flex-col gap-1 items-center">
                <span>Designed for Unmatched Fans</span>
                <span className="text-slate-300 dark:text-slate-700">by Nikitoid</span>
            </div>
        </div>
    );
};
