import React from 'react';
import { X } from 'lucide-react';
import { GenerationMode, ExtraGenerationMode } from '../../types';
import { Z_INDEX_BASE } from '../../constants/zIndex';
import { GenerationModePopover } from './GenerationModePopover';

interface ResultTopBarProps {
    generationMode: GenerationMode;
    setGenerationMode?: (mode: GenerationMode) => void;
    balanceThreshold: number;
    setBalanceThreshold?: (val: number) => void;
    activeExtraMode: ExtraGenerationMode;
    setExtraMode?: (mode: ExtraGenerationMode) => void;
    prioritizeUnplayed: boolean;
    setPrioritizeUnplayed?: (val: boolean) => void;
    isModeSelectorOpen: boolean;
    setIsModeSelectorOpen: (open: boolean) => void;
    isExtraModeSelectorOpen: boolean;
    setIsExtraModeSelectorOpen: (open: boolean) => void;
    isDebugMode: boolean;
    onOpenWeightsModal: () => void;
    showInfo: boolean;
    setShowInfo: (show: boolean) => void;
    onClose: () => void;
    heroesRevealed: boolean;
    isDragMode: boolean;
    oddPower: number;
    evenPower: number;
}

/**
 * Top bar of ResultOverlay with mode selector popover, close button, and team power badge.
 */
export const ResultTopBar: React.FC<ResultTopBarProps> = ({
    generationMode,
    setGenerationMode,
    balanceThreshold,
    setBalanceThreshold,
    activeExtraMode,
    setExtraMode,
    prioritizeUnplayed,
    setPrioritizeUnplayed,
    isModeSelectorOpen,
    setIsModeSelectorOpen,
    isExtraModeSelectorOpen,
    setIsExtraModeSelectorOpen,
    isDebugMode,
    onOpenWeightsModal,
    showInfo,
    setShowInfo,
    onClose,
    heroesRevealed,
    isDragMode,
    oddPower,
    evenPower
}) => {
    return (
        <>
            {/* Controls Bar */}
            <div
                className="absolute top-0 left-0 w-full px-6 pt-6 mt-2 flex justify-between items-center pointer-events-none"
                style={{ paddingTop: 'calc(1.5rem + env(safe-area-inset-top))' }}
            >
                {setGenerationMode && (
                    <GenerationModePopover
                        generationMode={generationMode}
                        setGenerationMode={setGenerationMode}
                        balanceThreshold={balanceThreshold}
                        setBalanceThreshold={setBalanceThreshold}
                        activeExtraMode={activeExtraMode}
                        setExtraMode={setExtraMode}
                        prioritizeUnplayed={prioritizeUnplayed}
                        setPrioritizeUnplayed={setPrioritizeUnplayed}
                        isModeSelectorOpen={isModeSelectorOpen}
                        setIsModeSelectorOpen={setIsModeSelectorOpen}
                        isExtraModeSelectorOpen={isExtraModeSelectorOpen}
                        setIsExtraModeSelectorOpen={setIsExtraModeSelectorOpen}
                        isDebugMode={isDebugMode}
                        onOpenWeightsModal={onOpenWeightsModal}
                        showInfo={showInfo}
                        setShowInfo={setShowInfo}
                    />
                )}
                <button
                    type="button"
                    data-testid="close-result-overlay"
                    onClick={onClose}
                    aria-label="Закрыть"
                    className="pointer-events-auto p-3 rounded-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-lg active:scale-95 transition-transform border border-slate-200 dark:border-slate-700 relative"
                    style={{ zIndex: Z_INDEX_BASE.OVERLAY }}
                >
                    <X size={24} />
                </button>
            </div>

            {/* Standalone Team Power Badge (Visible in both Facing & Cross modes) */}
            {heroesRevealed && !isDragMode && (
                <div
                    className="absolute left-1/2 -translate-x-1/2 pointer-events-auto"
                    style={{ zIndex: Z_INDEX_BASE.NAVBAR, top: 'calc(6.2rem + env(safe-area-inset-top))' }}
                >
                    <div
                        data-testid="team-power-badge"
                        className="px-3.5 py-1.5 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/60 dark:border-slate-800 shadow-lg flex items-center gap-3 text-xs font-bold whitespace-nowrap animate-menu-in"
                    >
                        <div className="flex items-center gap-1.5 whitespace-nowrap shrink-0">
                            <span className="w-2 h-2 rounded-full bg-primary-500 shadow-[0_0_6px_rgb(var(--primary-500)/0.8)] shrink-0" />
                            <span className="text-[10px] sm:text-xs font-bold text-slate-600 dark:text-slate-300 tracking-tight whitespace-nowrap">Команда 1:</span>
                            <span className="font-mono font-black text-xs sm:text-sm text-primary-600 dark:text-primary-400">{oddPower}</span>
                        </div>

                        <div className="w-px h-3.5 bg-slate-200 dark:bg-slate-700/80 shrink-0" />

                        <div className="flex items-center gap-1.5 whitespace-nowrap shrink-0">
                            <span className="w-2 h-2 rounded-full bg-secondary-500 shadow-[0_0_6px_rgb(var(--secondary-500)/0.8)] shrink-0" />
                            <span className="text-[10px] sm:text-xs font-bold text-slate-600 dark:text-slate-300 tracking-tight whitespace-nowrap">Команда 2:</span>
                            <span className="font-mono font-black text-xs sm:text-sm text-secondary-600 dark:text-secondary-400">{evenPower}</span>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
