import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  ShieldCheck, 
  Smartphone, 
  Monitor, 
  Tablet,
  Laptop,
  Copy, 
  Check, 
  Clock, 
  Sparkles, 
  MessageSquare, 
  RotateCw, 
  FlipHorizontal, 
  Trash2, 
  Search, 
  Edit3, 
  Save, 
  X, 
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Crown,
  Send,
  Activity,
  Sliders
} from 'lucide-react';
import { BaseModal } from './common/BaseModal';
import { ConfirmModal } from './common/ConfirmModal';
import { ClientData, ClientPrank, ToastType } from '../types';
import { useHaptics } from '../hooks/useHaptics';
import { useBackHandler } from '../hooks/useBackHandler';
import { copyToClipboard } from '../utils/clipboard';

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

const DURATION_OPTIONS = [
  { label: '15 сек', value: 15 },
  { label: '30 сек', value: 30 },
  { label: '1 мин', value: 60 },
  { label: '2 мин', value: 120 },
  { label: '5 мин', value: 300 },
  { label: '10 мин', value: 600 }
];

const MESSAGE_PRESETS = [
  'Генерация отменена! 😈',
  'Админ следит за тобой 👀',
  'Срочно смени героя! 🔥',
  'Твой пик забанен! 🚫',
  'Внимание: тест реакции ⚡',
  'GG WP! 🏆'
];

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

  // Вспомогательная функция определения статуса «В сети» (< 2 мин назад)
  const isClientOnline = useCallback((lastSeen?: number) => {
    if (!lastSeen) return false;
    return Date.now() - lastSeen < 120000;
  }, []);

  // Форматирование времени последней активности
  const formatLastSeen = useCallback((timestamp?: number) => {
    if (!timestamp) return 'Неизвестно';
    const diffSec = Math.floor((Date.now() - timestamp) / 1000);
    if (diffSec < 60) return 'Только что';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} мин. назад`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} ч. назад`;
    const date = new Date(timestamp);
    return `${date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} ${date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
  }, []);

  // Форматирование даты первой регистрации
  const formatFullDate = useCallback((timestamp?: number) => {
    if (!timestamp) return '—';
    const date = new Date(timestamp);
    return `${date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })} ${date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
  }, []);

  // Определение подходящей иконки устройства
  const renderDeviceIcon = useCallback((os?: string, isPWA?: boolean) => {
    const osLower = (os || '').toLowerCase();
    if (osLower.includes('ios') || osLower.includes('iphone') || osLower.includes('android')) {
      return <Smartphone size={18} className="text-primary-500 dark:text-primary-400" />;
    }
    if (osLower.includes('ipad') || osLower.includes('tablet')) {
      return <Tablet size={18} className="text-sky-500 dark:text-sky-400" />;
    }
    if (osLower.includes('mac') || osLower.includes('darwin')) {
      return <Laptop size={18} className="text-indigo-500 dark:text-indigo-400" />;
    }
    if (osLower.includes('win') || osLower.includes('linux')) {
      return <Monitor size={18} className="text-cyan-500 dark:text-cyan-400" />;
    }
    return <Smartphone size={18} className="text-slate-400" />;
  }, []);

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
  }, [allClients, isClientOnline]);

  // Выбранный клиент
  const selectedClient = useMemo(() => {
    if (!selectedClientId) return null;
    return allClients.find(c => Boolean(c.clientId && c.clientId === selectedClientId)) || null;
  }, [selectedClientId, allClients]);

  // Фильтрация и поиск клиентов
  const filteredClients = useMemo(() => {
    let result = allClients;

    // Фильтр по вкладкам
    if (activeFilter === 'online') {
      result = result.filter(c => isClientOnline(c.lastSeen));
    } else if (activeFilter === 'pranks') {
      result = result.filter(c => Boolean(c.activePrank));
    } else if (activeFilter === 'admins') {
      result = result.filter(c => Boolean(c.isAdmin));
    }

    // Поиск
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => 
        c.customName?.toLowerCase().includes(q) ||
        (c.clientId && c.clientId.toLowerCase().includes(q)) ||
        c.device?.os?.toLowerCase().includes(q) ||
        c.device?.browser?.toLowerCase().includes(q)
      );
    }

    // Сортировка: сначала активные/текущие, затем по lastSeen
    return [...result].sort((a, b) => {
      if (a.clientId === currentClientId) return -1;
      if (b.clientId === currentClientId) return 1;
      const aOnline = isClientOnline(a.lastSeen);
      const bOnline = isClientOnline(b.lastSeen);
      if (aOnline && !bOnline) return -1;
      if (!aOnline && bOnline) return 1;
      return (b.lastSeen || 0) - (a.lastSeen || 0);
    });
  }, [allClients, activeFilter, searchQuery, isClientOnline, currentClientId]);

  // Копирование собственного Client ID
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

  // Копирование Target Client ID
  const handleCopyTargetId = async (id: string) => {
    const success = await copyToClipboard(id);
    if (success) {
      setCopiedTargetId(true);
      triggerHaptic(50);
      addToast('ID устройства скопирован', 'success');
      setTimeout(() => setCopiedTargetId(false), 2000);
    }
  };

  // Редактирование имени устройства
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

  // Подтверждение и изменение роли администратора
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

  // Подтверждение и удаление клиента
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

  // Запуск визуального прикола
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

  // Отправка секретного сообщения
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

  // Сброс всех активных эффектов
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
              {renderDeviceIcon(selectedClient.device?.os, selectedClient.device?.isPWA)}
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
          ? `Управление устройством и интерактивными эффектами`
          : `Всего устройств: ${allClients.length} • В сети: ${telemetry.online}`
      }
    >
      <div className="space-y-4 pb-2">
        {/* ========================================================================= */}
        {/* ЭКРАН 1: СПИСОК ВСЕХ УСТРОЙСТВ                                            */}
        {/* ========================================================================= */}
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
              {/* Строка поиска */}
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

              {/* Фильтры-табы (сетка без горизонтального скролла) */}
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
                  const isOnlineClient = isClientOnline(client.lastSeen);
                  const isSelf = Boolean(client.clientId && client.clientId === currentClientId);
                  const isEditing = Boolean(editingClientId && client.clientId && editingClientId === client.clientId);

                  return (
                    <div
                      key={cid}
                      onClick={() => {
                        if (client.clientId) {
                          setSelectedClientId(client.clientId);
                          triggerHaptic(20);
                        }
                      }}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 active:scale-[0.99] group ${
                        isSelf
                          ? 'bg-amber-500/5 hover:bg-amber-500/10 border-amber-500/30'
                          : 'bg-slate-100/80 dark:bg-slate-800/70 hover:bg-slate-200/80 dark:hover:bg-slate-750 border-slate-200/80 dark:border-slate-700/80'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Иконка платформы */}
                        <div className="p-2.5 rounded-xl bg-slate-200/80 dark:bg-slate-700/80 shrink-0 flex items-center justify-center group-hover:scale-105 transition-transform">
                          {renderDeviceIcon(client.device?.os, client.device?.isPWA)}
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
                                    if (e.key === 'Enter') handleSaveName(client.clientId);
                                    if (e.key === 'Escape') setEditingClientId(null);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-primary-500 text-xs font-bold text-slate-900 dark:text-white flex-1 focus:outline-none"
                                  autoFocus
                                />
                                <button
                                  onClick={(e) => handleSaveName(client.clientId, e)}
                                  className="p-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-500 transition-colors"
                                  aria-label="Сохранить имя"
                                >
                                  <Save size={13} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingClientId(null);
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
                                  onClick={(e) => handleStartEditing(client, e)}
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
                        {!isSelf && onSetClientAdmin && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setAdminTargetClient({ client, makeAdmin: !client.isAdmin });
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

                        {!isSelf && onDeleteClient && !client.isAdmin && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setClientToDelete(client);
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
                })}
              </div>
            )}
          </div>
        ) : (
          /* ========================================================================= */
          /* ЭКРАН 2: УПРАВЛЕНИЕ ВЫБРАННЫМ КЛИЕНТОМ (CONTROL ROOM)                     */
          /* ========================================================================= */
          <div className="space-y-4 animate-fadeIn">
            {/* Карточка устройства с Bento-информацией */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-100/90 to-slate-200/80 dark:from-slate-800/90 dark:to-slate-850/80 border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex flex-col gap-3">
              {/* Верхняя строка профиля */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-2 rounded-xl bg-primary-500/10 text-primary-600 dark:text-primary-400 shrink-0">
                    {renderDeviceIcon(selectedClient.device?.os, selectedClient.device?.isPWA)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-heading font-bold text-base text-slate-900 dark:text-white truncate">
                        {selectedClient.customName}
                      </span>
                      {selectedClient.isAdmin && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-extrabold border border-amber-500/30">
                          ADMIN
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      {isClientOnline(selectedClient.lastSeen) ? (
                        <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          В сети
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                          <span className="w-2 h-2 rounded-full bg-slate-400" />
                          Был в сети: {formatLastSeen(selectedClient.lastSeen)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleStartEditing(selectedClient)}
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
                    ID: {selectedClient.clientId}
                  </span>
                </div>
                <button
                  onClick={() => handleCopyTargetId(selectedClient.clientId)}
                  className="text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1 text-[11px] font-semibold shrink-0"
                >
                  {copiedTargetId ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                  <span>{copiedTargetId ? 'Скопировано' : 'Копировать'}</span>
                </button>
              </div>

              {/* Сетка характеристик (Bento Grid) */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 rounded-xl bg-white/50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/80">
                  <span className="text-slate-400 block text-[10px]">Платформа & ОС</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                    {selectedClient.device?.os || 'Неизвестно'}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/80">
                  <span className="text-slate-400 block text-[10px]">Браузер</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                    {selectedClient.device?.browser || 'Неизвестно'}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/80">
                  <span className="text-slate-400 block text-[10px]">Режим & Версия</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    {selectedClient.device?.isPWA ? 'PWA приложение' : 'Web Браузер'} • v{selectedClient.appVersion || '1.0'}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/80">
                  <span className="text-slate-400 block text-[10px]">Первое подключение</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                    {formatFullDate(selectedClient.firstSeen)}
                  </span>
                </div>
              </div>
            </div>

            {/* Индикатор активного эффекта на клиенте (если есть) */}
            {selectedClient.activePrank && (
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
                      {selectedClient.activePrank.type === 'upside_down' && '🙃 Австралийский режим'}
                      {selectedClient.activePrank.type === 'mirror' && '🪞 Зеркальный мир'}
                      {selectedClient.activePrank.type === 'secret_message' && '💬 Секретное послание'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleClearPrank}
                  disabled={isSending}
                  className="px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all shrink-0 border border-rose-500/30"
                >
                  <Trash2 size={13} />
                  <span>Снять эффект</span>
                </button>
              </div>
            )}

            {/* СТУДИЯ ЭФФЕКТОВ И ПРИКОЛОВ */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Sparkles size={15} className="text-primary-500" />
                  <span>Студия эффектов (Prank Lab)</span>
                </label>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Длительность: <strong className="text-primary-600 dark:text-primary-400">{durationSeconds} сек</strong>
                </span>
              </div>

              {/* Выбор длительности */}
              <div className="grid grid-cols-6 gap-1.5">
                {DURATION_OPTIONS.map((opt) => {
                  const isSelected = durationSeconds === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setDurationSeconds(opt.value);
                        triggerHaptic(20);
                      }}
                      className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                        isSelected
                          ? 'bg-primary-600 text-white shadow-md shadow-primary-600/30'
                          : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              {/* Карточки быстрых эффектов */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => handleLaunchPrank('upside_down')}
                  disabled={isSending}
                  className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-500/15 via-purple-500/10 to-pink-500/15 hover:from-indigo-500/25 hover:to-pink-500/25 border border-indigo-500/30 text-left active:scale-[0.98] transition-all flex flex-col justify-between gap-3 group relative overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  <div className="flex items-center justify-between">
                    <div className="p-2 rounded-xl bg-indigo-500 text-white shadow-md shadow-indigo-500/30 group-hover:rotate-180 transition-transform duration-500">
                      <RotateCw size={18} />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                      {durationSeconds}с
                    </span>
                  </div>
                  <div>
                    <div className="font-heading font-bold text-sm text-slate-900 dark:text-white">
                      🙃 Австралийский
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                      Переворачивает интерфейс вверх ногами
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleLaunchPrank('mirror')}
                  disabled={isSending}
                  className="p-3.5 rounded-2xl bg-gradient-to-br from-cyan-500/15 via-blue-500/10 to-teal-500/15 hover:from-cyan-500/25 hover:to-teal-500/25 border border-cyan-500/30 text-left active:scale-[0.98] transition-all flex flex-col justify-between gap-3 group relative overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                >
                  <div className="flex items-center justify-between">
                    <div className="p-2 rounded-xl bg-cyan-500 text-white shadow-md shadow-cyan-500/30 group-hover:scale-x-[-1] transition-transform duration-500">
                      <FlipHorizontal size={18} />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20">
                      {durationSeconds}с
                    </span>
                  </div>
                  <div>
                    <div className="font-heading font-bold text-sm text-slate-900 dark:text-white">
                      🪞 Зеркальный мир
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                      Отражает весь экран по горизонтали
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* СЕКЦИЯ «СЕКРЕТНОЕ ПОСЛАНИЕ» */}
            <div className="p-4 rounded-2xl bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-primary-500/15 text-primary-600 dark:text-primary-400">
                    <MessageSquare size={16} />
                  </div>
                  <h4 className="font-heading font-bold text-sm text-slate-900 dark:text-white">
                    Секретное послание
                  </h4>
                </div>
                <span className="text-[11px] text-slate-400">Всплывающий оверлей</span>
              </div>

              {/* Готовые пресеты сообщений */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Быстрые шаблоны:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {MESSAGE_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setCustomMessage(preset);
                        triggerHaptic(15);
                      }}
                      className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 hover:bg-primary-500/10 dark:hover:bg-primary-500/20 border border-slate-200/80 dark:border-slate-700/80 text-[11px] font-medium text-slate-700 dark:text-slate-300 active:scale-95 transition-all"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Поле ввода текста */}
              <div className="relative">
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Введите свой текст сообщения для игрока..."
                  rows={2}
                  maxLength={150}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none transition-all"
                />
                <div className="absolute right-2.5 bottom-2.5 text-[10px] text-slate-400 pointer-events-none">
                  {customMessage.length}/150
                </div>
              </div>

              <button
                onClick={handleSendSecretMessage}
                disabled={isSending || !customMessage.trim()}
                className="w-full py-3 px-4 rounded-xl bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] text-white font-bold text-xs shadow-md shadow-primary-600/30 transition-all flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                <Send size={14} />
                <span>Отправить послание на экран</span>
              </button>
            </div>

            {/* ЗОНА БЕЗОПАСНОСТИ И ДЕЙСТВИЙ С УСТРОЙСТВОМ */}
            <div className="space-y-2 pt-1">
              {onSetClientAdmin && selectedClient.clientId !== currentClientId && (
                <div>
                  {selectedClient.isAdmin ? (
                    <button
                      onClick={() => {
                        setAdminTargetClient({ client: selectedClient, makeAdmin: false });
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
                        setAdminTargetClient({ client: selectedClient, makeAdmin: true });
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

              {onDeleteClient && !selectedClient.isAdmin && selectedClient.clientId !== currentClientId && (
                <div>
                  <button
                    onClick={() => {
                      setClientToDelete(selectedClient);
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
        )}
      </div>

      {/* МОДАЛЬНЫЕ ОКНА ПОДТВЕРЖДЕНИЯ */}
      {/* 1. Назначение / отзыв прав администратора */}
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

      {/* 2. Удаление клиента */}
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
