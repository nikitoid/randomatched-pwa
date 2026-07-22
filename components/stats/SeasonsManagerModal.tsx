import React, { useState } from 'react';
import { Plus, Calendar, Edit2, Trash2, Check, AlertCircle } from 'lucide-react';
import { Season } from '../../types';
import { BaseModal } from '../common/BaseModal';
import { ConfirmModal } from '../common/ConfirmModal';

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

        const normalizedInputName = trimmedName.toLowerCase();
        const isDuplicate = seasons.some(s => s.name.trim().toLowerCase() === normalizedInputName && s.id !== editingSeasonId);

        if (isDuplicate) {
            setFormError('Сезон с таким названием уже существует');
            triggerHaptic([30, 50, 30]);
            return;
        }

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

    // Sort seasons descending by startDate
    const sortedSeasonsDescending = [...seasons].sort((a, b) => b.startDate.localeCompare(a.startDate));

    const seasonToDeleteObj = seasons.find(s => s.id === deletingSeasonId);

    return (
        <>
            {/* Seasons List Modal */}
            <BaseModal
                isOpen={isOpen}
                onClose={onClose}
                title="Управление сезонами"
                subtitle="Создавайте и редактируйте сезоны"
                icon={<Calendar size={20} className="text-primary-600 dark:text-primary-400" />}
                maxWidth="md"
                variant="auto"
                modalId="seasons-manager-modal"
                closeButtonTestId="close-seasons-manager-btn"
                priority={60}
            >
                {/* Button to open Add Season form */}
                <button
                    type="button"
                    onClick={handleOpenAddForm}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white rounded-2xl text-sm font-bold transition-all shadow-md shadow-primary-500/20 active:scale-[0.98] min-h-[48px] mb-2"
                >
                    <Plus size={18} />
                    <span>Создать новый сезон</span>
                </button>

                {/* List of Seasons */}
                <div className="space-y-2">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                        Все сезоны ({seasons.length})
                    </h4>
                    {sortedSeasonsDescending.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 text-sm">
                            Сезоны не созданы
                        </div>
                    ) : (
                        sortedSeasonsDescending.map(season => {
                            const isLatest = season.id === latestSeasonId;
                            const isEditing = season.id === editingSeasonId;

                            return (
                                <div
                                    key={season.id}
                                    className={`
                                        p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 min-h-[56px]
                                        ${isEditing
                                            ? 'border-primary-500 bg-primary-50/40 dark:bg-primary-950/20'
                                            : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30'}
                                    `}
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-900 dark:text-white text-sm truncate">
                                                {season.name}
                                            </span>
                                            {isLatest && (
                                                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-md shrink-0">
                                                    Активный
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            {formatDateStr(season.startDate)} — {formatDateStr(season.endDate)}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => handleOpenEditForm(season)}
                                            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-all min-h-[40px] min-w-[40px] flex items-center justify-center"
                                            title="Редактировать сезон"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setDeletingSeasonId(season.id)}
                                            className="p-2 rounded-xl text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all min-h-[40px] min-w-[40px] flex items-center justify-center"
                                            title="Удалить сезон"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </BaseModal>

            {/* Add / Edit Season Form Overlay Sheet */}
            <BaseModal
                isOpen={isAdding || !!editingSeasonId}
                onClose={resetForm}
                title={isAdding ? 'Новый сезон' : 'Редактирование сезона'}
                subtitle={isAdding ? 'Добавление нового периода' : 'Изменение параметров сезона'}
                icon={<Calendar size={20} className="text-primary-600 dark:text-primary-400" />}
                maxWidth="md"
                variant="auto"
                modalId="season-form-modal"
                closeButtonTestId="close-season-form-btn"
                priority={70}
                showCloseButton={false}
            >
                <form onSubmit={handleSave} className="space-y-4">
                    {formError && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                            <AlertCircle size={16} className="shrink-0" />
                            <span>{formError}</span>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Название сезона
                        </label>
                        <input
                            type="text"
                            data-testid="season-name-input"
                            value={nameInput}
                            onChange={e => setNameInput(e.target.value)}
                            placeholder="Например: Сезон 3"
                            className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Дата начала
                            </label>
                            <input
                                type="date"
                                data-testid="season-start-date-input"
                                value={startDateInput}
                                onChange={e => setStartDateInput(e.target.value)}
                                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Дата окончания
                            </label>
                            <input
                                type="date"
                                data-testid="season-end-date-input"
                                value={endDateInput}
                                onChange={e => setEndDateInput(e.target.value)}
                                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            data-testid="cancel-season-form-btn"
                            onClick={resetForm}
                            className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl active:scale-95 transition-all min-h-[44px]"
                        >
                            Отмена
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-xs font-bold rounded-xl shadow-md shadow-primary-500/20 active:scale-95 transition-all flex items-center gap-1.5 min-h-[44px]"
                        >
                            <Check size={16} />
                            <span>Сохранить</span>
                        </button>
                    </div>
                </form>
            </BaseModal>

            {/* Confirm Delete Season Dialog */}
            <ConfirmModal
                isOpen={!!deletingSeasonId}
                onCancel={() => setDeletingSeasonId(null)}
                onConfirm={handleDeleteConfirm}
                title="Удалить сезон?"
                description={
                    <span>
                        Вы действительно хотите удалить сезон <strong>«{seasonToDeleteObj?.name}»</strong>? Статистика матчей останется в системе.
                    </span>
                }
                confirmText="Удалить"
                cancelText="Отмена"
                confirmVariant="danger"
                priority={80}
                modalId="delete-season-confirm"
                confirmTestId="confirm-delete-season-btn"
            />
        </>
    );
};
