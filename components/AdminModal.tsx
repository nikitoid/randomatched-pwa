import React, { useState, useEffect, useMemo } from 'react';
import {
    ShieldCheck,
    Copy,
    Check,
    Search,
    X,
    ChevronDown,
    ChevronUp,
    ArrowLeft,
    Crown,
    Activity,
    Sliders
} from 'lucide-react';
import { BaseModal } from './common/BaseModal';
import { ConfirmModal } from './common/ConfirmModal';
import { ClientData, ClientPrank, ToastType } from '../types';
import { useHaptics } from '../hooks/useHaptics';
import { useBackHandler } from '../hooks/useBackHandler';
import { copyToClipboard } from '../utils/clipboard';
import { isClientOnline, renderDeviceIcon } from './admin/adminUtils';
import { ClientListItem } from './admin/ClientListItem';
import { ClientDetailsPanel } from './admin/ClientDetailsPanel';

interface AdminModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentClientId: string;
    allClients: ClientData[];
    isLoadingClients: boolean;
    onSubscribeToClients: () => () => void;
    onUpdateClientName: (targetClientId: string, name: string) => Promise<boolean>;
    onSetClientAdmin?: (targetClientId: string, isAdmin: boolean) => Promise<boolean>;
    onSetClientPrank: (targetClientId: string, prank: ClientPrank | null) => Promise<boolean>;
    onClearClientPrank: (targetClientId: string) => Promise<boolean>;
    onDeleteClient?: (targetClientId: string) => Promise<boolean>;
    isOnline: boolean;
    addToast: (message: string, type: ToastType) => void;
}

type ClientFilterType = 'all' | 'online' | 'pranks' | 'admins';

export const AdminModal: React.FC<AdminModalProps> = ({
    isOpen,
    onClose,
    currentClientId,
    allClients,
    isLoadingClients,
    onSubscribeToClients,
    onUpdateClientName,
    onSetClientAdmin,
    onSetClientPrank,
    onClearClientPrank,
    onDeleteClient,
    isOnline,
    addToast
}) => {
    const { trigger: triggerHaptic } = useHaptics();

    // Навигация и фильтрация
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState<ClientFilterType>('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Карточка "Ваше устройство (Администратор)" - скрыта по умолчанию
    const [showSelfCard, setShowSelfCard] = useState(false);

    // Буфер обмена
    const [copiedOwnId, setCopiedOwnId] = useState(false);
    const [copiedTargetId, setCopiedTargetId] = useState(false);

    // Редактирование имени
    const [editingClientId, setEditingClientId] = useState<string | null>(null);
    const [editNameValue, setEditNameValue] = useState('');

    // Изменение роли администратора
    const [adminTargetClient, setAdminTargetClient] = useState<{ client: ClientData; makeAdmin: boolean } | null>(null);
    const [isUpdatingAdmin, setIsUpdatingAdmin] = useState<boolean>(false);

    // Удаление клиента
    const [clientToDelete, setClientToDelete] = useState<ClientData | null>(null);
    const [isDeleting, setIsDeleting] = useState<boolean>(false);

    // Настройка эффектов и сообщений
    const [durationSeconds, setDurationSeconds] = useState<number>(30);
    const [customMessage, setCustomMessage] = useState<string>('');
    const [isSending, setIsSending] = useState<boolean>(false);

    // Подписка на коллекцию клиентов в реальном времени при открытии
    useEffect(() => {
        if (!isOpen) {
            setSelectedClientId(null);
            setEditingClientId(null);
            setSearchQuery('');
            setActiveFilter('all');
            setShowSelfCard(false);
            return;
        }

        const unsubscribe = onSubscribeToClients();
        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [isOpen, onSubscribeToClients]);

    // Обработка кнопки "Назад" (аппаратная / жест / PWA)
    useBackHandler(
        isOpen && Boolean(selectedClientId),
        () => {
            setSelectedClientId(null);
        },
        { id: 'admin-modal-client-details', priority: 30 }
    );

    // Сводная статистика подключенных устройств
    const telemetry = useMemo(() => {
        let onlineCount = 0;
        let prankCount = 0;
        let adminCount = 0;

        allClients.forEach((c) => {
            if (isClientOnline(c.lastSeen)) onlineCount++;
            if (c.activePrank) prankCount++;
            if (c.isAdmin) adminCount++;
        });

        return {
            total: allClients.length,
            online: onlineCount,
            pranks: prankCount,
            admins: adminCount
        };
    }, [allClients]);

    // Выбранный клиент
    const selectedClient = useMemo(() => {
        if (!selectedClientId) return null;
        return allClients.find(c => Boolean(c.clientId && c.clientId === selectedClientId)) || null;
    }, [selectedClientId, allClients]);

    // Фильтрация и поиск клиентов
    const filteredClients = useMemo(() => {
        let result = allClients;

        if (activeFilter === 'online') {
            result = result.filter(c => isClientOnline(c.lastSeen));
        } else if (activeFilter === 'pranks') {
            result = result.filter(c => Boolean(c.activePrank));
        } else if (activeFilter === 'admins') {
            result = result.filter(c => Boolean(c.isAdmin));
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(c =>
                c.customName?.toLowerCase().includes(q) ||
                (c.clientId && c.clientId.toLowerCase().includes(q)) ||
                c.device?.os?.toLowerCase().includes(q) ||
                c.device?.browser?.toLowerCase().includes(q)
            );
        }

        return [...result].sort((a, b) => {
            if (a.clientId === currentClientId) return -1;
            if (b.clientId === currentClientId) return 1;
            const aOnline = isClientOnline(a.lastSeen);
            const bOnline = isClientOnline(b.lastSeen);
            if (aOnline && !bOnline) return -1;
            if (!aOnline && bOnline) return 1;
            return (b.lastSeen || 0) - (a.lastSeen || 0);
        });
    }, [allClients, activeFilter, searchQuery, currentClientId]);

    const handleCopyOwnId = async () => {
        const success = await copyToClipboard(currentClientId);
        if (success) {
            setCopiedOwnId(true);
            triggerHaptic(50);
            addToast('Client ID скопирован в буфер обмена', 'success');
            setTimeout(() => setCopiedOwnId(false), 2000);
        } else {
            addToast('Не удалось скопировать Client ID', 'error');
        }
    };

    const handleCopyTargetId = async (id: string) => {
        const success = await copyToClipboard(id);
        if (success) {
            setCopiedTargetId(true);
            triggerHaptic(50);
            addToast('ID устройства скопирован', 'success');
            setTimeout(() => setCopiedTargetId(false), 2000);
        }
    };

    const handleStartEditing = (client: ClientData, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (!client.clientId) return;
        setEditingClientId(client.clientId);
        setEditNameValue(client.customName || '');
    };

    const handleSaveName = async (clientId: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (!editNameValue.trim()) return;

        triggerHaptic(50);
        const success = await onUpdateClientName(clientId, editNameValue.trim());
        if (success) {
            addToast('Имя устройства обновлено', 'success');
            setEditingClientId(null);
        } else {
            addToast('Ошибка при обновлении имени', 'error');
        }
    };

    const handleConfirmAdminToggle = async () => {
        if (!adminTargetClient || !onSetClientAdmin) return;
        setIsUpdatingAdmin(true);
        triggerHaptic(50);

        const { client, makeAdmin } = adminTargetClient;
        const success = await onSetClientAdmin(client.clientId, makeAdmin);
        setIsUpdatingAdmin(false);
        setAdminTargetClient(null);

        if (success) {
            addToast(
                makeAdmin
                    ? `Устройству "${client.customName}" выданы права администратора 👑`
                    : `Права администратора у "${client.customName}" отозваны`,
                'success'
            );
        } else {
            addToast('Не удалось изменить права администратора', 'error');
        }
    };

    const handleConfirmDelete = async () => {
        if (!clientToDelete || !onDeleteClient) return;
        setIsDeleting(true);
        triggerHaptic(50);

        const targetId = clientToDelete.clientId;
        const targetName = clientToDelete.customName;
        const success = await onDeleteClient(targetId);
        setIsDeleting(false);
        setClientToDelete(null);

        if (success) {
            addToast(`Устройство "${targetName}" удалено`, 'success');
            if (selectedClientId === targetId) {
                setSelectedClientId(null);
            }
        } else {
            addToast('Не удалось удалить устройство', 'error');
        }
    };

    const handleLaunchPrank = async (type: 'upside_down' | 'mirror') => {
        if (!selectedClientId) return;
        if (!isOnline) {
            addToast('Нет подключения к сети', 'error');
            return;
        }

        setIsSending(true);
        triggerHaptic([40, 60, 40]);

        const prank: ClientPrank = {
            type,
            duration: durationSeconds,
            expiresAt: Date.now() + durationSeconds * 1000,
            createdAt: Date.now()
        };

        const success = await onSetClientPrank(selectedClientId, prank);
        setIsSending(false);

        if (success) {
            addToast(
                type === 'upside_down'
                    ? `🙃 Австралийский режим запущен на ${durationSeconds}с!`
                    : `🪞 Зеркальный режим запущен на ${durationSeconds}с!`,
                'success'
            );
        } else {
            addToast('Не удалось применить эффект', 'error');
        }
    };

    const handleSendSecretMessage = async () => {
        if (!selectedClientId) return;
        if (!customMessage.trim()) {
            addToast('Введите текст сообщения', 'warning');
            return;
        }
        if (!isOnline) {
            addToast('Нет подключения к сети', 'error');
            return;
        }

        setIsSending(true);
        triggerHaptic([50, 80]);

        const prank: ClientPrank = {
            type: 'secret_message',
            text: customMessage.trim(),
            expiresAt: Date.now() + 180000,
            createdAt: Date.now()
        };

        const success = await onSetClientPrank(selectedClientId, prank);
        setIsSending(false);

        if (success) {
            addToast('💬 Секретное послание отправлено!', 'success');
            setCustomMessage('');
        } else {
            addToast('Не удалось отправить послание', 'error');
        }
    };

    const handleClearPrank = async () => {
        if (!selectedClientId) return;
        setIsSending(true);
        triggerHaptic(40);

        const success = await onClearClientPrank(selectedClientId);
        setIsSending(false);

        if (success) {
            addToast('Все эффекты на устройстве сброшены', 'info');
        } else {
            addToast('Ошибка сброса эффектов', 'error');
        }
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            variant="auto"
            maxWidth="lg"
            priority={25}
            modalId="admin-control-panel-modal"
            contentClassName="overflow-x-hidden"
            title={
                selectedClient ? (
                    <div className="flex items-center gap-2.5 min-w-0">
                        <button
                            onClick={() => {
                                setSelectedClientId(null);
                                triggerHaptic(15);
                            }}
                            className="p-1.5 -ml-1 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 shrink-0"
                            aria-label="Назад к списку устройств"
                        >
                            <ArrowLeft size={18} />
                        </button>
                        <div className="flex items-center gap-2 truncate">
                            {renderDeviceIcon(selectedClient.device?.os)}
                            <span className="truncate font-heading font-bold text-slate-900 dark:text-white">
                                {selectedClient.customName}
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-500 shrink-0">
                            <Crown size={20} className="animate-pulse" />
                        </div>
                        <div>
                            <span className="font-heading font-bold text-slate-900 dark:text-white">
                                Панель Администратора
                            </span>
                        </div>
                    </div>
                )
            }
            subtitle={
                selectedClient
                    ? 'Управление устройством и интерактивными эффектами'
                    : `Всего устройств: ${allClients.length} • В сети: ${telemetry.online}`
            }
        >
            <div className="space-y-4 pb-2">
                {!selectedClient ? (
                    <div className="space-y-4 animate-fadeIn">
                        {/* Кнопка раскрытия карточки администратора */}
                        <div className="flex items-center justify-between">
                            <button
                                onClick={() => {
                                    setShowSelfCard(prev => !prev);
                                    triggerHaptic(15);
                                }}
                                className={`w-full py-2 px-3 rounded-2xl text-xs font-semibold flex items-center justify-between transition-all active:scale-[0.99] border ${
                                    showSelfCard
                                        ? 'bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30 shadow-sm'
                                        : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 border-slate-200/80 dark:border-slate-700/80'
                                }`}
                                aria-expanded={showSelfCard}
                            >
                                <div className="flex items-center gap-2">
                                    <ShieldCheck size={16} className="text-amber-500 shrink-0" />
                                    <span>Ваше устройство (Администратор)</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-slate-400">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[11px] font-mono opacity-80">{currentClientId ? `${currentClientId.slice(0, 10)}...` : ''}</span>
                                    {showSelfCard ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                                </div>
                            </button>
                        </div>

                        {/* Раскрытая карточка администратора */}
                        {showSelfCard && (
                            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-primary-500/10 to-indigo-500/10 border border-amber-500/25 dark:border-amber-500/30 backdrop-blur-md shadow-sm relative overflow-hidden flex flex-col gap-2.5 animate-fadeIn">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
                                            <ShieldCheck size={16} />
                                        </div>
                                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                            Параметры вашего сеанса
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/20 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        <span>Online</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between bg-white/60 dark:bg-slate-900/60 p-2 rounded-xl border border-slate-200/70 dark:border-slate-800 backdrop-blur-sm gap-2">
                                    <div className="truncate font-mono text-[11px] text-slate-700 dark:text-slate-300 select-all">
                                        {currentClientId}
                                    </div>
                                    <button
                                        onClick={handleCopyOwnId}
                                        className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 active:scale-95 text-amber-800 dark:text-amber-300 text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                                        aria-label="Скопировать ID администратора"
                                    >
                                        {copiedOwnId ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                                        <span>{copiedOwnId ? 'Скопировано' : 'Скопировать ID'}</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Метрики телеметрии */}
                        <div className="grid grid-cols-4 gap-2 text-center">
                            <div className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 flex flex-col items-center">
                                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Всего</span>
                                <span className="font-heading font-extrabold text-base text-slate-900 dark:text-white">
                                    {telemetry.total}
                                </span>
                            </div>
                            <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col items-center">
                                <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">В сети</span>
                                <span className="font-heading font-extrabold text-base text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    {telemetry.online}
                                </span>
                            </div>
                            <div className="p-2.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex flex-col items-center">
                                <span className="text-[10px] font-medium text-purple-600 dark:text-purple-400">Эффекты</span>
                                <span className="font-heading font-extrabold text-base text-purple-700 dark:text-purple-300">
                                    {telemetry.pranks}
                                </span>
                            </div>
                            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col items-center">
                                <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">Админы</span>
                                <span className="font-heading font-extrabold text-base text-amber-700 dark:text-amber-300">
                                    {telemetry.admins}
                                </span>
                            </div>
                        </div>

                        {/* Панель поиска и фильтров */}
                        <div className="space-y-2.5">
                            <div className="relative">
                                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Поиск по имени, устройству или ID..."
                                    className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => {
                                            setSearchQuery('');
                                            triggerHaptic(10);
                                        }}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
                                        aria-label="Очистить поиск"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-4 gap-1.5">
                                {[
                                    { id: 'all', label: 'Все', count: telemetry.total },
                                    { id: 'online', label: 'В сети', count: telemetry.online },
                                    { id: 'pranks', label: 'Эффекты', count: telemetry.pranks },
                                    { id: 'admins', label: 'Админы', count: telemetry.admins }
                                ].map((tab) => {
                                    const isActive = activeFilter === tab.id;
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => {
                                                setActiveFilter(tab.id as ClientFilterType);
                                                triggerHaptic(15);
                                            }}
                                            className={`py-1.5 px-1 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                                                isActive
                                                    ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20'
                                                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/80'
                                            }`}
                                        >
                                            <span className="truncate">{tab.label}</span>
                                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                                isActive
                                                    ? 'bg-white/20 text-white'
                                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                                            }`}>
                                                {tab.count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Список устройств */}
                        {isLoadingClients && allClients.length === 0 ? (
                            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                                <Activity size={24} className="animate-spin text-primary-500" />
                                <span className="text-xs font-medium">Загрузка списка подключений...</span>
                            </div>
                        ) : filteredClients.length === 0 ? (
                            <div className="py-12 px-4 rounded-2xl bg-slate-100/50 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-center gap-2">
                                <Sliders size={28} className="text-slate-400" />
                                <div className="font-heading font-bold text-sm text-slate-800 dark:text-slate-200">
                                    Устройства не найдены
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
                                    {searchQuery
                                        ? `По запросу «${searchQuery}» совпадений не обнаружено.`
                                        : 'В данной категории нет активных устройств.'}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {filteredClients.map((client, idx) => {
                                    const cid = client.clientId || `client_${idx}`;
                                    const isSelf = Boolean(client.clientId && client.clientId === currentClientId);
                                    const isEditing = Boolean(editingClientId && client.clientId && editingClientId === client.clientId);

                                    return (
                                        <ClientListItem
                                            key={cid}
                                            client={client}
                                            isSelf={isSelf}
                                            isEditing={isEditing}
                                            editNameValue={editNameValue}
                                            setEditNameValue={setEditNameValue}
                                            onSelect={setSelectedClientId}
                                            onStartEditing={handleStartEditing}
                                            onSaveName={handleSaveName}
                                            onCancelEditing={() => setEditingClientId(null)}
                                            onToggleAdmin={onSetClientAdmin ? (c) => setAdminTargetClient({ client: c, makeAdmin: !c.isAdmin }) : undefined}
                                            onRequestDelete={onDeleteClient ? setClientToDelete : undefined}
                                            triggerHaptic={triggerHaptic}
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ) : (
                    <ClientDetailsPanel
                        client={selectedClient}
                        currentClientId={currentClientId}
                        copiedTargetId={copiedTargetId}
                        onCopyTargetId={handleCopyTargetId}
                        onStartEditing={handleStartEditing}
                        onClearPrank={handleClearPrank}
                        durationSeconds={durationSeconds}
                        setDurationSeconds={setDurationSeconds}
                        customMessage={customMessage}
                        setCustomMessage={setCustomMessage}
                        isSending={isSending}
                        isUpdatingAdmin={isUpdatingAdmin}
                        isDeleting={isDeleting}
                        onLaunchPrank={handleLaunchPrank}
                        onSendSecretMessage={handleSendSecretMessage}
                        onSetAdminTarget={onSetClientAdmin ? setAdminTargetClient : undefined}
                        onRequestDelete={onDeleteClient ? setClientToDelete : undefined}
                        triggerHaptic={triggerHaptic}
                    />
                )}
            </div>

            {/* МОДАЛЬНЫЕ ОКНА ПОДТВЕРЖДЕНИЯ */}
            <ConfirmModal
                isOpen={Boolean(adminTargetClient)}
                onCancel={() => setAdminTargetClient(null)}
                onConfirm={handleConfirmAdminToggle}
                title={
                    adminTargetClient?.makeAdmin
                        ? 'Назначить администратором?'
                        : 'Отозвать права администратора?'
                }
                description={
                    adminTargetClient?.makeAdmin ? (
                        <span>
                            Вы действительно хотите предоставить права администратора устройству{' '}
                            <strong className="text-slate-900 dark:text-white">
                                {adminTargetClient?.client?.customName || 'клиента'}
                            </strong>
                            ? Это устройство получит полный доступ к панели администратора, списку всех подключенных устройств и управлению приколами.
                        </span>
                    ) : (
                        <span>
                            Вы действительно хотите отозвать права администратора у устройства{' '}
                            <strong className="text-slate-900 dark:text-white">
                                {adminTargetClient?.client?.customName || 'клиента'}
                            </strong>
                            ? Устройство потеряет доступ к панели администратора.
                        </span>
                    )
                }
                confirmText={adminTargetClient?.makeAdmin ? 'Назначить' : 'Отозвать'}
                cancelText="Отмена"
                confirmVariant={adminTargetClient?.makeAdmin ? 'primary' : 'danger'}
                priority={35}
            />

            <ConfirmModal
                isOpen={Boolean(clientToDelete)}
                onCancel={() => setClientToDelete(null)}
                onConfirm={handleConfirmDelete}
                title="Удалить устройство?"
                description={
                    <span>
                        Вы действительно хотите удалить устройство{' '}
                        <strong className="text-slate-900 dark:text-white">
                            {clientToDelete?.customName || 'клиента'}
                        </strong>{' '}
                        из базы данных?
                    </span>
                }
                confirmText="Удалить"
                cancelText="Отмена"
                confirmVariant="danger"
                priority={35}
            />
        </BaseModal>
    );
};
