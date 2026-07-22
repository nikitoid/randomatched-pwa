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
    const [formError, setFormError] = useState<string | null>(null);

    // Form fields
    const [nameInput, setNameInput] = useState('');
    const [startDateInput, setStartDateInput] = useState('');
    const [endDateInput, setEndDateInput] = useState('');

    const resetForm = () => {
        setNameInput('');
        setStartDateInput('');
        setEndDateInput('');
        setFormError(null);
        setIsAdding(false);
        setEditingSeasonId(null);
    };

    useBackHandler(isOpen && !deletingSeasonId && !isAdding && !editingSeasonId, () => {
        onClose();
    }, { id: 'seasons-manager-modal', priority: 60 });

    useBackHandler(isOpen && (isAdding || !!editingSeasonId || !!deletingSeasonId), () => {
        resetForm();
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
        setFormError(null);
        setIsAdding(true);
        setEditingSeasonId(null);
    };

    const handleOpenEditForm = (season: Season) => {
        triggerHaptic(10);
        setNameInput(season.name);
        setStartDateInput(season.startDate);
        setEndDateInput(season.endDate || '');
        setFormError(null);
        setEditingSeasonId(season.id);
        setIsAdding(false);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);

        const trimmedName = nameInput.trim();
        if (!trimmedName || !startDateInput) return;

        if (endDateInput && endDateInput < startDateInput) {
            setFormError('Дата окончания не может быть раньше даты начала');
            triggerHaptic([30, 50, 30]);
            return;
        }

        triggerHaptic([10, 30]);

        if (isAdding) {
            onAddSeason(trimmedName, startDateInput, endDateInput || undefined);
        } else if (editingSeasonId) {
            onUpdateSeason(editingSeasonId, {
                name: trimmedName,
                startDate: startDateInput,
                endDate: endDateInput ? endDateInput : undefined
            });
        }

        resetForm();
    };

    const handleDeleteConfirm = () => {
        if (!deletingSeasonId) return;
        triggerHaptic(20);
        if (deletingSeasonId === editingSeasonId) {
            resetForm();
        }
        onDeleteSeason(deletingSeasonId);
        setDeletingSeasonId(null);
    };

    const formatDateStr = (dateStr?: string) => {
        if (!dateStr) return 'по н.в.';
        const [y, m, d] = dateStr.split('-');
        return `${d}.${m}.${y}`;
    };

    // Sort seasons descending by startDate (latest seasons first)
    const sortedSeasonsDescending = [...seasons].sort((a, b) => b.startDate.localeCompare(a.startDate));

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
                        onClick={() => { triggerHaptic(10); resetForm(); onClose(); }}
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
                                    onClick={resetForm}
                                    className="text-xs font-medium text-slate-400 hover:text-slate-600"
                                >
                                    Отмена
                                </button>
                            </div>

                            {formError && (
                                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
                                    <AlertCircle size={16} className="shrink-0" />
                                    <span>{formError}</span>
                                </div>
                            )}

                            <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-500 uppercase">Название сезона</label>
                                <input
                                    type="text"
                                    required
                                    data-testid="season-name-input"
                                    value={nameInput}
                                    onChange={(e) => { setNameInput(e.target.value); setFormError(null); }}
                                    placeholder="Например: Сезон 1 (Лето 2026)"
                                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700 outline-none focus:border-primary-500 transition-colors text-slate-900 dark:text-white"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1 min-w-0">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase block truncate whitespace-nowrap" title="Дата начала">
                                        Дата начала
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        data-testid="season-start-date-input"
                                        value={startDateInput}
                                        onChange={(e) => { setStartDateInput(e.target.value); setFormError(null); }}
                                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700 outline-none focus:border-primary-500 transition-colors text-slate-900 dark:text-white dark:[color-scheme:dark]"
                                    />
                                </div>
                                <div className="space-y-1 min-w-0">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase block truncate whitespace-nowrap" title="Дата окончания (опционально)">
                                        Дата окончания <span className="text-[9px] font-normal text-slate-400 dark:text-slate-500 lowercase">(опц.)</span>
                                    </label>
                                    <input
                                        type="date"
                                        data-testid="season-end-date-input"
                                        value={endDateInput}
                                        onChange={(e) => { setEndDateInput(e.target.value); setFormError(null); }}
                                        placeholder="Не обязательно"
                                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700 outline-none focus:border-primary-500 transition-colors text-slate-900 dark:text-white dark:[color-scheme:dark]"
                                    />
                                </div>
                            </div>

                            <div className="pt-2 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={resetForm}
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
                        <>
                            <button
                                onClick={handleOpenAddForm}
                                className="w-full py-3 px-4 rounded-2xl border-2 border-dashed border-primary-500/40 dark:border-primary-500/30 bg-primary-500/5 hover:bg-primary-500/10 text-primary-600 dark:text-primary-400 font-extrabold text-xs flex items-center justify-center gap-2 active:scale-98 transition-all"
                            >
                                <Plus size={16} />
                                <span>Создать новый сезон</span>
                            </button>

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
                                    sortedSeasonsDescending.map((season) => {
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
                        </>
                    )}
                </div>

                {/* Delete Confirmation Sub-modal */}
                {deletingSeasonId && (
                    <div className="absolute inset-0 z-30 bg-slate-900/60 backdrop-blur-sm p-6 flex items-center justify-center animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-xs rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800 ring-1 ring-slate-900/5 dark:ring-white/10 animate-in zoom-in-95 duration-200 flex flex-col items-center text-center">
                            <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/30 text-rose-500 dark:text-rose-400 rounded-full flex items-center justify-center mb-4">
                                <Trash2 size={24} />
                            </div>
                            <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                                Удалить этот сезон?
                            </h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                                Матчи в истории не удалятся, будет удален только временной период сезона.
                            </p>
                            <div className="grid grid-cols-2 gap-3 w-full">
                                <button
                                    type="button"
                                    onClick={() => { triggerHaptic(10); setDeletingSeasonId(null); }}
                                    className="py-3.5 px-4 font-bold text-sm text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-2xl active:scale-95 transition-all flex items-center justify-center"
                                >
                                    Отмена
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDeleteConfirm}
                                    data-testid="confirm-delete-season-btn"
                                    className="py-3.5 px-4 font-bold text-sm text-white bg-rose-500 hover:bg-rose-600 rounded-2xl shadow-lg shadow-rose-500/30 active:scale-95 transition-all flex items-center justify-center"
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
