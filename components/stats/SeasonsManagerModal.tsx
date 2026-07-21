import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Calendar, Edit2, Trash2, Check, AlertCircle } from 'lucide-react';
import { Season } from '../../types';
import { useBackHandler } from '../../hooks/useBackHandler';

interface SeasonsManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    seasons: Season[];
    latestSeasonId?: string | null;
    onAddSeason: (name: string, startDate: string, endDate?: string) => void;
    onUpdateSeason: (id: string, updatedData: Partial<Omit<Season, 'id'>>) => void;
    onDeleteSeason: (id: string) => void;
    triggerHaptic: (pattern?: number | number[]) => void;
}

export const SeasonsManagerModal: React.FC<SeasonsManagerModalProps> = ({
    isOpen,
    onClose,
    seasons,
    latestSeasonId,
    onAddSeason,
    onUpdateSeason,
    onDeleteSeason,
    triggerHaptic
}) => {
    const [isAdding, setIsAdding] = useState(false);
    const [editingSeasonId, setEditingSeasonId] = useState<string | null>(null);
    const [deletingSeasonId, setDeletingSeasonId] = useState<string | null>(null);

    // Form fields
    const [nameInput, setNameInput] = useState('');
    const [startDateInput, setStartDateInput] = useState('');
    const [endDateInput, setEndDateInput] = useState('');

    useBackHandler(isOpen && !deletingSeasonId && !isAdding && !editingSeasonId, () => {
        onClose();
    }, { id: 'seasons-manager-modal', priority: 60 });

    useBackHandler(isOpen && (isAdding || !!editingSeasonId || !!deletingSeasonId), () => {
        setIsAdding(false);
        setEditingSeasonId(null);
        setDeletingSeasonId(null);
    }, { id: 'seasons-manager-form', priority: 65 });

    if (!isOpen) return null;

    const handleOpenAddForm = () => {
        triggerHaptic(10);
        const todayStr = new Date().toLocaleDateString('en-CA');
        const nextSeasonNum = seasons.length + 1;
        setNameInput(`Сезон ${nextSeasonNum}`);
        setStartDateInput(todayStr);
        setEndDateInput('');
        setIsAdding(true);
        setEditingSeasonId(null);
    };

    const handleOpenEditForm = (season: Season) => {
        triggerHaptic(10);
        setNameInput(season.name);
        setStartDateInput(season.startDate);
        setEndDateInput(season.endDate || '');
        setEditingSeasonId(season.id);
        setIsAdding(false);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!nameInput.trim() || !startDateInput) return;

        triggerHaptic([10, 30]);

        if (isAdding) {
            onAddSeason(nameInput, startDateInput, endDateInput || undefined);
            setIsAdding(false);
        } else if (editingSeasonId) {
            onUpdateSeason(editingSeasonId, {
                name: nameInput.trim(),
                startDate: startDateInput,
                endDate: endDateInput ? endDateInput : undefined
            });
            setEditingSeasonId(null);
        }

        setNameInput('');
        setStartDateInput('');
        setEndDateInput('');
    };

    const handleDeleteConfirm = () => {
        if (!deletingSeasonId) return;
        triggerHaptic(20);
        onDeleteSeason(deletingSeasonId);
        setDeletingSeasonId(null);
    };

    const formatDateStr = (dateStr?: string) => {
        if (!dateStr) return 'по н.в.';
        const [y, m, d] = dateStr.split('-');
        return `${d}.${m}.${y}`;
    };

    return createPortal(
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]">
                
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-800/30">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-primary-500/10 text-primary-600 dark:text-primary-400">
                            <Calendar size={20} />
                        </div>
                        <div>
                            <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                                Управление сезонами
                            </h3>
                            <p className="text-xs text-slate-500 font-medium">
                                Разделение статистики по временным периодам
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => { triggerHaptic(10); onClose(); }}
                        data-testid="close-seasons-manager-btn"
                        className="p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body Container */}
                <div className="p-6 overflow-y-auto flex-1 space-y-4">

                    {/* Form for Add / Edit */}
                    {(isAdding || editingSeasonId) ? (
                        <form onSubmit={handleSave} className="space-y-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold uppercase text-primary-600 dark:text-primary-400">
                                    {isAdding ? 'Новый сезон' : 'Редактирование сезона'}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => { setIsAdding(false); setEditingSeasonId(null); }}
                                    className="text-xs font-medium text-slate-400 hover:text-slate-600"
                                >
                                    Отмена
                                </button>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-500 uppercase">Название сезона</label>
                                <input
                                    type="text"
                                    required
                                    data-testid="season-name-input"
                                    value={nameInput}
                                    onChange={(e) => setNameInput(e.target.value)}
                                    placeholder="Например: Сезон 1 (Лето 2026)"
                                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700 outline-none focus:border-primary-500 transition-colors text-slate-900 dark:text-white"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase">Дата начала</label>
                                    <input
                                        type="date"
                                        required
                                        data-testid="season-start-date-input"
                                        value={startDateInput}
                                        onChange={(e) => setStartDateInput(e.target.value)}
                                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700 outline-none focus:border-primary-500 transition-colors text-slate-900 dark:text-white dark:[color-scheme:dark]"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase">Дата окончания (опция)</label>
                                    <input
                                        type="date"
                                        data-testid="season-end-date-input"
                                        value={endDateInput}
                                        onChange={(e) => setEndDateInput(e.target.value)}
                                        placeholder="Не обязательно"
                                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700 outline-none focus:border-primary-500 transition-colors text-slate-900 dark:text-white dark:[color-scheme:dark]"
                                    />
                                </div>
                            </div>

                            <div className="pt-2 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => { setIsAdding(false); setEditingSeasonId(null); }}
                                    className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                >
                                    Отмена
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 text-xs font-bold rounded-xl bg-primary-500 text-white hover:bg-primary-600 active:scale-95 transition-all flex items-center gap-1.5"
                                >
                                    <Check size={14} />
                                    <span>Сохранить</span>
                                </button>
                            </div>
                        </form>
                    ) : (
                        <button
                            onClick={handleOpenAddForm}
                            className="w-full py-3 px-4 rounded-2xl border-2 border-dashed border-primary-500/40 dark:border-primary-500/30 bg-primary-500/5 hover:bg-primary-500/10 text-primary-600 dark:text-primary-400 font-extrabold text-xs flex items-center justify-center gap-2 active:scale-98 transition-all"
                        >
                            <Plus size={16} />
                            <span>Создать новый сезон</span>
                        </button>
                    )}

                    {/* Seasons List */}
                    <div className="space-y-2.5">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
                            Список сезонов ({seasons.length})
                        </div>

                        {seasons.length === 0 ? (
                            <div className="p-6 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 text-slate-400 space-y-1">
                                <p className="text-xs font-semibold">Сезоны не созданы</p>
                                <p className="text-[11px] text-slate-400">
                                    По умолчанию отображается общая статистика за всё время.
                                </p>
                            </div>
                        ) : (
                            seasons.map((season) => {
                                const isLatest = season.id === latestSeasonId;
                                return (
                                    <div
                                        key={season.id}
                                        className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                                            isLatest
                                                ? 'bg-primary-500/5 dark:bg-primary-500/10 border-primary-500/30'
                                                : 'bg-white dark:bg-slate-800/40 border-slate-100 dark:border-slate-800'
                                        }`}
                                    >
                                        <div className="space-y-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                                                    {season.name}
                                                </span>
                                                {isLatest && (
                                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-primary-500 text-white shrink-0">
                                                        Текущий
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                                                <Calendar size={12} className="text-slate-400" />
                                                <span>
                                                    {formatDateStr(season.startDate)} — {formatDateStr(season.endDate)}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1 shrink-0">
                                            <button
                                                onClick={() => handleOpenEditForm(season)}
                                                className="p-2 rounded-xl text-slate-400 hover:text-primary-500 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                                                title="Редактировать сезон"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                onClick={() => { triggerHaptic(15); setDeletingSeasonId(season.id); }}
                                                className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                                                title="Удалить сезон"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Delete Confirmation Sub-modal */}
                {deletingSeasonId && (
                    <div className="absolute inset-0 z-20 bg-slate-900/80 backdrop-blur-sm p-6 flex items-center justify-center animate-in fade-in duration-150">
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-w-xs text-center">
                            <div className="mx-auto w-10 h-10 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center">
                                <AlertCircle size={22} />
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                                    Удалить этот сезон?
                                </h4>
                                <p className="text-[11px] text-slate-400 leading-relaxed">
                                    Матчи в истории не удалятся, будет удален только временной период сезона.
                                </p>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={() => setDeletingSeasonId(null)}
                                    className="flex-1 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800"
                                >
                                    Отмена
                                </button>
                                <button
                                    onClick={handleDeleteConfirm}
                                    data-testid="confirm-delete-season-btn"
                                    className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-rose-500 hover:bg-rose-600"
                                >
                                    Удалить
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};
