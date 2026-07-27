import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { X, Users, RefreshCw, Ban, Shuffle, Trash2, Dice5, HelpCircle, Info, Check, Move, Sparkles, SlidersHorizontal, ChevronDown, Trophy, AlertTriangle, CheckCircle2, UserCog, History, Terminal, Search, UserCheck, Minus } from 'lucide-react';
import { AssignedPlayer, GenerationMode, ExtraGenerationMode, Hero, MatchRecord } from '../types';
import { HeroSelectionModal } from './HeroSelectionModal';
import { useBackHandler } from '../hooks/useBackHandler';
import { getHeroHistoryWeights, getPlayerHeroHistoryWeights, getHeroWeight } from '../utils/generator';
import { BaseModal } from './common/BaseModal';
import { ConfirmModal } from './common/ConfirmModal';

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

type Position = 'top' | 'bottom' | 'left' | 'right';

const GENERATION_MODES = [
    { id: 'random', label: 'Рандом', desc: 'Чистая случайность', icon: Dice5, color: 'text-slate-500 dark:text-slate-400', bg: 'bg-slate-100 dark:bg-slate-800' },
    { id: 'balanced', label: 'Баланс', desc: 'Умный баланс сил', icon: Sparkles, color: 'text-primary-600 dark:text-primary-400', bg: 'bg-primary-50 dark:bg-primary-900/20' },
    { id: 'strict', label: 'Лимит', desc: 'Точный контроль (±)', icon: SlidersHorizontal, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20' }
] as const;

const EXTRA_MODES = [
    { id: 'none', label: 'Без истории', desc: 'Все герои равны', icon: Minus, color: 'text-slate-400', bg: 'bg-slate-100 dark:bg-slate-800' },
    { id: 'global_freshness', label: 'История матчей', desc: 'Общая свежесть героев', icon: History, color: 'text-primary-600 dark:text-primary-400', bg: 'bg-primary-50 dark:bg-primary-900/20' },
    { id: 'player_freshness', label: 'Свежесть игрока', desc: 'Индивидуально для игрока', icon: UserCheck, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' }
] as const;

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
    const [confirmModal, setConfirmModal] = useState<{ type: 'single' | 'ban_all' | 'winner'; playerNumber?: number; playerName?: string; } | null>(null);
    const [displayModal, setDisplayModal] = useState<{ type: 'single' | 'ban_all' | 'winner'; playerNumber?: number; playerName?: string; } | null>(null);
    const activeModal = confirmModal || displayModal;
    const [showInfo, setShowInfo] = useState(false);
    const [isRerollConfirm, setIsRerollConfirm] = useState(false);

    const [isHeroSelectionOpen, setIsHeroSelectionOpen] = useState(false);
    const [selectedPlayerForEdit, setSelectedPlayerForEdit] = useState<number | null>(null);
    const [isModeSelectorOpen, setIsModeSelectorOpen] = useState(false);
    const [isExtraModeSelectorOpen, setIsExtraModeSelectorOpen] = useState(false);
    const [isWeightsModalOpen, setIsWeightsModalOpen] = useState(false);
    const [weightsSearchTerm, setWeightsSearchTerm] = useState('');
    const [playerKills, setPlayerKills] = useState<Record<number, number>>({});
    const [selectedDebugPlayerTab, setSelectedDebugPlayerTab] = useState<'global' | number>('global');

    const activeExtraMode = extraMode || (prioritizeUnplayed ? 'global_freshness' : 'none');

    useEffect(() => {
        if (isOpen) {
            const initialKills: Record<number, number> = {};
            assignments.forEach(a => {
                initialKills[a.playerNumber] = 0;
            });
            setPlayerKills(initialKills);
        }
    }, [isOpen, assignments]);

    // Вычисление весов для отладки
    const weightsMap = useMemo(() => {
        if (activeExtraMode === 'player_freshness' && selectedDebugPlayerTab !== 'global') {
            const playerAss = assignments.find(a => a.playerNumber === selectedDebugPlayerTab);
            if (playerAss) {
                const positionToIndex: Record<string, number> = { 'bottom': 0, 'top': 1, 'left': 2, 'right': 3 };
                const idx = positionToIndex[playerAss.position] ?? 0;
                const name = playerNames[idx]?.trim() || `Игрок ${playerAss.playerNumber}`;
                return getPlayerHeroHistoryWeights(history, availableHeroes, name, true);
            }
        }
        return getHeroHistoryWeights(history, availableHeroes, activeExtraMode !== 'none');
    }, [history, availableHeroes, activeExtraMode, selectedDebugPlayerTab, assignments, playerNames]);

    // Список героев, отсортированных по весу для модального окна
    const sortedHeroesWithWeights = useMemo(() => {
        return availableHeroes
            .map(hero => {
                const weight = weightsMap.get(hero.id) || 1;
                const power = getHeroWeight(hero);
                return { hero, weight, power };
            })
            .sort((a, b) => b.weight - a.weight);
    }, [availableHeroes, weightsMap]);

    const filteredHeroes = useMemo(() => {
        return sortedHeroesWithWeights.filter(item =>
            item.hero.name.toLowerCase().includes(weightsSearchTerm.toLowerCase())
        );
    }, [sortedHeroesWithWeights, weightsSearchTerm]);

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

    const powerDiff = useMemo(() => {
        return Math.abs(oddPower - evenPower);
    }, [oddPower, evenPower]);

    // Custom DND State
    const [isDragMode, setIsDragMode] = useState(false);
    const [activeDrag, setActiveDrag] = useState<{
        id: string; // position as ID
        offsetX: number;
        offsetY: number;
        currX: number;
        currY: number;
    } | null>(null);
    const [hoveredTarget, setHoveredTarget] = useState<Position | null>(null);

    // Refs for tracking elements positions
    const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

    useBackHandler(isOpen, () => {
        if (isRerollConfirm) { setIsRerollConfirm(false); return; }
        if (isModeSelectorOpen) { setIsModeSelectorOpen(false); return; }
        if (isExtraModeSelectorOpen) { setIsExtraModeSelectorOpen(false); return; }

        onClose();
    }, { id: 'result-overlay', priority: 20 });

    useEffect(() => {
        if (!isOpen) {
            setIsRerollConfirm(false);
            setIsDragMode(false);
            setActiveDrag(null);
            setHoveredTarget(null);
            setIsModeSelectorOpen(false);
            setIsExtraModeSelectorOpen(false);
        }
    }, [isOpen]);

    // Обработка закрытия по Escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                // Let back handler handle logic if complex, or just close
                // For consistecy, maybe call the same logic?
                // But Escape is usually "Close All" or "Step Back".
                // Simple onClose is fine for Desktop fallback.
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    useEffect(() => {
        if (confirmModal) {
            setDisplayModal(confirmModal);
        }
    }, [confirmModal]);

    const getPlayer = (pos: Position) => assignments.find(p => p.position === pos);

    const heroesRevealed = assignments.every(a => a.hero !== null);
    const filledNamesCount = playerNames.filter(n => n.trim() !== '').length;
    const canRecordStats = filledNamesCount >= 2;
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

    const handleRecordWin = (winner: 'team1' | 'team2') => {
        if (onRecordResult) {
            const killsByPlayerName: Record<string, number> = {};
            assignments.forEach(a => {
                const positionToIndex = { 'bottom': 0, 'top': 1, 'left': 2, 'right': 3 };
                const idx = positionToIndex[a.position];
                const name = playerNames[idx]?.trim();
                if (name) {
                    killsByPlayerName[name] = playerKills[a.playerNumber] || 0;
                }
            });
            onRecordResult(winner, killsByPlayerName);
        }
        setConfirmModal(null);
        // Wait slightly then trigger ban all
        setTimeout(() => onBanAll(), 100);
    };

    const handleSkipRecord = () => {
        onBanAll();
        setConfirmModal(null);
    }

    // --- CUSTOM DND HANDLERS ---
    const handlePointerDown = (e: React.PointerEvent, position: Position) => {
        if (!isDragMode) return;
        e.preventDefault();

        const FLOATING_HALF_HEIGHT = 48;

        setActiveDrag({
            id: position,
            offsetX: 0,
            offsetY: FLOATING_HALF_HEIGHT,
            currX: e.clientX,
            currY: e.clientY - FLOATING_HALF_HEIGHT
        });
    };

    // Global listeners attached to window to prevent sticking
    useEffect(() => {
        if (!activeDrag) return;

        const handlePointerMove = (e: PointerEvent) => {
            e.preventDefault();

            setActiveDrag(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    currX: e.clientX - prev.offsetX,
                    currY: e.clientY - prev.offsetY
                };
            });

            // Hit Test logic
            const targets: Position[] = ['top', 'bottom', 'left', 'right'];
            let found: Position | null = null;

            for (const pos of targets) {
                if (pos === activeDrag.id) continue;
                const el = cardRefs.current[pos];
                if (el) {
                    const rect = el.getBoundingClientRect();
                    if (
                        e.clientX >= rect.left &&
                        e.clientX <= rect.right &&
                        e.clientY >= rect.top &&
                        e.clientY <= rect.bottom
                    ) {
                        found = pos;
                        break;
                    }
                }
            }
            setHoveredTarget(found);
        };

        const handlePointerUp = (e: PointerEvent) => {
            e.preventDefault();

            const targets: Position[] = ['top', 'bottom', 'left', 'right'];
            let finalTarget: Position | null = null;

            for (const pos of targets) {
                if (pos === activeDrag.id) continue;
                const el = cardRefs.current[pos];
                if (el) {
                    const rect = el.getBoundingClientRect();
                    if (
                        e.clientX >= rect.left &&
                        e.clientX <= rect.right &&
                        e.clientY >= rect.top &&
                        e.clientY <= rect.bottom
                    ) {
                        finalTarget = pos;
                        break;
                    }
                }
            }

            if (finalTarget && onSwapPositions) {
                onSwapPositions(activeDrag.id as Position, finalTarget);
            }

            setActiveDrag(null);
            setHoveredTarget(null);
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        window.addEventListener('pointercancel', handlePointerUp);

        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
            window.removeEventListener('pointercancel', handlePointerUp);
        };
    }, [activeDrag, onSwapPositions]);


    // Helper to render card CONTENT only
    const renderCardContent = (player: AssignedPlayer, isFloating: boolean, isDraggingThis: boolean, isHoveredTarget: boolean) => {
        const position = player.position;
        const hasHero = player.hero !== null;
        const heroName = player.hero?.name || "";
        const heroRank = player.hero?.rank || "";

        const weight = player.hero ? (weightsMap.get(player.hero.id) || 1) : 1;
        const power = player.hero ? getHeroWeight(player.hero) : 6;

        let displayName = "";
        let showNumberBadge = false;

        const positionToIndex = { 'bottom': 0, 'top': 1, 'left': 2, 'right': 3 };
        const index = positionToIndex[position];
        const customName = playerNames[index]?.trim();

        if (customName) {
            displayName = customName;
            showNumberBadge = true;
        } else {
            displayName = `Игрок ${player.playerNumber}`;
            showNumberBadge = false;
        }

        const isTeamOdd = player.team === 'Odd';

        const shadowStyle = isGradientActive
            ? isTeamOdd
                ? "shadow-[0_0_50px_rgba(var(--secondary-500)/0.65)] ring-1 ring-secondary-300/40"
                : "shadow-[0_0_50px_rgba(var(--primary-500)/0.65)] ring-1 ring-primary-300/40"
            : isTeamOdd
                ? "shadow-[0_0_25px_rgba(var(--secondary-500)/0.4)]"
                : "shadow-[0_0_25px_rgba(var(--primary-500)/0.4)]";

        const gradient = isTeamOdd
            ? `bg-gradient-to-br from-secondary-500/90 to-secondary-700/90 text-white ${shadowStyle} border border-secondary-200/30`
            : `bg-gradient-to-br from-primary-500/90 to-primary-700/90 text-white ${shadowStyle} border border-primary-200/30`;

        const buttonStyle = "bg-gradient-to-b from-white/20 to-white/5 active:from-white/30 active:to-white/10 border-t border-white/40 border-b border-black/10 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.2)] active:shadow-none active:scale-95 active:border-white/10 text-white w-7 h-7 flex items-center justify-center rounded-lg backdrop-blur-sm transition-all duration-200";

        const transitionClass = isFloating ? 'transition-none' : 'transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]';

        const cardSizeClass = isFloating
            ? 'w-32 h-20'
            : 'w-[52vmin] h-[32vmin] max-w-[320px] max-h-[200px]';

        return (
            <div
                className={`
                relative flex flex-col items-center justify-center p-3 select-none ${transitionClass}
                ${gradient}
                ${isFloating
                        ? `${cardSizeClass} rounded-2xl shadow-2xl ring-4 ring-white/50 z-[100]`
                        : `${cardSizeClass} rounded-3xl`}
                ${isHoveredTarget ? 'scale-90 opacity-80 ring-4 ring-white/50' : ''}
                ${isDragMode && !isFloating ? 'cursor-grab active:cursor-grabbing animate-pulse-slow ring-2 ring-white ring-offset-2 ring-offset-slate-200 dark:ring-offset-slate-900' : ''}
            `}
                style={isFloating ? {
                    position: 'fixed',
                    left: activeDrag!.currX,
                    top: activeDrag!.currY,
                    transform: 'translate(-50%, -50%) rotate(0deg)',
                    pointerEvents: 'none',
                } : undefined}
            >
                {/* Динамическое широкое свечение карточки при включенной опции "Градиентный фон" */}
                {isGradientActive && (
                    <div
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none rounded-full transition-all duration-500 ease-out blur-[60px] sm:blur-[80px] opacity-90 dark:opacity-95 animate-pulse-soft -z-10"
                        style={{
                            width: isFloating ? 'min(70vw, 360px)' : 'min(75vmin, 480px)',
                            height: isFloating ? 'min(70vw, 360px)' : 'min(75vmin, 480px)',
                            background: isTeamOdd
                                ? 'radial-gradient(circle, rgba(var(--secondary-500)/0.7) 0%, rgba(var(--secondary-500)/0.25) 45%, transparent 75%)'
                                : 'radial-gradient(circle, rgba(var(--primary-500)/0.7) 0%, rgba(var(--primary-500)/0.25) 45%, transparent 75%)',
                        }}
                    />
                )}
                {!isFloating && hasHero && !isDragMode && (
                    <div className="absolute top-0 left-0 w-full flex justify-between p-2 animate-fade-in z-20">
                        <button onClick={(e) => handleBanClick(e, player)} className={buttonStyle}><Ban size={14} /></button>
                        <div className="flex gap-1">
                            {onManualSelect && (
                                <button data-testid="manual-select-btn" onClick={(e) => handleOpenManualSelect(e, player.playerNumber)} className={buttonStyle}><UserCog size={14} /></button>
                            )}
                            <button onClick={(e) => { e.stopPropagation(); onRerollSpecific(player.playerNumber); }} className={buttonStyle}><RefreshCw size={14} /></button>
                        </div>
                    </div>
                )}

                {/* Rank & Debug Info Badge */}
                {hasHero && !isDragMode && !isFloating && (
                    <div className="absolute top-2 right-1/2 translate-x-1/2 z-10 animate-fade-in flex flex-col items-center gap-1">
                        {heroRank && (
                            <div className="px-1.5 py-0.5 rounded bg-black/20 border border-white/10 text-[10px] sm:text-[11px] font-bold tracking-widest text-white/90">{heroRank}</div>
                        )}
                        {isDebugMode && (
                            <div className="px-1.5 py-0.5 rounded bg-black/40 border border-white/10 text-[9px] font-mono text-white/90 whitespace-nowrap">
                                W: {weight.toFixed(2)} | P: {power}
                            </div>
                        )}
                    </div>
                )}

                {/* Main Content */}
                <div className={`flex flex-col items-center justify-center w-full transition-all duration-300 ${isFloating ? 'scale-75' : ''}`}>
                    {!isFloating && (
                        <h2
                            key={player.hero?.id || 'unknown'}
                            style={hasHero ? { animationDelay: `${index * 150}ms` } : {}}
                            className={`font-black text-center leading-tight drop-shadow-md px-1 w-full line-clamp-2 mt-1 min-h-[1.5em] z-10 ${hasHero ? 'reveal-smooth' : ''} ${heroName.length > 50 ? 'text-sm sm:text-base' : heroName.length > 35 ? 'text-sm sm:text-lg' : 'text-lg sm:text-2xl'}`}
                        >
                            {hasHero ? heroName : <span className="opacity-50 text-2xl sm:text-3xl font-bold animate-pulse-soft">?</span>}
                        </h2>
                    )}

                    {isFloating && (
                        <div className="text-3xl font-bold opacity-90 drop-shadow-md">{displayName.charAt(0).toUpperCase() || <Users size={32} />}</div>
                    )}

                    <div className={`flex items-center gap-2 opacity-90 z-10 transition-all duration-300 ${isFloating ? 'mt-0' : 'absolute bottom-3'}`}>
                        {!isFloating && !showNumberBadge && <Users size={14} />}
                        {showNumberBadge && !isFloating && (
                            <div className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white/20 text-[10px] sm:text-xs font-black shadow-sm border border-white/10">{player.playerNumber}</div>
                        )}
                        <span className="font-bold text-[10px] sm:text-xs tracking-widest uppercase truncate max-w-[120px] drop-shadow-sm">{displayName}</span>
                    </div>
                </div>
            </div>
        );
    };

    const renderCardContainer = (player: AssignedPlayer) => {
        const position = player.position;
        const isDraggingThis = activeDrag?.id === position;
        const isHoveredTarget = hoveredTarget === position;

        let positionStyle: React.CSSProperties = {};

        // Layout Logic (same as before)
        const btnRadius = '45px';
        const gap = '8px';
        const halfH = 'min(16vmin, 100px)';
        const halfW = 'min(26vmin, 160px)';

        const sideOffsetFromCenter = `calc(${btnRadius} + ${gap} + ${halfH})`;
        const verticalOffsetFromCenter = `calc(${halfW} + ${gap} + ${halfH})`;

        switch (position) {
            case 'top':
                positionStyle = {
                    position: 'absolute',
                    top: `calc(50% - ${verticalOffsetFromCenter})`,
                    left: '50%',
                    transform: 'translate(-50%, -50%) rotate(180deg)',
                    transformOrigin: 'center'
                };
                break;
            case 'bottom':
                positionStyle = {
                    position: 'absolute',
                    top: `calc(50% + ${verticalOffsetFromCenter})`,
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    transformOrigin: 'center'
                };
                break;
            case 'left':
                positionStyle = {
                    position: 'absolute',
                    left: `calc(50% - ${sideOffsetFromCenter})`,
                    top: '50%',
                    transform: 'translate(-50%, -50%) rotate(90deg)',
                    transformOrigin: 'center'
                };
                break;
            case 'right':
                positionStyle = {
                    position: 'absolute',
                    left: `calc(50% + ${sideOffsetFromCenter})`,
                    top: '50%',
                    transform: 'translate(-50%, -50%) rotate(-90deg)',
                    transformOrigin: 'center'
                };
                break;
        }

        return (
            <div
                ref={(el) => { cardRefs.current[position] = el; }}
                className="z-10 pointer-events-auto"
                style={{ ...positionStyle, touchAction: 'none' }}
                onPointerDown={(e) => handlePointerDown(e, position)}
            >
                {isDraggingThis && (
                    <div className="absolute inset-0 w-[52vmin] h-[32vmin] max-w-[320px] max-h-[200px] rounded-3xl border-2 border-dashed border-white/30 bg-white/10 animate-pulse z-0" />
                )}
                <div className={isDraggingThis ? 'opacity-0 pointer-events-none' : ''}>
                    {renderCardContent(player, false, isDraggingThis, isHoveredTarget)}
                </div>
            </div>
        );
    };

    const renderFloatingClone = () => {
        if (!activeDrag) return null;
        const player = getPlayer(activeDrag.id as Position);
        if (!player) return null;
        return renderCardContent(player, true, true, false);
    };

    const getModalTitle = () => {
        if (activeModal?.type === 'single') return 'Забанить героя?';
        if (activeModal?.type === 'winner') return 'Кто победил?';
        return 'Сбросить текущий расклад?';
    }
    const getModalDescription = () => {
        if (activeModal?.type === 'single') return `"${activeModal.playerName}" будет убран из списка.`;
        if (activeModal?.type === 'winner') return !canRecordStats
            ? 'Для записи статистики нужно заполнить имена минимум 2 игроков.'
            : 'Запишите результат матча в историю перед сбросом.';
        return 'Все текущие герои будут убраны из списка.';
    }

    const getModeTitle = () => generationMode === 'random' ? 'Рандом (Чистый фан)' : generationMode === 'balanced' ? 'Умный баланс' : 'Настраиваемый лимит (±)';
    const getModeDescription = () => {
        if (generationMode === 'random') return 'Герои распределяются абсолютно случайно без учета их силы или винрейта. Этот режим обеспечивает максимальную непредсказуемость. Идеально подходит для веселых, неофициальных матчей, когда важен элемент неожиданности и фан.';
        if (generationMode === 'balanced') return 'Оптимальный режим для честной игры. Алгоритм моделирует множественные варианты составов и находит наиболее равную комбинацию героев с минимальной разницей в силе команд (не более 1 балла). Вы получаете равные шансы на победу, сохраняя дух случайностей.';
        return 'Режим точного контроля баланса. Вы сами задаете максимально допустимую разницу силы между командами (показатель «±»). Алгоритм выполняет серию симуляций и находит комбинацию героев, которая строго вписывается в указанный вами лимит.';
    };

    const getPrioritizeUnplayedDescription = () => {
        if (generationMode === 'random') {
            return prioritizeUnplayed
                ? "Герои выбираются случайно, но персонажи, давно не игравшие в предыдущих матчах, имеют повышенный шанс выпасть."
                : "Включите эту опцию, чтобы сделать случайный выбор более разнообразным и реже видеть недавно игравших героев.";
        }
        if (generationMode === 'balanced') {
            return prioritizeUnplayed
                ? "Алгоритм подбирает честные равные команды (разница ≤ 1 балла), выбирая из множества вариантов тот состав, который содержит наиболее свежих и давно неигравших персонажей."
                : "Включите эту опцию, чтобы при поиске равного состава алгоритм в первую очередь предлагал давно неигравших героев.";
        }
        // Strict mode (Лимит)
        return prioritizeUnplayed
            ? "При подборе комбинаций, соответствующих вашему лимиту разницы сил, система формирует варианты преимущественно из редко используемых героев."
            : "Включите эту опцию, чтобы сбалансированный по вашей настройке состав формировался из редко играющих персонажей.";
    };

    const showModal = !!confirmModal;
    const currentMode = GENERATION_MODES.find(m => m.id === generationMode) || GENERATION_MODES[0];

    const getTeamNames = (team: 'Even' | 'Odd') => {
        const teamPlayers = assignments.filter(a => a.team === team);
        const names = teamPlayers.map(p => {
            const positionToIndex = { 'bottom': 0, 'top': 1, 'left': 2, 'right': 3 };
            const idx = positionToIndex[p.position];
            return playerNames[idx]?.trim() || `Игрок ${p.playerNumber}`;
        });
        return names.join(' и ');
    };

    const isGradientActive = bgGradient ?? (typeof document !== 'undefined' && document.documentElement.getAttribute('data-bg-gradient') === 'true');

    const handleResetClick = () => {
        if (filledNamesCount === 0) {
            setConfirmModal({ type: 'ban_all' });
        } else {
            setConfirmModal({ type: 'winner' });
        }
    };

    return (
        <>
            <div data-testid="result-overlay" className={`fixed inset-0 z-50 bg-slate-200/95 dark:bg-slate-950/95 backdrop-blur-2xl transition-all duration-500 ${isOpen ? 'opacity-100 pointer-events-auto visible' : 'opacity-0 pointer-events-none invisible'}`}>
                {/* Мягкая фоновая сетка с размытием */}
                <div className="absolute inset-0 bg-grid-pattern opacity-40 dark:opacity-30 pointer-events-none blur-[1.5px] z-0" />

                {/* Backdrop for Mode Selector */}
                <div
                    className={`fixed inset-0 bg-slate-900/20 backdrop-blur-[2px] z-[60] transition-all duration-300 ${isModeSelectorOpen || isExtraModeSelectorOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}
                    onClick={() => { setIsModeSelectorOpen(false); setIsExtraModeSelectorOpen(false); }}
                />

                {/* Controls Bar */}
                <div 
                    className="absolute top-0 left-0 w-full px-6 pt-6 mt-2 flex justify-between items-center pointer-events-none"
                    style={{ paddingTop: 'calc(1.5rem + env(safe-area-inset-top))' }}
                >
                    {setGenerationMode && (
                        <div className={`pointer-events-auto relative flex items-center gap-0 bg-white dark:bg-slate-800 h-12 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 animate-in slide-in-from-top-4 duration-500 transition-shadow ${isModeSelectorOpen || isExtraModeSelectorOpen ? 'z-[61] ring-2 ring-primary-500/50' : 'z-50'}`}>

                            <button
                                onClick={() => { setIsModeSelectorOpen(!isModeSelectorOpen); setIsExtraModeSelectorOpen(false); }}
                                className="relative h-full flex items-center pl-2 pr-3 gap-2 outline-none cursor-pointer rounded-l-2xl active:bg-slate-50 dark:active:bg-slate-700/50 transition-colors"
                            >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${currentMode.bg} ${currentMode.color}`}>
                                    <currentMode.icon size={16} />
                                </div>
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200 min-w-[60px] text-left">
                                    {currentMode.label}
                                </span>
                                <ChevronDown size={16} className={`text-slate-400 transition-transform duration-300 ${isModeSelectorOpen ? 'rotate-180' : ''}`} />
                            </button>

                            <div className={`absolute top-[calc(100%+8px)] left-0 w-[240px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden transition-all duration-300 origin-top-left ${isModeSelectorOpen ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-95 invisible pointer-events-none'}`}>
                                <div className="p-1.5 flex flex-col gap-0.5">
                                    <div className="px-2.5 py-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                                        Основной режим генерации
                                    </div>
                                    {GENERATION_MODES.map(mode => (
                                        <button
                                            key={mode.id}
                                            onClick={() => { setGenerationMode(mode.id as GenerationMode); setIsModeSelectorOpen(false); }}
                                            className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors ${generationMode === mode.id ? 'bg-slate-100 dark:bg-slate-800' : 'active:bg-slate-50 dark:active:bg-slate-800'}`}
                                        >
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${generationMode === mode.id ? 'bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-900/5' : 'bg-slate-50 dark:bg-slate-800'} ${mode.color}`}>
                                                <mode.icon size={20} />
                                            </div>
                                            <div className="flex-1 text-left">
                                                <div className={`text-sm font-bold ${generationMode === mode.id ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>{mode.label}</div>
                                                <div className="text-[10px] text-slate-400">{mode.desc}</div>
                                            </div>
                                            {generationMode === mode.id && <Check size={16} className="text-primary-500" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="w-px h-6 bg-slate-100 dark:bg-slate-700" />

                            {generationMode === 'strict' && setBalanceThreshold ? (
                                <div className="flex items-center gap-1 pl-2 pr-2 animate-in fade-in slide-in-from-left-2">
                                    <span className="text-[10px] font-bold text-slate-400">±</span>
                                    <input
                                        type="number"
                                        min="0"
                                        max="10"
                                        step="1"
                                        inputMode="numeric"
                                        value={Number.isNaN(balanceThreshold) ? '' : balanceThreshold}
                                        onChange={(e) => setBalanceThreshold(e.target.value === '' ? NaN : parseInt(e.target.value))}
                                        onBlur={() => { if (Number.isNaN(balanceThreshold)) setBalanceThreshold(0); }}
                                        className="w-10 py-1 bg-slate-100 dark:bg-slate-700 rounded-md text-center text-sm font-bold outline-none focus:ring-1 focus:ring-primary-500 select-text"
                                    />
                                </div>
                            ) : (
                                <div className="w-1" />
                            )}
                            {(setExtraMode || setPrioritizeUnplayed) && (
                                <div className="flex items-center">
                                    <button
                                        onClick={() => { setIsExtraModeSelectorOpen(!isExtraModeSelectorOpen); setIsModeSelectorOpen(false); }}
                                        className={`p-2 rounded-full transition-all duration-200 ${
                                            activeExtraMode !== 'none'
                                                ? activeExtraMode === 'player_freshness'
                                                    ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 ring-1 ring-emerald-500/20'
                                                    : 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 ring-1 ring-primary-500/20'
                                                : 'text-slate-400 active:text-slate-600 dark:active:text-slate-200 active:bg-slate-100 dark:active:bg-slate-700'
                                        }`}
                                        aria-label="Дополнительный режим свежести"
                                        title="Дополнительный режим генерации"
                                    >
                                        {(() => {
                                            const currentExtra = EXTRA_MODES.find(m => m.id === activeExtraMode) || EXTRA_MODES[0];
                                            const Icon = currentExtra.icon;
                                            return <Icon size={20} />;
                                        })()}
                                    </button>

                                    {/* Dropdown Menu for Extra Mode */}
                                    <div className={`absolute top-[calc(100%+8px)] left-0 w-[240px] max-w-[calc(100vw-32px)] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden transition-all duration-300 origin-top-left z-[62] ${isExtraModeSelectorOpen ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-95 invisible pointer-events-none'}`}>
                                        <div className="p-1.5 flex flex-col gap-0.5">
                                            <div className="px-2.5 py-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                                                Доп. режим свежести
                                            </div>
                                            {EXTRA_MODES.map(m => {
                                                const isSelected = activeExtraMode === m.id;
                                                const Icon = m.icon;
                                                return (
                                                    <button
                                                        key={m.id}
                                                        onClick={() => {
                                                            if (setExtraMode) setExtraMode(m.id as ExtraGenerationMode);
                                                            else if (setPrioritizeUnplayed) setPrioritizeUnplayed(m.id !== 'none');
                                                            setIsExtraModeSelectorOpen(false);
                                                        }}
                                                        className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors ${isSelected ? 'bg-slate-100 dark:bg-slate-800' : 'active:bg-slate-50 dark:active:bg-slate-800'}`}
                                                    >
                                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isSelected ? 'bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-900/5' : 'bg-slate-50 dark:bg-slate-800'} ${m.color}`}>
                                                            <Icon size={18} />
                                                        </div>
                                                        <div className="flex-1 text-left">
                                                            <div className={`text-xs font-bold ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>{m.label}</div>
                                                            <div className="text-[10px] text-slate-400 leading-tight">{m.desc}</div>
                                                        </div>
                                                        {isSelected && <Check size={16} className="text-primary-500 shrink-0" />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {isDebugMode && (
                                <button
                                    onClick={() => setIsWeightsModalOpen(true)}
                                    className="p-2 rounded-full text-slate-400 active:text-primary-500 active:bg-slate-100 dark:active:bg-slate-700 transition-colors"
                                    aria-label="Таблица весов героев"
                                >
                                    <Terminal size={20} />
                                </button>
                            )}

                            <button onClick={() => setShowInfo(true)} className="mr-1 p-2 rounded-full text-slate-400 active:text-primary-500 active:bg-slate-100 dark:active:bg-slate-700 transition-colors"><HelpCircle size={20} /></button>
                        </div>
                    )}
                    <button data-testid="close-result-overlay" onClick={onClose} className="pointer-events-auto p-3 rounded-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-lg active:scale-95 transition-transform border border-slate-200 dark:border-slate-700 relative z-50"><X size={24} /></button>
                </div>

                {/* Debug Power Balance Panel */}
                {isDebugMode && heroesRevealed && (
                    <div className="absolute top-[80px] left-1/2 -translate-x-1/2 z-40 bg-slate-900/90 dark:bg-slate-900/95 border border-slate-700/50 text-white px-4 py-2 rounded-2xl flex items-center gap-3 text-xs font-bold shadow-lg animate-in slide-in-from-top-2 duration-300 pointer-events-auto">
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-secondary-500" />
                            <span>Сила Т1: {oddPower}</span>
                        </div>
                        <div className="w-px h-4 bg-slate-700" />
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-primary-500" />
                            <span>Сила Т2: {evenPower}</span>
                        </div>
                        <div className="w-px h-4 bg-slate-700" />
                        <div className="text-orange-400">
                            Diff: {powerDiff}
                        </div>
                    </div>
                )}

                {/* Board Container */}
                <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden touch-none flex items-center justify-center">

                    {getPlayer('top') && renderCardContainer(getPlayer('top')!)}
                    {getPlayer('bottom') && renderCardContainer(getPlayer('bottom')!)}
                    {getPlayer('left') && renderCardContainer(getPlayer('left')!)}
                    {getPlayer('right') && renderCardContainer(getPlayer('right')!)}

                    {/* Invisible Backdrop for Reroll Confirm */}
                    {isRerollConfirm && <div className="fixed inset-0 z-40 bg-transparent cursor-default pointer-events-auto" onClick={() => setIsRerollConfirm(false)} />}

                    {/* CENTER ACTION BUTTON */}
                    <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto animate-fade-in ${isRerollConfirm ? 'z-50' : 'z-30'}`}>
                        <button
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
                                        : 'bg-primary-600 border-primary-400/50 active:bg-primary-500 shadow-[0_0_40px_rgba(var(--primary-500)/0.6)]'}`}
                        >
                            <div className="flex flex-col items-center">
                                {heroesRevealed ? (isRerollConfirm ? <Check size={28} className="mb-1 animate-pulse" /> : <RefreshCw size={28} className="mb-1" />) : <Dice5 size={28} className="mb-1" />}
                                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest">{!heroesRevealed ? 'Герои' : isRerollConfirm ? 'Точно?' : 'Реролл'}</span>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Floating Clone */}
                {renderFloatingClone()}

                {/* Bottom Dock */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 p-1.5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 dark:border-slate-800 transition-all duration-500">

                    {hasCustomNames && (
                        <>
                            <button onClick={() => setIsDragMode(!isDragMode)} className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-all ${isDragMode ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-400 ring-2 ring-primary-500 dark:ring-primary-400 shadow-inner' : 'active:bg-white dark:active:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                                <Move size={20} className="mb-1" /> <span className="text-[10px] font-bold">Двигать</span>
                            </button>
                            <div className="w-px h-8 bg-slate-300 dark:bg-slate-700" />
                        </>
                    )}

                    <button data-testid="shuffle-teams-btn" onClick={onShuffleTeams} disabled={isDragMode} className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-colors ${isDragMode ? 'opacity-40 cursor-not-allowed text-slate-400' : 'active:bg-white dark:active:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                        <Shuffle size={20} className="mb-1" /> <span className="text-[10px] font-bold">Команды</span>
                    </button>
                    <div className="w-px h-8 bg-slate-300 dark:bg-slate-700" />
                    <button data-testid="finish-match-btn" onClick={handleResetClick} disabled={!heroesRevealed || isDragMode} className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-colors ${!heroesRevealed || isDragMode ? 'opacity-40 cursor-not-allowed text-slate-400' : 'active:bg-red-50 dark:active:bg-red-900/20 text-red-500'}`}>
                        <CheckCircle2 size={20} className="mb-1" /> <span className="text-[10px] font-bold">Завершить</span>
                    </button>
                </div>
            </div>

            {/* Confirmation / Winner Record Modal */}
            {activeModal?.type === 'winner' ? (
                <BaseModal
                    isOpen={showModal}
                    onClose={() => setConfirmModal(null)}
                    title={getModalTitle()}
                    subtitle={getModalDescription()}
                    maxWidth="md"
                    variant="auto"
                    modalId="winner-record-modal"
                    priority={40}
                    showCloseButton={false}
                >
                    <div className="flex flex-col gap-4 w-full">
                        {canRecordStats && (
                            <div className="flex flex-col gap-2 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                                <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 text-left flex items-center gap-1.5">
                                    <span>💀</span> Количество убийств
                                </h4>
                                {assignments.filter(p => {
                                    const positionToIndex = { 'bottom': 0, 'top': 1, 'left': 2, 'right': 3 };
                                    const idx = positionToIndex[p.position];
                                    return playerNames[idx]?.trim() !== '';
                                }).map(player => {
                                    const positionToIndex = { 'bottom': 0, 'top': 1, 'left': 2, 'right': 3 };
                                    const idx = positionToIndex[player.position];
                                    const playerName = playerNames[idx]?.trim() || `Игрок ${player.playerNumber}`;
                                    return (
                                        <div key={player.playerNumber} className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/55 last:border-0">
                                            <div className="flex flex-col text-left">
                                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[180px]">
                                                    {playerName}
                                                </span>
                                                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                                    {player.hero?.name || 'Без героя'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => {
                                                        setPlayerKills(prev => ({
                                                            ...prev,
                                                            [player.playerNumber]: Math.max(0, (prev[player.playerNumber] || 0) - 1)
                                                        }));
                                                    }}
                                                    className="w-7 h-7 rounded-lg bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black flex items-center justify-center active:scale-90 transition-transform text-xs"
                                                >
                                                    -
                                                </button>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={playerKills[player.playerNumber] ?? 0}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value, 10);
                                                        setPlayerKills(prev => ({
                                                            ...prev,
                                                            [player.playerNumber]: isNaN(val) ? 0 : Math.max(0, val)
                                                        }));
                                                    }}
                                                    className="w-10 py-0.5 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary-500"
                                                />
                                                <button
                                                    onClick={() => {
                                                        setPlayerKills(prev => ({
                                                            ...prev,
                                                            [player.playerNumber]: (prev[player.playerNumber] || 0) + 1
                                                        }));
                                                    }}
                                                    className="w-7 h-7 rounded-lg bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black flex items-center justify-center active:scale-90 transition-transform text-xs"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <div className="flex flex-col gap-2 w-full">
                            {canRecordStats && (
                                <>
                                    <button data-testid="record-team1-win-btn" onClick={() => handleRecordWin('team1')} className="py-3 px-4 font-bold text-white bg-secondary-500 rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-2 text-sm shadow-[0_4px_12px_rgba(var(--secondary-500)/0.25)]">
                                        <Trophy size={16} /> <span>{getTeamNames('Odd')}</span>
                                    </button>
                                    <button data-testid="record-team2-win-btn" onClick={() => handleRecordWin('team2')} className="py-3 px-4 font-bold text-white bg-primary-500 rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-2 text-sm shadow-[0_4px_12px_rgba(var(--primary-500)/0.25)]">
                                        <Trophy size={16} /> <span>{getTeamNames('Even')}</span>
                                    </button>
                                    <div className="h-px bg-slate-100 dark:bg-slate-800 my-1 w-full" />
                                </>
                            )}

                            <button onClick={handleSkipRecord} className="py-3 font-bold text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl active:scale-95 transition-transform text-sm">
                                Сбросить без записи
                            </button>
                            <button onClick={() => setConfirmModal(null)} className="py-3 font-bold text-slate-400 dark:text-slate-500 bg-transparent rounded-xl active:scale-95 transition-transform text-sm">
                                Отмена
                            </button>
                        </div>
                    </div>
                </BaseModal>
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

            {/* INFO Modal */}
            <BaseModal
                isOpen={showInfo}
                onClose={() => setShowInfo(false)}
                title={getModeTitle()}
                subtitle="Режим генерации героев"
                icon={<Info size={20} className="text-primary-600 dark:text-primary-400" />}
                maxWidth="sm"
                variant="auto"
                modalId="algorithm-info-modal"
                priority={40}
                footer={() => (
                    <button onClick={() => setShowInfo(false)} className="w-full py-3 font-bold text-white bg-primary-600 rounded-xl">Понятно</button>
                )}
            >
                <div className="space-y-4 text-left w-full">
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        {getModeDescription()}
                    </p>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                            {activeExtraMode === 'player_freshness' ? (
                                <UserCheck size={14} className="text-emerald-500" />
                            ) : (
                                <History size={14} className={activeExtraMode !== 'none' ? "text-primary-500" : "text-slate-400"} />
                            )}
                            {activeExtraMode === 'player_freshness'
                                ? "Свежесть относительно игрока: Включена"
                                : activeExtraMode === 'global_freshness'
                                    ? "Свежесть по истории: Включена"
                                    : "Доп. режим свежести: Выключен"}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                            {getPrioritizeUnplayedDescription()}
                        </p>
                    </div>
                </div>
            </BaseModal>

            {/* Weights Table Modal */}
            <BaseModal
                isOpen={isWeightsModalOpen}
                onClose={() => { setIsWeightsModalOpen(false); setWeightsSearchTerm(''); }}
                title="Таблица весов героев"
                subtitle={`Всего героев: ${availableHeroes.length}`}
                icon={<Terminal size={20} className="text-primary-500" />}
                maxWidth="lg"
                variant="auto"
                modalId="generation-weights-modal"
                priority={40}
                showCloseButton={false}
                subHeader={
                    <div className="flex flex-col gap-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={16} />
                            <input
                                type="text"
                                placeholder="Поиск героя..."
                                value={weightsSearchTerm}
                                onChange={(e) => setWeightsSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                            />
                            {weightsSearchTerm && (
                                <button
                                    onClick={() => setWeightsSearchTerm('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 active:text-slate-600 dark:active:text-slate-200 transition-colors"
                                >
                                    Очистить
                                </button>
                            )}
                        </div>

                        {activeExtraMode === 'player_freshness' && (
                            <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
                                <button
                                    onClick={() => setSelectedDebugPlayerTab('global')}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${selectedDebugPlayerTab === 'global' ? 'bg-primary-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
                                >
                                    Общий
                                </button>
                                {assignments.map(a => {
                                    const positionToIndex: Record<string, number> = { 'bottom': 0, 'top': 1, 'left': 2, 'right': 3 };
                                    const idx = positionToIndex[a.position] ?? 0;
                                    const pName = playerNames[idx]?.trim() || `Игрок ${a.playerNumber}`;
                                    const isTabActive = selectedDebugPlayerTab === a.playerNumber;
                                    return (
                                        <button
                                            key={a.playerNumber}
                                            onClick={() => setSelectedDebugPlayerTab(a.playerNumber)}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${isTabActive ? 'bg-primary-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
                                        >
                                            {pName}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                }
                footer={() => (
                    <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 w-full">
                        <div>
                            <span>Сортировка по весу (убывание)</span>
                        </div>
                        <button
                            onClick={() => { setIsWeightsModalOpen(false); setWeightsSearchTerm(''); }}
                            className="py-2 px-4 bg-slate-100 dark:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold transition-colors"
                        >
                            Закрыть
                        </button>
                    </div>
                )}
            >
                <div className="flex-1 overflow-y-auto scrollbar-thin">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                <th className="py-2.5 px-2">Герой</th>
                                <th className="py-2.5 px-2 text-center">Ранг</th>
                                <th className="py-2.5 px-2 text-right">Вес (W)</th>
                                <th className="py-2.5 px-2 text-right">Сила (P)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                            {filteredHeroes.length > 0 ? (
                                filteredHeroes.map(({ hero, weight, power }) => {
                                    const isSelected = assignments.some(a => a.hero?.id === hero.id);
                                    return (
                                        <tr
                                            key={hero.id}
                                            className={`transition-colors ${isSelected
                                                ? 'bg-primary-50/50 dark:bg-primary-950/20 font-medium'
                                                : ''
                                                }`}
                                        >
                                            <td className="py-2.5 px-2 flex items-center gap-2">
                                                <span className={`truncate text-slate-800 dark:text-slate-200 ${isSelected ? 'text-primary-600 dark:text-primary-400 font-bold' : ''}`}>
                                                    {hero.name}
                                                </span>
                                                {isSelected && (
                                                    <span className="px-1 py-0.5 rounded bg-primary-100 dark:bg-primary-900/40 text-[9px] text-primary-600 dark:text-primary-400 font-black uppercase tracking-wider">
                                                        В игре
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-2.5 px-2 text-center">
                                                <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                                                    {hero.rank || '—'}
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-2 text-right font-mono text-xs text-slate-500 dark:text-slate-400">
                                                {weight.toFixed(2)}
                                            </td>
                                            <td className="py-2.5 px-2 text-right font-mono text-xs text-slate-500 dark:text-slate-400">
                                                {power}
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={4} className="py-8 text-center text-slate-400 dark:text-slate-500 text-sm">
                                        Герои не найдены
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </BaseModal>

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
