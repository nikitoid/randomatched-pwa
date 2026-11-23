import React from 'react';
import { Vibrate, Volume2, Terminal } from 'lucide-react';

interface AppSettingsTabProps {
    hapticsEnabled: boolean;
    onToggleHaptics?: () => void;
    forceAudioMode: boolean;
    onToggleForceAudioMode?: () => void;
    isDebugMode: boolean;
    onToggleDebug?: (val: boolean) => void;
    triggerHaptic: (pattern?: number | number[]) => void;
}

/**
 * System settings tab: hardware vibration, audio micro-clicks, and developer mode.
 */
export const AppSettingsTab: React.FC<AppSettingsTabProps> = ({
    hapticsEnabled,
    onToggleHaptics,
    forceAudioMode,
    onToggleForceAudioMode,
    isDebugMode,
    onToggleDebug,
    triggerHaptic
}) => {
    return (
        <div className="flex flex-col items-center justify-start min-h-full p-4 sm:p-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="w-full max-w-sm flex flex-col gap-3">
                <h3 className="text-left text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1 mb-0.5">Системные параметры</h3>

                {/* Hardware Vibration Setting Card (Android) */}
                <div className="bg-white/80 dark:bg-slate-900/80 rounded-2xl p-4 shadow-xs border border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${hapticsEnabled ? 'bg-primary-500/15 text-primary-600 dark:text-primary-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                                <Vibrate size={20} />
                            </div>
                            <div className="text-left min-w-0 flex-1">
                                <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                                    Вибрация при нажатии
                                    <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold px-1.5 py-0.5 rounded">Android</span>
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Физический вибромотор (не поддерживается в iOS Safari)</p>
                            </div>
                        </div>
                        <button
                            onClick={() => { onToggleHaptics?.(); triggerHaptic(10); }}
                            className={`shrink-0 relative w-12 h-7 rounded-full transition-colors duration-200 ease-in-out touch-manipulation ${hapticsEnabled ? 'bg-primary-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                        >
                            <span className={`block w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${hapticsEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                </div>

                {/* Audio Micro-Clicks Setting Card (For iPhone & All Devices) */}
                <div className="bg-white/80 dark:bg-slate-900/80 rounded-2xl p-4 shadow-xs border border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${forceAudioMode ? 'bg-primary-500/15 text-primary-600 dark:text-primary-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                                <Volume2 size={20} />
                            </div>
                            <div className="text-left min-w-0 flex-1">
                                <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                                    Клик через динамик
                                    <span className="text-[9px] bg-primary-500/10 text-primary-600 dark:text-primary-400 font-bold px-1.5 py-0.5 rounded">iPhone / Все</span>
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Тактильные акустические микро-щелчки Taptic feel</p>
                            </div>
                        </div>
                        <button
                            onClick={() => { onToggleForceAudioMode?.(); triggerHaptic(10); }}
                            className={`shrink-0 relative w-12 h-7 rounded-full transition-colors duration-200 ease-in-out touch-manipulation ${forceAudioMode ? 'bg-primary-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                        >
                            <span className={`block w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${forceAudioMode ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                </div>

                {/* Developer Mode Setting Card */}
                <div className="bg-white/80 dark:bg-slate-900/80 rounded-2xl p-4 shadow-xs border border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isDebugMode ? 'bg-primary-500/15 text-primary-600 dark:text-primary-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                                <Terminal size={20} />
                            </div>
                            <div className="text-left min-w-0 flex-1">
                                <h4 className="font-bold text-slate-900 dark:text-white text-sm">Режим разработчика</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Отображение весов алгоритма и Debug вкладки</p>
                            </div>
                        </div>
                        <button
                            onClick={() => { onToggleDebug?.(!isDebugMode); triggerHaptic(10); }}
                            className={`shrink-0 relative w-12 h-7 rounded-full transition-colors duration-200 ease-in-out touch-manipulation ${isDebugMode ? 'bg-primary-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                        >
                            <span className={`block w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${isDebugMode ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
