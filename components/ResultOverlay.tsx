import React, { useState, useEffect, useRef, useMemo } from 'react';
import { RefreshCw, Dice5, Check } from 'lucide-react';
import { AssignedPlayer, GenerationMode, ExtraGenerationMode, Hero, MatchRecord } from '../types';
import { HeroSelectionModal } from './HeroSelectionModal';
import { useBackHandler } from '../hooks/useBackHandler';
import { useCardSwapDrag, CardPosition } from '../hooks/useCardSwapDrag';
import { getHeroHistoryWeights, getPlayerHeroHistoryWeights, getHeroWeight } from '../utils/generator';
import { ConfirmModal } from './common/ConfirmModal';
import { useHaptics } from '../hooks/useHaptics';
import { MatchWinnerModal } from './MatchWinnerModal';
import { Z_INDEX_BASE } from '../constants/zIndex';
import { PlayerResultCard, FloatingResultCard } from './result/PlayerResultCard';
import { ResultTopBar } from './result/ResultTopBar';
import { ResultControlsBar } from './result/ResultControlsBar';
import { WeightsDebugModal } from './result/WeightsDebugModal';

interface ResultOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    assignments: AssignedPlayer[];
    onRerollSpecific: (playerNumber: number) => void;
    onRerollAllHeroes: () => void;
    onShuffleTeams: () => void;
    onBanSpecific: (playerNumber: number) => void;
    onBanAll: () => void;
    onRevealHeroes: () => void;
    generationMode?: GenerationMode;
    setGenerationMode?: (mode: GenerationMode) => void;
    balanceThreshold?: number;
    setBalanceThreshold?: (val: number) => void;
    playerNames?: string[];
    onSwapPositions?: (pos1: 'top' | 'bottom' | 'left' | 'right', pos2: 'top' | 'bottom' | 'left' | 'right') => void;
    onRecordResult?: (winner: 'team1' | 'team2', playerKills?: Record<string, number>) => void;
    onManualSelect?: (playerNumber: number, hero: Hero) => void;
    availableHeroes?: Hero[];
    extraMode?: ExtraGenerationMode;
    setExtraMode?: (mode: ExtraGenerationMode) => void;
    prioritizeUnplayed?: boolean;
    setPrioritizeUnplayed?: (val: boolean) => void;
    isDebugMode?: boolean;
    history?: MatchRecord[];
    bgGradient?: boolean;
}

export const ResultOverlay: React.FC<ResultOverlayProps> = ({
    isOpen,
    onClose,
    assignments,
    onRerollSpecific,
    onRerollAllHeroes,
    onShuffleTeams,
    onBanSpecific,
    onBanAll,
    onRevealHeroes,
    generationMode = 'random',
    setGenerationMode,
    balanceThreshold = 1,
    setBalanceThreshold,
    playerNames = [],
    onSwapPositions,
    onRecordResult,
    onManualSelect,
    availableHeroes = [],
    extraMode,
    setExtraMode,
    prioritizeUnplayed = false,
    setPrioritizeUnplayed,
    isDebugMode = false,
    history = [],
    bgGradient
}) => {
    const { trigger } = useHaptics();
    const [confirmModal, setConfirmModal] = useState<{ type: 'single' | 'ban_all' | 'winner'; playerNumber?: number; playerName?: string } | null>(null);

    useEffect(() => {
        if (isOpen) {
            trigger('heavy');
        }
    }, [isOpen, trigger]);

    const [displayModal, setDisplayModal] = useState<{ type: 'single' | 'ban_all' | 'winner'; playerNumber?: number; playerName?: string } | null>(null);
    const activeModal = confirmModal || displayModal;
    const [showInfo, setShowInfo] = useState(false);
    const [isRerollConfirm, setIsRerollConfirm] = useState(false);

    const [isHeroSelectionOpen, setIsHeroSelectionOpen] = useState(false);
    const [selectedPlayerForEdit, setSelectedPlayerForEdit] = useState<number | null>(null);
    const [isModeSelectorOpen, setIsModeSelectorOpen] = useState(false);
    const [isExtraModeSelectorOpen, setIsExtraModeSelectorOpen] = useState(false);
    const [isWeightsModalOpen, setIsWeightsModalOpen] = useState(false);
    const [selectedDebugPlayerTab, setSelectedDebugPlayerTab] = useState<'global' | number>('global');

    // Pause ambient card glow animations when any modal/sheet is open over the board
    const isAnyModalOpen = Boolean(activeModal || showInfo || isWeightsModalOpen || isHeroSelectionOpen || isRerollConfirm);

    // Режим отображения оверлея: facing (лицом к пользователю) или cross (по кругу / крест)
    const [viewMode, setViewMode] = useState<'facing' | 'cross'>(() => {
        try {
            const saved = localStorage.getItem('randomatched_result_view_mode');
            if (saved === 'facing' || saved === 'cross') return saved;
            return 'facing';
        } catch {
            return 'facing';
        }
    });

    const [isViewModeAnimating, setIsViewModeAnimating] = useState(false);
    const viewModeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        try {
            localStorage.setItem('randomatched_result_view_mode', viewMode);
        } catch (e) {
            console.error('Failed to save result view mode:', e);
        }
    }, [viewMode]);

    useEffect(() => {
        return () => {
            if (viewModeTimerRef.current) clearTimeout(viewModeTimerRef.current);
        };
    }, []);

    const {
        isDragMode,
        setIsDragMode,
        activeDrag,
        hoveredTarget,
        cardRefs,
        handlePointerDown
    } = useCardSwapDrag({ isOpen, onSwapPositions });

    const toggleViewMode = () => {
        setIsViewModeAnimating(true);
        if (viewModeTimerRef.current) clearTimeout(viewModeTimerRef.current);
        viewModeTimerRef.current = setTimeout(() => {
            setIsViewModeAnimating(false);
        }, 550);

        setViewMode(prev => {
            const next = prev === 'facing' ? 'cross' : 'facing';
            if (next === 'facing') {
                setIsDragMode(false);
            }
            return next;
        });
    };

    const activeExtraMode = extraMode || (prioritizeUnplayed ? 'global_freshness' : 'none');

    const weightsMap = useMemo(() => {
        if (activeExtraMode === 'player_freshness' && selectedDebugPlayerTab !== 'global') {
            const playerAss = assignments.find(a => a.playerNumber === selectedDebugPlayerTab);
            if (playerAss) {
                const positionToIndex: Record<string, number> = { bottom: 0, top: 1, left: 2, right: 3 };
                const idx = positionToIndex[playerAss.position] ?? 0;
                const name = playerNames[idx]?.trim() || `Игрок ${playerAss.playerNumber}`;
                return getPlayerHeroHistoryWeights(history, availableHeroes, name, true);
            }
        }
        return getHeroHistoryWeights(history, availableHeroes, activeExtraMode !== 'none');
    }, [history, availableHeroes, activeExtraMode, selectedDebugPlayerTab, assignments, playerNames]);

    // Вычисление силы команд для отладки баланса
    const oddPower = useMemo(() => {
        return assignments
            .filter(a => a.team === 'Odd' && a.hero)
            .reduce((sum, a) => sum + getHeroWeight(a.hero), 0);
    }, [assignments]);

    const evenPower = useMemo(() => {
        return assignments
            .filter(a => a.team === 'Even' && a.hero)
            .reduce((sum, a) => sum + getHeroWeight(a.hero), 0);
    }, [assignments]);

    useBackHandler(isOpen, () => {
        if (isRerollConfirm) { setIsRerollConfirm(false); return; }
        if (isModeSelectorOpen) { setIsModeSelectorOpen(false); return; }
        if (isExtraModeSelectorOpen) { setIsExtraModeSelectorOpen(false); return; }

        onClose();
    }, { id: 'result-overlay', priority: 20 });

    useEffect(() => {
        if (!isOpen) {
            setIsRerollConfirm(false);
            setIsModeSelectorOpen(false);
            setIsExtraModeSelectorOpen(false);
        }
    }, [isOpen]);

    useEffect(() => {
        if (confirmModal) {
            setDisplayModal(confirmModal);
        }
    }, [confirmModal]);

    const getPlayer = (pos: CardPosition) => assignments.find(p => p.position === pos);

    const heroesRevealed = assignments.every(a => a.hero !== null);
    const filledNamesCount = playerNames.filter(n => n.trim() !== '').length;
    const canRecordStats = assignments.length >= 2;
    const hasCustomNames = filledNamesCount > 0;

    const handleBanClick = (e: React.MouseEvent, player: AssignedPlayer) => {
        e.stopPropagation();
        if (player.hero) {
            setConfirmModal({ type: 'single', playerNumber: player.playerNumber, playerName: player.hero.name });
        }
    };

    const handleConfirmAction = () => {
        if (confirmModal?.type === 'single' && confirmModal.playerNumber !== undefined) {
            onBanSpecific(confirmModal.playerNumber);
        } else if (confirmModal?.type === 'ban_all') {
            onBanAll();
        }
        setConfirmModal(null);
    };

    const handleOpenManualSelect = (e: React.MouseEvent, playerNumber: number) => {
        e.stopPropagation();
        setSelectedPlayerForEdit(playerNumber);
        setIsHeroSelectionOpen(true);
    };

    const handleManualHeroSelect = (hero: Hero) => {
        if (selectedPlayerForEdit !== null && onManualSelect) {
            onManualSelect(selectedPlayerForEdit, hero);
        }
        setIsHeroSelectionOpen(false);
        setSelectedPlayerForEdit(null);
    };

    const handleRecordWin = (winner: 'team1' | 'team2', killsByPlayerName?: Record<string, number>) => {
        if (onRecordResult) {
            onRecordResult(winner, killsByPlayerName);
        }
        setConfirmModal(null);
        setTimeout(() => onBanAll(), 100);
    };

    const handleSkipRecord = () => {
        onBanAll();
        setConfirmModal(null);
    };

    const getModalTitle = () => {
        if (activeModal?.type === 'single') return 'Забанить героя?';
        if (activeModal?.type === 'winner') return 'Кто победил?';
        return 'Сбросить текущий расклад?';
    };

    const getModalDescription = () => {
        if (activeModal?.type === 'single') return `"${activeModal.playerName}" будет убран из списка.`;
        if (activeModal?.type === 'winner') return !canRecordStats
            ? 'Для записи статистики нужно заполнить имена минимум 2 игроков.'
            : 'Запишите результат матча в историю перед сбросом.';
        return 'Все текущие герои будут убраны из списка.';
    };

    const showModal = !!confirmModal;
    const isGradientActive = bgGradient ?? (typeof document !== 'undefined' && document.documentElement.getAttribute('data-bg-gradient') === 'true');

    const handleResetClick = () => {
        if (filledNamesCount === 0) {
            setConfirmModal({ type: 'ban_all' });
        } else {
            setConfirmModal({ type: 'winner' });
        }
    };

    const draggedPlayer = activeDrag ? getPlayer(activeDrag.id) : undefined;
    const positions: CardPosition[] = ['top', 'bottom', 'left', 'right'];

    return (
        <>
            <div
                data-testid="result-overlay"
                className={`fixed inset-0 bg-slate-100 dark:bg-slate-950 transition-all duration-500 ${isOpen ? 'opacity-100 pointer-events-auto visible' : 'opacity-0 pointer-events-none invisible'}`}
                style={{
                    zIndex: Z_INDEX_BASE.OVERLAY,
                    backgroundImage: `
                        radial-gradient(circle at 10% 10%, rgb(var(--primary-500) / 0.18), transparent 55%),
                        radial-gradient(circle at 90% 90%, rgb(var(--secondary-500) / 0.18), transparent 55%)
                    `
                }}
            >
                {/* Мягкая фоновая сетка */}
                <div className="absolute inset-0 bg-grid-pattern opacity-30 dark:opacity-20 pointer-events-none z-0" />

                {/* Backdrop for Mode Selector */}
                <div
                    className={`fixed inset-0 bg-slate-900/20 backdrop-blur-[2px] transition-all duration-300 ${isModeSelectorOpen || isExtraModeSelectorOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}
                    style={{ zIndex: Z_INDEX_BASE.OVERLAY_BACKDROP }}
                    onClick={() => { setIsModeSelectorOpen(false); setIsExtraModeSelectorOpen(false); }}
                />

                <ResultTopBar
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
                    onOpenWeightsModal={() => setIsWeightsModalOpen(true)}
                    showInfo={showInfo}
                    setShowInfo={setShowInfo}
                    onClose={onClose}
                    heroesRevealed={heroesRevealed}
                    isDragMode={isDragMode}
                    oddPower={oddPower}
                    evenPower={evenPower}
                />

                {/* Board Container */}
                <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden touch-none flex items-center justify-center [transform:translateZ(0)]">
                    {/* Horizontal Divider Line between teams in facing mode */}
                    <div
                        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[540px] px-6 z-20 pointer-events-none flex items-center justify-center transition-all duration-500 ease-in-out ${
                            viewMode === 'facing' ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                        }`}
                    >
                        <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-400/40 dark:via-slate-500/40 to-transparent shadow-sm" />
                    </div>

                    {/* Team Badges in facing mode */}
                    <div
                        className={`absolute left-1/2 -translate-x-1/2 -translate-y-full z-20 pointer-events-none flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-500/20 dark:bg-primary-500/30 border border-primary-400/30 text-primary-700 dark:text-primary-300 text-[10px] sm:text-xs font-black uppercase tracking-wider shadow-sm transition-all duration-500 ease-in-out ${
                            viewMode === 'facing' && !isDragMode ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                        }`}
                        style={{ top: 'calc(50% - min(43vmin, 265px))' }}
                    >
                        <span className="w-2 h-2 rounded-full bg-primary-500 shadow-[0_0_8px_rgb(var(--primary-500)/0.8)]" />
                        <span>Команда 1</span>
                    </div>

                    <div
                        className={`absolute left-1/2 -translate-x-1/2 z-20 pointer-events-none flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-500/20 dark:bg-secondary-500/30 border border-secondary-400/30 text-secondary-700 dark:text-secondary-300 text-[10px] sm:text-xs font-black uppercase tracking-wider shadow-sm transition-all duration-500 ease-in-out ${
                            viewMode === 'facing' && !isDragMode ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                        }`}
                        style={{ top: 'calc(50% + min(43vmin, 265px))' }}
                    >
                        <span className="w-2 h-2 rounded-full bg-secondary-500 shadow-[0_0_8px_rgb(var(--secondary-500)/0.8)]" />
                        <span>Команда 2</span>
                    </div>

                    {positions.map(pos => {
                        const player = getPlayer(pos);
                        if (!player) return null;
                        return (
                            <PlayerResultCard
                                key={player.position}
                                player={player}
                                assignments={assignments}
                                playerNames={playerNames}
                                viewMode={viewMode}
                                isDragMode={isDragMode}
                                isDraggingThis={activeDrag?.id === pos}
                                isHoveredTarget={hoveredTarget === pos}
                                isGradientActive={isGradientActive}
                                isViewModeAnimating={isViewModeAnimating}
                                isAnyModalOpen={isAnyModalOpen}
                                isDebugMode={isDebugMode}
                                weightsMap={weightsMap}
                                canManualSelect={!!onManualSelect}
                                cardRef={(el) => { cardRefs.current[pos] = el; }}
                                onPointerDown={handlePointerDown}
                                onBanClick={handleBanClick}
                                onOpenManualSelect={handleOpenManualSelect}
                                onRerollSpecific={onRerollSpecific}
                            />
                        );
                    })}

                    {/* Invisible Backdrop for Reroll Confirm */}
                    {isRerollConfirm && (
                        <div
                            className="fixed inset-0 bg-transparent cursor-default pointer-events-auto"
                            style={{ zIndex: Z_INDEX_BASE.BACKDROP }}
                            onClick={() => setIsRerollConfirm(false)}
                        />
                    )}

                    {/* CENTER ACTION BUTTON */}
                    <div
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto animate-fade-in"
                        style={{ zIndex: isRerollConfirm ? Z_INDEX_BASE.DROPDOWN : Z_INDEX_BASE.NAVBAR }}
                    >
                        <button
                            type="button"
                            data-testid="center-action-button"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (!heroesRevealed) onRevealHeroes();
                                else if (isRerollConfirm) { onRerollAllHeroes(); setIsRerollConfirm(false); }
                                else setIsRerollConfirm(true);
                            }}
                            disabled={isDragMode}
                            className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center text-white active:scale-95 transition-all border-4 shadow-[0_0_40px_rgba(0,0,0,0.3)]
                                ${isDragMode ? 'opacity-20 grayscale cursor-not-allowed bg-slate-500 border-slate-400' :
                                    isRerollConfirm ? 'bg-red-500 border-red-300 active:bg-red-600 shadow-[0_0_50px_rgba(239,68,68,0.8)]'
                                        : 'bg-primary-600 border-primary-400/50 active:bg-primary-500 shadow-[0_0_40px_rgb(var(--primary-500)/0.6)]'}`}
                        >
                            <div className="flex flex-col items-center">
                                {heroesRevealed ? (isRerollConfirm ? <Check size={28} className="mb-1 animate-pulse" /> : <RefreshCw size={28} className="mb-1" />) : <Dice5 size={28} className="mb-1" />}
                                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest">{!heroesRevealed ? 'Герои' : isRerollConfirm ? 'Точно?' : 'Реролл'}</span>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Floating Clone */}
                {activeDrag && draggedPlayer && (
                    <FloatingResultCard
                        player={draggedPlayer}
                        playerNames={playerNames}
                        activeDrag={activeDrag}
                        isGradientActive={isGradientActive}
                    />
                )}

                <ResultControlsBar
                    hasCustomNames={hasCustomNames}
                    viewMode={viewMode}
                    isDragMode={isDragMode}
                    heroesRevealed={heroesRevealed}
                    onToggleDragMode={() => setIsDragMode(!isDragMode)}
                    onToggleViewMode={toggleViewMode}
                    onShuffleTeams={onShuffleTeams}
                    onFinishMatch={handleResetClick}
                />
            </div>

            {/* Confirmation / Winner Record Modal */}
            {activeModal?.type === 'winner' ? (
                <MatchWinnerModal
                    isOpen={showModal}
                    onClose={() => setConfirmModal(null)}
                    assignments={assignments}
                    playerNames={playerNames}
                    canRecordStats={canRecordStats}
                    onRecordWin={handleRecordWin}
                    onSkipRecord={handleSkipRecord}
                />
            ) : (
                <ConfirmModal
                    isOpen={showModal}
                    onCancel={() => setConfirmModal(null)}
                    onConfirm={handleConfirmAction}
                    title={getModalTitle()}
                    description={getModalDescription()}
                    confirmText="Да"
                    cancelText="Нет"
                    confirmVariant="danger"
                    modalId="result-confirm-modal"
                    priority={40}
                />
            )}

            <WeightsDebugModal
                isOpen={isWeightsModalOpen}
                onClose={() => setIsWeightsModalOpen(false)}
                availableHeroes={availableHeroes}
                assignments={assignments}
                playerNames={playerNames}
                activeExtraMode={activeExtraMode}
                weightsMap={weightsMap}
                selectedDebugPlayerTab={selectedDebugPlayerTab}
                setSelectedDebugPlayerTab={setSelectedDebugPlayerTab}
            />

            <HeroSelectionModal
                isOpen={isHeroSelectionOpen}
                onClose={() => setIsHeroSelectionOpen(false)}
                availableHeroes={availableHeroes}
                unavailableHeroIds={new Set(assignments.map(a => a.hero?.id).filter(Boolean) as string[])}
                onSelect={handleManualHeroSelect}
                currentHeroId={assignments.find(a => a.playerNumber === selectedPlayerForEdit)?.hero?.id}
            />
        </>
    );
};
