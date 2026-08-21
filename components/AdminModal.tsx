import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, 
  Smartphone, 
  Monitor, 
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
  Radio, 
  Wifi, 
  WifiOff, 
  ChevronRight,
  ArrowLeft,
  Crown
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

const DURATION_OPTIONS = [
  { label: '15 сек', value: 15 },
  { label: '30 сек', value: 30 },
  { label: '1 мин', value: 60 },
  { label: '2 мин', value: 120 },
  { label: '5 мин', value: 300 }
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

  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedOwnId, setCopiedOwnId] = useState(false);

  // Состояние редактирования имени
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');

  // Состояние изменения прав администратора
  const [adminTargetClient, setAdminTargetClient] = useState<{ client: ClientData; makeAdmin: boolean } | null>(null);
  const [isUpdatingAdmin, setIsUpdatingAdmin] = useState<boolean>(false);

  // Состояние удаления клиента
  const [clientToDelete, setClientToDelete] = useState<ClientData | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Состояние настройки приколов
  const [durationSeconds, setDurationSeconds] = useState<number>(30);
  const [customMessage, setCustomMessage] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);

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

  // Подписка на коллекцию клиентов при открытии модального окна
  useEffect(() => {
    if (!isOpen) {
      setSelectedClientId(null);
      setEditingClientId(null);
      return;
    }

    const unsubscribe = onSubscribeToClients();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isOpen, onSubscribeToClients]);

  // Обработка кнопки "Назад" (аппаратная / жест / PWA): при нахождении внутри клиента возвращает к общему списку
  useBackHandler(
    isOpen && Boolean(selectedClientId),
    () => {
      setSelectedClientId(null);
    },
    { id: 'admin-modal-client-details', priority: 30 }
  );

  // Выбранный клиент
  const selectedClient = useMemo(() => {
    if (!selectedClientId) return null;
    return allClients.find(c => Boolean(c.clientId && c.clientId === selectedClientId)) || null;
  }, [selectedClientId, allClients]);

  // Фильтрация клиентов по поиску
  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return allClients;
    const q = searchQuery.toLowerCase();
    return allClients.filter(c => 
      c.customName?.toLowerCase().includes(q) ||
      (c.clientId && c.clientId.toLowerCase().includes(q)) ||
      c.device?.os?.toLowerCase().includes(q) ||
      c.device?.browser?.toLowerCase().includes(q)
    );
  }, [allClients, searchQuery]);

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

  // Начало редактирования имени клиента
  const handleStartEditing = (client: ClientData, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!client.clientId) return;
    setEditingClientId(client.clientId);
    setEditNameValue(client.customName || '');
  };

  // Сохранение отредактированного имени
  const handleSaveName = async (clientId: string, e: React.MouseEvent) => {
    e.stopPropagation();
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

  // Запуск прикола (Австралийский / Зеркальный)
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

  // Отправка секретного послания
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
      expiresAt: Date.now() + 180000, // 3 минуты таймаут если не закроет
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

  // Очистка приколов на устройстве
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

  // Определение онлайн статуса (активен < 2 минут назад)
  const isClientOnline = (lastSeen: number) => {
    return Date.now() - lastSeen < 120000;
  };

  // Форматирование времени последней активности
  const formatLastSeen = (timestamp: number) => {
    if (!timestamp) return 'Неизвестно';
    const diffMin = Math.floor((Date.now() - timestamp) / 60000);
    if (diffMin < 1) return 'Только что';
    if (diffMin < 60) return `${diffMin} мин. назад`;
    const date = new Date(timestamp);
    return `${date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} ${date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      variant="auto"
      maxWidth="lg"
      priority={25}
      title={
        selectedClient ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedClientId(null);
                triggerHaptic(10);
              }}
              className="p-1 -ml-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg active:scale-95 transition-all"
              aria-label="Назад к списку устройств"
            >
              <ArrowLeft size={18} />
            </button>
            <span className="truncate">{selectedClient.customName}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Crown className="text-amber-500 w-5 h-5 animate-pulse" />
            <span>Панель Администратора</span>
          </div>
        )
      }
      subtitle={
        selectedClient 
          ? `Управление эффектами и приколами`
          : `Всего устройств: ${allClients.length}`
      }
    >
      <div className="space-y-4 pb-2">
        {/* Карточка текущего администраторского устройства (только в общем списке) */}
        {!selectedClient && (
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-primary-500/10 to-indigo-500/10 border border-amber-500/30 flex flex-col gap-2 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="text-amber-600 dark:text-amber-400 w-4 h-4 shrink-0" />
                <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  Ваше устройство (Администратор)
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Online</span>
              </div>
            </div>

            <div className="flex items-center justify-between bg-black/5 dark:bg-white/5 p-2 rounded-xl border border-black/5 dark:border-white/10">
              <div className="truncate mr-2 font-mono text-[11px] text-slate-700 dark:text-slate-300 select-all">
                {currentClientId}
              </div>
              <button
                onClick={handleCopyOwnId}
                className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 active:scale-95 text-amber-700 dark:text-amber-300 text-xs font-semibold flex items-center gap-1 shrink-0 transition-all"
              >
                {copiedOwnId ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                <span>{copiedOwnId ? 'Скопировано' : 'Скопировать'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Экран управления выбранным клиентом */}
        {selectedClient ? (
          <div className="space-y-4 animate-fadeIn">
            {/* Кнопка "Назад ко всем устройствам" */}
            <button
              onClick={() => {
                setSelectedClientId(null);
                triggerHaptic(10);
              }}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline active:scale-95 transition-transform"
            >
              <ArrowLeft size={14} />
              <span>Назад ко всем устройствам</span>
            </button>

            {/* Карточка информации о выбранном устройстве */}
            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="font-heading font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{selectedClient.customName}</span>
                  {selectedClient.isAdmin && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/30">
                      ADMIN
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs font-medium">
                  {isClientOnline(selectedClient.lastSeen) ? (
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      В сети
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-slate-400">
                      <span className="w-2 h-2 rounded-full bg-slate-400" />
                      {formatLastSeen(selectedClient.lastSeen)}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700/60 font-medium">
                  {selectedClient.device?.os || 'Устройство'}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700/60 font-medium">
                  {selectedClient.device?.browser || 'Браузер'}
                </span>
                {selectedClient.device?.isPWA && (
                  <span className="px-2 py-0.5 rounded-md bg-primary-500/20 text-primary-600 dark:text-primary-400 font-bold">
                    PWA App
                  </span>
                )}
                <span className="font-mono text-[10px] opacity-75">
                  v{selectedClient.appVersion || '1.0'}
                </span>
              </div>

              {/* Индикатор активного эффекта на клиенте */}
              {selectedClient.activePrank && (
                <div className="mt-2 p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-medium text-purple-700 dark:text-purple-300">
                    <Sparkles size={14} className="text-purple-500 animate-spin-slow" />
                    <span>
                      Активен эффект:{' '}
                      <strong className="font-bold">
                        {selectedClient.activePrank.type === 'upside_down' && '🙃 Австралийский'}
                        {selectedClient.activePrank.type === 'mirror' && '🪞 Зеркальный'}
                        {selectedClient.activePrank.type === 'secret_message' && '💬 Секретное послание'}
                      </strong>
                    </span>
                  </div>
                  <button
                    onClick={handleClearPrank}
                    disabled={isSending}
                    className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-600 dark:text-rose-400 text-[11px] font-bold flex items-center gap-1 active:scale-95 transition-all"
                  >
                    <Trash2 size={12} />
                    <span>Снять</span>
                  </button>
                </div>
              )}
            </div>

            {/* Выбор длительности для приколов */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Clock size={14} className="text-primary-500" />
                <span>Длительность эффекта:</span>
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {DURATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setDurationSeconds(opt.value);
                      triggerHaptic(20);
                    }}
                    className={`py-2 text-center rounded-xl text-xs font-bold transition-all active:scale-95 ${
                      durationSeconds === opt.value
                        ? 'bg-primary-600 text-white shadow-md shadow-primary-600/30'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Быстрые кнопки запуска визуальных приколов */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => handleLaunchPrank('upside_down')}
                disabled={isSending}
                className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-500/15 to-purple-500/15 hover:from-indigo-500/25 hover:to-purple-500/25 border border-indigo-500/30 text-left active:scale-[0.98] transition-all flex flex-col justify-between gap-3 group"
              >
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-xl bg-indigo-500 text-white shadow-md shadow-indigo-500/30 group-hover:rotate-180 transition-transform duration-500">
                    <RotateCw size={18} />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                    {durationSeconds}с
                  </span>
                </div>
                <div>
                  <div className="font-heading font-bold text-sm text-slate-900 dark:text-white">
                    🙃 Австралийский
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                    Переворачивает экран вверх ногами
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleLaunchPrank('mirror')}
                disabled={isSending}
                className="p-3.5 rounded-2xl bg-gradient-to-br from-cyan-500/15 to-blue-500/15 hover:from-cyan-500/25 hover:to-blue-500/25 border border-cyan-500/30 text-left active:scale-[0.98] transition-all flex flex-col justify-between gap-3 group"
              >
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-xl bg-cyan-500 text-white shadow-md shadow-cyan-500/30 group-hover:scale-x-[-1] transition-transform duration-500">
                    <FlipHorizontal size={18} />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-600 dark:text-cyan-400">
                    {durationSeconds}с
                  </span>
                </div>
                <div>
                  <div className="font-heading font-bold text-sm text-slate-900 dark:text-white">
                    🪞 Зеркальный мир
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                    Отражает интерфейс по горизонтали
                  </div>
                </div>
              </button>
            </div>

            {/* Секция "Секретное послание" */}
            <div className="p-4 rounded-2xl bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 space-y-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="text-primary-500 w-4 h-4" />
                <h4 className="font-heading font-bold text-sm text-slate-900 dark:text-white">
                  💬 Секретное послание
                </h4>
              </div>

              {/* Поле ввода своего текста */}
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Введите текст сообщения для игрока..."
                rows={2}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />

              <button
                onClick={handleSendSecretMessage}
                disabled={isSending || !customMessage.trim()}
                className="w-full py-2.5 px-4 rounded-xl bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] text-white font-semibold text-xs shadow-md shadow-primary-600/30 transition-all flex items-center justify-center gap-2"
              >
                <MessageSquare size={14} />
                <span>Отправить послание на экран</span>
              </button>
            </div>

            {/* Кнопка назначения / снятия прав администратора */}
            {onSetClientAdmin && selectedClient.clientId !== currentClientId && (
              <div className="pt-2">
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

            {/* Кнопка удаления устройства */}
            {onDeleteClient && !selectedClient.isAdmin && selectedClient.clientId !== currentClientId && (
              <div className="pt-1">
                <button
                  onClick={() => {
                    setClientToDelete(selectedClient);
                    triggerHaptic(20);
                  }}
                  disabled={isSending || isDeleting || isUpdatingAdmin}
                  className="w-full py-2.5 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 active:scale-[0.98] text-rose-600 dark:text-rose-400 font-semibold text-xs border border-rose-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 size={14} />
                  <span>Удалить устройство из базы</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Список всех подключенных устройств */
          <div className="space-y-3">
            {/* Поле поиска */}
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по имени, устройству или ID..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Список клиентов */}
            {isLoadingClients && allClients.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Загрузка списка устройств...
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Устройства не найдены
              </div>
            ) : (
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
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
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 active:scale-[0.99] ${
                        isSelf
                          ? 'bg-amber-500/5 hover:bg-amber-500/10 border-amber-500/30'
                          : 'bg-slate-100/70 dark:bg-slate-800/70 hover:bg-slate-200/70 dark:hover:bg-slate-700/70 border-slate-200/70 dark:border-slate-700/70'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Иконка платформы */}
                        <div className="p-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 shrink-0">
                          {client.device?.os === 'Windows' || client.device?.os === 'macOS' || client.device?.os === 'Linux' ? (
                            <Monitor size={18} />
                          ) : (
                            <Smartphone size={18} />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          {/* Имя устройства / редактирование */}
                          <div className="flex items-center gap-2">
                            {isEditing ? (
                              <div className="flex items-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="text"
                                  value={editNameValue}
                                  onChange={(e) => setEditNameValue(e.target.value)}
                                  className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-primary-500 text-xs font-bold text-slate-900 dark:text-white flex-1 focus:outline-none"
                                  autoFocus
                                />
                                <button
                                  onClick={(e) => handleSaveName(client.clientId, e)}
                                  className="p-1 rounded-md bg-primary-600 text-white hover:bg-primary-500"
                                >
                                  <Save size={13} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingClientId(null);
                                  }}
                                  className="p-1 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-500"
                                >
                                  <X size={13} />
                                </button>
                              </div>
                            ) : (
                              <>
                                <span className="font-heading font-bold text-xs text-slate-900 dark:text-white truncate">
                                  {client.customName}
                                </span>
                                <button
                                  onClick={(e) => handleStartEditing(client, e)}
                                  className="p-1 text-slate-400 hover:text-primary-500 transition-colors"
                                  title="Переименовать"
                                >
                                  <Edit3 size={12} />
                                </button>
                                {!isSelf && onSetClientAdmin && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setAdminTargetClient({ client, makeAdmin: !client.isAdmin });
                                      triggerHaptic(20);
                                    }}
                                    className={`p-1 transition-colors ${
                                      client.isAdmin
                                        ? 'text-amber-500 hover:text-amber-600 dark:hover:text-amber-400'
                                        : 'text-slate-400 hover:text-amber-500'
                                    }`}
                                    title={client.isAdmin ? 'Отозвать права администратора' : 'Назначить администратором'}
                                  >
                                    <Crown size={12} />
                                  </button>
                                )}
                                {!isSelf && onDeleteClient && !client.isAdmin && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setClientToDelete(client);
                                      triggerHaptic(20);
                                    }}
                                    className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                                    title="Удалить устройство"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                )}
                              </>
                            )}

                            {isSelf ? (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold shrink-0">
                                ВЫ
                              </span>
                            ) : client.isAdmin ? (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold shrink-0 flex items-center gap-0.5 border border-amber-500/30">
                                <Crown size={9} />
                                ADMIN
                              </span>
                            ) : null}
                          </div>

                          {/* Подробности и статус */}
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                            <span className="flex items-center gap-1 font-medium">
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isOnlineClient ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                                }`}
                              />
                              {isOnlineClient ? 'В сети' : formatLastSeen(client.lastSeen)}
                            </span>
                            <span>•</span>
                            <span className="truncate">{client.device?.os || 'OS'}</span>
                            {client.activePrank && (
                              <>
                                <span>•</span>
                                <span className="text-purple-600 dark:text-purple-400 font-bold flex items-center gap-0.5">
                                  <Sparkles size={10} />
                                  Прикол
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <ChevronRight size={16} className="text-slate-400 shrink-0" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Модальное окно подтверждения назначения/снятия прав администратора */}
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

      {/* Модальное окно подтверждения удаления клиента */}
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
