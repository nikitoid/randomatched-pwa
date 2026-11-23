import React from 'react';
import { Sparkles, RotateCw, FlipHorizontal, MessageSquare, Send } from 'lucide-react';

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

interface PrankControlsPanelProps {
    durationSeconds: number;
    setDurationSeconds: (seconds: number) => void;
    customMessage: string;
    setCustomMessage: (msg: string) => void;
    isSending: boolean;
    onLaunchPrank: (type: 'upside_down' | 'mirror') => void;
    onSendSecretMessage: () => void;
    triggerHaptic: (pattern?: number | number[]) => void;
}

/**
 * Interactive prank effects studio and secret message sender for a selected client.
 */
export const PrankControlsPanel: React.FC<PrankControlsPanelProps> = ({
    durationSeconds,
    setDurationSeconds,
    customMessage,
    setCustomMessage,
    isSending,
    onLaunchPrank,
    onSendSecretMessage,
    triggerHaptic
}) => {
    return (
        <>
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
                        onClick={() => onLaunchPrank('upside_down')}
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
                        onClick={() => onLaunchPrank('mirror')}
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
                    onClick={onSendSecretMessage}
                    disabled={isSending || !customMessage.trim()}
                    className="w-full py-3 px-4 rounded-xl bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] text-white font-bold text-xs shadow-md shadow-primary-600/30 transition-all flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                >
                    <Send size={14} />
                    <span>Отправить послание на экран</span>
                </button>
            </div>
        </>
    );
};
