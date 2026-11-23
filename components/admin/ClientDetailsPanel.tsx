import React from 'react';
import { Edit3, Check, Copy, Sparkles, Trash2, Crown } from 'lucide-react';
import { ClientData } from '../../types';
import { isClientOnline, formatLastSeen, formatFullDate, renderDeviceIcon } from './adminUtils';
import { PrankControlsPanel } from './PrankControlsPanel';

interface ClientDetailsPanelProps {
    client: ClientData;
    currentClientId: string;
    copiedTargetId: boolean;
    onCopyTargetId: (id: string) => void;
    onStartEditing: (client: ClientData) => void;
    onClearPrank: () => void;
    durationSeconds: number;
    setDurationSeconds: (seconds: number) => void;
    customMessage: string;
    setCustomMessage: (msg: string) => void;
    isSending: boolean;
    isUpdatingAdmin: boolean;
    isDeleting: boolean;
    onLaunchPrank: (type: 'upside_down' | 'mirror') => void;
    onSendSecretMessage: () => void;
    onSetAdminTarget?: (target: { client: ClientData; makeAdmin: boolean }) => void;
    onRequestDelete?: (client: ClientData) => void;
    triggerHaptic: (pattern?: number | number[]) => void;
}

/**
 * Control room view for a selected device inside AdminModal.
 */
export const ClientDetailsPanel: React.FC<ClientDetailsPanelProps> = ({
    client,
    currentClientId,
    copiedTargetId,
    onCopyTargetId,
    onStartEditing,
    onClearPrank,
    durationSeconds,
    setDurationSeconds,
    customMessage,
    setCustomMessage,
    isSending,
    isUpdatingAdmin,
    isDeleting,
    onLaunchPrank,
    onSendSecretMessage,
    onSetAdminTarget,
    onRequestDelete,
    triggerHaptic
}) => {
    return (
        <div className="space-y-4 animate-fadeIn">
            {/* Карточка устройства с Bento-информацией */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-100/90 to-slate-200/80 dark:from-slate-800/90 dark:to-slate-850/80 border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex flex-col gap-3">
                {/* Верхняя строка профиля */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="p-2 rounded-xl bg-primary-500/10 text-primary-600 dark:text-primary-400 shrink-0">
                            {renderDeviceIcon(client.device?.os)}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="font-heading font-bold text-base text-slate-900 dark:text-white truncate">
                                    {client.customName}
                                </span>
                                {client.isAdmin && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-extrabold border border-amber-500/30">
                                        ADMIN
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs">
                                {isClientOnline(client.lastSeen) ? (
                                    <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        В сети
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                                        <span className="w-2 h-2 rounded-full bg-slate-400" />
                                        Был в сети: {formatLastSeen(client.lastSeen)}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => onStartEditing(client)}
                        className="px-3 py-1.5 rounded-xl bg-slate-200/80 dark:bg-slate-700/80 hover:bg-slate-300 dark:hover:bg-slate-600 active:scale-95 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-all"
                    >
                        <Edit3 size={13} />
                        <span>Изменить</span>
                    </button>
                </div>

                {/* ID устройства */}
                <div className="flex items-center justify-between bg-white/70 dark:bg-slate-900/70 px-3 py-2 rounded-xl border border-slate-200/60 dark:border-slate-800 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 truncate mr-2">
                        <span className="text-[11px] font-mono select-all text-slate-700 dark:text-slate-300 truncate">
                            ID: {client.clientId}
                        </span>
                    </div>
                    <button
                        onClick={() => onCopyTargetId(client.clientId)}
                        className="text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1 text-[11px] font-semibold shrink-0"
                    >
                        {copiedTargetId ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                        <span>{copiedTargetId ? 'Скопировано' : 'Копировать'}</span>
                    </button>
                </div>

                {/* Сетка характеристик (Bento Grid) */}
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2.5 rounded-xl bg-white/50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/80">
                        <span className="text-slate-400 block text-[10px]">Платформа &amp; ОС</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                            {client.device?.os || 'Неизвестно'}
                        </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/80">
                        <span className="text-slate-400 block text-[10px]">Браузер</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                            {client.device?.browser || 'Неизвестно'}
                        </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/80">
                        <span className="text-slate-400 block text-[10px]">Режим &amp; Версия</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                            {client.device?.isPWA ? 'PWA приложение' : 'Web Браузер'} • v{client.appVersion || '1.0'}
                        </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/80">
                        <span className="text-slate-400 block text-[10px]">Первое подключение</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                            {formatFullDate(client.firstSeen)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Индикатор активного эффекта на клиенте (если есть) */}
            {client.activePrank && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-500/15 via-indigo-500/15 to-pink-500/15 border border-purple-500/30 flex items-center justify-between gap-3 animate-pulse">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-2 rounded-xl bg-purple-500 text-white shrink-0 shadow-md shadow-purple-500/30">
                            <Sparkles size={16} />
                        </div>
                        <div className="min-w-0">
                            <div className="text-xs font-extrabold text-purple-900 dark:text-purple-200">
                                На устройстве активен эффект:
                            </div>
                            <div className="text-xs font-bold text-purple-700 dark:text-purple-300 truncate">
                                {client.activePrank.type === 'upside_down' && '🙃 Австралийский режим'}
                                {client.activePrank.type === 'mirror' && '🪞 Зеркальный мир'}
                                {client.activePrank.type === 'secret_message' && '💬 Секретное послание'}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={onClearPrank}
                        disabled={isSending}
                        className="px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all shrink-0 border border-rose-500/30"
                    >
                        <Trash2 size={13} />
                        <span>Снять эффект</span>
                    </button>
                </div>
            )}

            <PrankControlsPanel
                durationSeconds={durationSeconds}
                setDurationSeconds={setDurationSeconds}
                customMessage={customMessage}
                setCustomMessage={setCustomMessage}
                isSending={isSending}
                onLaunchPrank={onLaunchPrank}
                onSendSecretMessage={onSendSecretMessage}
                triggerHaptic={triggerHaptic}
            />

            {/* ЗОНА БЕЗОПАСНОСТИ И ДЕЙСТВИЙ С УСТРОЙСТВОМ */}
            <div className="space-y-2 pt-1">
                {onSetAdminTarget && client.clientId !== currentClientId && (
                    <div>
                        {client.isAdmin ? (
                            <button
                                onClick={() => {
                                    onSetAdminTarget({ client, makeAdmin: false });
                                    triggerHaptic(20);
                                }}
                                disabled={isSending || isUpdatingAdmin}
                                className="w-full py-2.5 px-4 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 active:scale-[0.98] text-amber-700 dark:text-amber-300 font-semibold text-xs border border-amber-500/20 transition-all flex items-center justify-center gap-2"
                            >
                                <Crown size={14} className="text-amber-500" />
                                <span>Отозвать права администратора</span>
                            </button>
                        ) : (
                            <button
                                onClick={() => {
                                    onSetAdminTarget({ client, makeAdmin: true });
                                    triggerHaptic(20);
                                }}
                                disabled={isSending || isUpdatingAdmin}
                                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500/15 via-primary-500/15 to-indigo-500/15 hover:from-amber-500/25 hover:to-indigo-500/25 active:scale-[0.98] text-amber-800 dark:text-amber-200 font-semibold text-xs border border-amber-500/30 transition-all flex items-center justify-center gap-2 shadow-sm"
                            >
                                <Crown size={14} className="text-amber-500 animate-pulse" />
                                <span>Назначить администратором</span>
                            </button>
                        )}
                    </div>
                )}

                {onRequestDelete && !client.isAdmin && client.clientId !== currentClientId && (
                    <div>
                        <button
                            onClick={() => {
                                onRequestDelete(client);
                                triggerHaptic(20);
                            }}
                            disabled={isSending || isDeleting || isUpdatingAdmin}
                            className="w-full py-2.5 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 active:scale-[0.98] text-rose-600 dark:text-rose-400 font-semibold text-xs border border-rose-500/20 transition-all flex items-center justify-center gap-2"
                        >
                            <Trash2 size={14} />
                            <span>Удалить устройство из базы данных</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
