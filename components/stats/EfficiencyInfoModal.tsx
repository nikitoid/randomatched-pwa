import React from 'react';
import { TrendingUp } from 'lucide-react';
import { BaseModal } from '../common/BaseModal';

interface EfficiencyInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    triggerHaptic: (pattern?: number | number[]) => void;
}

/**
 * Modal explaining the Wilson Score + time-decay player efficiency algorithm.
 */
export const EfficiencyInfoModal: React.FC<EfficiencyInfoModalProps> = ({
    isOpen,
    onClose,
    triggerHaptic
}) => {
    if (!isOpen) return null;

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="Алгоритм эффективности"
            subtitle="Ранжирование игроков в статистике"
            icon={<TrendingUp size={20} className="text-primary-500" />}
            maxWidth="md"
            variant="auto"
            modalId="stats-efficiency-modal"
            priority={80}
            showCloseButton={false}
            footer={(close) => (
                <button
                    onClick={() => { close(); triggerHaptic(10); }}
                    className="w-full py-3.5 bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white font-bold text-sm rounded-2xl transition-all shadow-lg shadow-primary-500/20 active:scale-95 min-h-[48px]"
                >
                    Понятно
                </button>
            )}
        >
            <div className="space-y-3.5 text-xs text-slate-600 dark:text-slate-300">
                {/* Главная идея */}
                <div className="p-3.5 bg-primary-50/80 dark:bg-primary-950/50 rounded-2xl border border-primary-100 dark:border-primary-900/30">
                    <div className="font-bold text-primary-900 dark:text-primary-300 mb-1.5 flex items-center gap-1.5 text-xs sm:text-sm">
                        <span className="w-2 h-2 rounded-full bg-primary-500"></span>
                        <span>Зачем необходим данный расчёт?</span>
                    </div>
                    <div className="text-slate-700 dark:text-slate-300 leading-relaxed">
                        Простой процент побед обманчив. Игрок с <strong>3 победами из 4 матчей (75%)</strong> ещё не доказал стабильность. Алгоритм вычисляет <strong>минимальный гарантированный винрейт</strong> с учётом дистанции и давности игр.
                    </div>
                </div>

                {/* Наглядное сравнение */}
                <div className="p-3.5 bg-slate-50/90 dark:bg-slate-800/90 rounded-2xl space-y-2 border border-slate-100 dark:border-slate-800">
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs sm:text-sm">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span>Почему этот расчёт справедлив?</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                        Сравнение результатов игроков на разной дистанции:
                    </p>

                    <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/60 rounded-xl text-[11px]">
                            <div>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">2 победы / 10 матчей</span>
                                <span className="text-[10px] text-slate-400 ml-1">(20% винрейт)</span>
                            </div>
                            <div className="font-bold text-slate-500">
                                Эффективность: <span className="font-mono text-red-500">6.0%</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-2 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/50 rounded-xl text-[11px]">
                            <div>
                                <span className="font-semibold text-emerald-900 dark:text-emerald-300">39 побед / 95 матчей</span>
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 ml-1">(41% винрейт)</span>
                            </div>
                            <div className="font-bold text-emerald-700 dark:text-emerald-400">
                                Эффективность: <span className="font-mono text-emerald-900 dark:text-emerald-200">31.6%</span> 🏆
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-2 bg-primary-50/80 dark:bg-primary-950/40 border border-primary-200/70 dark:border-primary-800/50 rounded-xl text-[11px]">
                            <div>
                                <span className="font-semibold text-primary-900 dark:text-primary-300">3 победы / 4 матча</span>
                                <span className="text-[10px] text-primary-600 dark:text-primary-400 ml-1">(75% винрейт)</span>
                            </div>
                            <div className="font-mono font-bold text-primary-700 dark:text-primary-400">
                                Эффективность: <span className="text-primary-900 dark:text-primary-200">30.1%</span>
                            </div>
                        </div>
                    </div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 italic mt-1">
                        * Игрок с 39/95 по праву стоит выше игрока с 3/4 на малой дистанции, так как подкрепил результат 95 играми.
                    </p>
                </div>

                {/* Учёт времени */}
                <div className="p-3.5 bg-slate-50/90 dark:bg-slate-800/90 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-1.5 text-xs sm:text-sm">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        <span>Учёт давности игр и активность</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400 pl-0.5 leading-relaxed">
                        <li>Свежие победы ценнее: вес матча уменьшается в 2 раза каждые 6 месяцев.</li>
                        <li>Игроки без активных матчей более 60 дней автоматически опускаются в конец списка.</li>
                    </ul>
                </div>
            </div>
        </BaseModal>
    );
};
