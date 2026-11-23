import React from 'react';
import { Crown, Edit3, Save, X, Sparkles, Trash2, ChevronRight } from 'lucide-react';
import { ClientData } from '../../types';
import { isClientOnline, formatLastSeen, renderDeviceIcon } from './adminUtils';

interface ClientListItemProps {
    client: ClientData;
    isSelf: boolean;
    isEditing: boolean;
    editNameValue: string;
    setEditNameValue: (val: string) => void;
    onSelect: (clientId: string) => void;
    onStartEditing: (client: ClientData, e?: React.MouseEvent) => void;
    onSaveName: (clientId: string, e?: React.MouseEvent) => void;
    onCancelEditing: () => void;
    onToggleAdmin?: (client: ClientData) => void;
    onRequestDelete?: (client: ClientData) => void;
    triggerHaptic: (pattern?: number | number[]) => void;
}

/**
 * Device row inside the AdminModal client list with inline rename and quick admin/delete actions.
 */
export const ClientListItem: React.FC<ClientListItemProps> = ({
    client,
    isSelf,
    isEditing,
    editNameValue,
    setEditNameValue,
    onSelect,
    onStartEditing,
    onSaveName,
    onCancelEditing,
    onToggleAdmin,
    onRequestDelete,
    triggerHaptic
}) => {
    const isOnlineClient = isClientOnline(client.lastSeen);

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={() => {
                if (client.clientId) {
                    onSelect(client.clientId);
                    triggerHaptic(20);
                }
            }}
            onKeyDown={(e) => {
                if (e.target !== e.currentTarget) return;
                if ((e.key === 'Enter' || e.key === ' ') && client.clientId) {
                    e.preventDefault();
                    onSelect(client.clientId);
                    triggerHaptic(20);
                }
            }}
            className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 active:scale-[0.99] group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 ${
                isSelf
                    ? 'bg-amber-500/5 hover:bg-amber-500/10 border-amber-500/30'
                    : 'bg-slate-100/80 dark:bg-slate-800/70 hover:bg-slate-200/80 dark:hover:bg-slate-750 border-slate-200/80 dark:border-slate-700/80'
            }`}
        >
            <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Иконка платформы */}
                <div className="p-2.5 rounded-xl bg-slate-200/80 dark:bg-slate-700/80 shrink-0 flex items-center justify-center group-hover:scale-105 transition-transform">
                    {renderDeviceIcon(client.device?.os)}
                </div>

                <div className="min-w-0 flex-1">
                    {/* Имя устройства и бейджи */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {isEditing ? (
                            <div
                                className="flex items-center gap-1 w-full my-0.5"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <input
                                    type="text"
                                    value={editNameValue}
                                    onChange={(e) => setEditNameValue(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') onSaveName(client.clientId);
                                        if (e.key === 'Escape') onCancelEditing();
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-primary-500 text-xs font-bold text-slate-900 dark:text-white flex-1 focus:outline-none"
                                    autoFocus
                                />
                                <button
                                    onClick={(e) => onSaveName(client.clientId, e)}
                                    className="p-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-500 transition-colors"
                                    aria-label="Сохранить имя"
                                >
                                    <Save size={13} />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onCancelEditing();
                                    }}
                                    className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                                    aria-label="Отменить редактирование"
                                >
                                    <X size={13} />
                                </button>
                            </div>
                        ) : (
                            <>
                                <span className="font-heading font-bold text-xs text-slate-900 dark:text-white truncate max-w-[140px] sm:max-w-[200px]">
                                    {client.customName}
                                </span>

                                <button
                                    onClick={(e) => onStartEditing(client, e)}
                                    className="p-1 text-slate-400 hover:text-primary-500 dark:hover:text-primary-400 transition-colors opacity-80 group-hover:opacity-100 rounded-md"
                                    title="Переименовать устройство"
                                    aria-label="Переименовать"
                                >
                                    <Edit3 size={12} />
                                </button>

                                {isSelf && (
                                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-extrabold shrink-0 border border-amber-500/30">
                                        ВЫ
                                    </span>
                                )}

                                {client.isAdmin && !isSelf && (
                                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-extrabold shrink-0 flex items-center gap-1 border border-amber-500/30">
                                        <Crown size={9} />
                                        ADMIN
                                    </span>
                                )}
                            </>
                        )}
                    </div>

                    {/* Статус, ОС и активный эффект */}
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                        <span className="flex items-center gap-1 font-medium">
                            <span
                                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                    isOnlineClient ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                                }`}
                            />
                            <span className={isOnlineClient ? 'text-emerald-600 dark:text-emerald-400 font-bold' : ''}>
                                {isOnlineClient ? 'В сети' : formatLastSeen(client.lastSeen)}
                            </span>
                        </span>

                        <span>•</span>
                        <span className="truncate">{client.device?.os || 'OS'}</span>

                        {client.device?.isPWA && (
                            <>
                                <span>•</span>
                                <span className="text-primary-600 dark:text-primary-400 font-semibold">PWA</span>
                            </>
                        )}

                        {client.activePrank && (
                            <>
                                <span>•</span>
                                <span className="text-purple-600 dark:text-purple-400 font-bold flex items-center gap-1 bg-purple-500/10 px-1.5 py-0.2 rounded-md border border-purple-500/20">
                                    <Sparkles size={10} className="animate-spin-slow" />
                                    {client.activePrank.type === 'upside_down' && 'Австралийский'}
                                    {client.activePrank.type === 'mirror' && 'Зеркальный'}
                                    {client.activePrank.type === 'secret_message' && 'Послание'}
                                </span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Быстрые действия и стрелка перехода */}
            <div className="flex items-center gap-1 shrink-0">
                {!isSelf && onToggleAdmin && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleAdmin(client);
                            triggerHaptic(20);
                        }}
                        className={`p-1.5 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                            client.isAdmin
                                ? 'text-amber-500 hover:bg-amber-500/10'
                                : 'text-slate-400 hover:text-amber-500 hover:bg-amber-500/10'
                        }`}
                        title={client.isAdmin ? 'Отозвать права администратора' : 'Назначить администратором'}
                        aria-label="Переключить права администратора"
                    >
                        <Crown size={14} />
                    </button>
                )}

                {!isSelf && onRequestDelete && !client.isAdmin && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onRequestDelete(client);
                            triggerHaptic(20);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                        title="Удалить устройство"
                        aria-label="Удалить устройство"
                    >
                        <Trash2 size={14} />
                    </button>
                )}

                <div className="p-1 text-slate-400 group-hover:text-primary-500 group-hover:translate-x-0.5 transition-all">
                    <ChevronRight size={16} />
                </div>
            </div>
        </div>
    );
};
