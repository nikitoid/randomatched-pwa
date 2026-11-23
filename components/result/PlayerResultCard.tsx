import React from 'react';
import { Users, RefreshCw, Ban, UserCog } from 'lucide-react';
import { AssignedPlayer } from '../../types';
import { getHeroWeight } from '../../utils/generator';
import { Avatar } from '../common/Avatar';
import { Z_INDEX_BASE } from '../../constants/zIndex';
import { ActiveCardDrag, CardPosition } from '../../hooks/useCardSwapDrag';

const POSITION_TO_INDEX: Record<CardPosition, number> = {
    bottom: 0,
    top: 1,
    left: 2,
    right: 3
};

interface CardInnerProps {
    player: AssignedPlayer;
    playerNames: string[];
    isFloating: boolean;
    isDragMode: boolean;
    isHoveredTarget: boolean;
    isGradientActive: boolean;
    isViewModeAnimating: boolean;
    isAnyModalOpen: boolean;
    isDebugMode: boolean;
    weight: number;
    power: number;
    activeDrag?: ActiveCardDrag | null;
    canManualSelect: boolean;
    onBanClick: (e: React.MouseEvent, player: AssignedPlayer) => void;
    onOpenManualSelect: (e: React.MouseEvent, playerNumber: number) => void;
    onRerollSpecific: (playerNumber: number) => void;
}

const CardInnerContent: React.FC<CardInnerProps> = ({
    player,
    playerNames,
    isFloating,
    isDragMode,
    isHoveredTarget,
    isGradientActive,
    isViewModeAnimating,
    isAnyModalOpen,
    isDebugMode,
    weight,
    power,
    activeDrag,
    canManualSelect,
    onBanClick,
    onOpenManualSelect,
    onRerollSpecific
}) => {
    const position = player.position;
    const hasHero = player.hero !== null;
    const heroName = player.hero?.name || '';
    const heroRank = player.hero?.rank || '';

    const index = POSITION_TO_INDEX[position];
    const customName = playerNames[index]?.trim();

    let displayName = '';
    let showNumberBadge = false;

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
            ? 'shadow-[0_0_30px_rgb(var(--primary-500)/0.5)] ring-1 ring-primary-300/40'
            : 'shadow-[0_0_30px_rgb(var(--secondary-500)/0.5)] ring-1 ring-secondary-300/40'
        : isTeamOdd
            ? 'shadow-[0_0_20px_rgb(var(--primary-500)/0.4)]'
            : 'shadow-[0_0_20px_rgb(var(--secondary-500)/0.4)]';

    const gradient = isTeamOdd
        ? `bg-gradient-to-br from-primary-500/90 to-primary-700/90 text-white ${shadowStyle} border border-primary-200/30`
        : `bg-gradient-to-br from-secondary-500/90 to-secondary-700/90 text-white ${shadowStyle} border border-secondary-200/30`;

    const buttonStyle = 'bg-white/20 active:bg-white/40 border border-white/30 active:border-white/50 text-white w-7 h-7 flex items-center justify-center rounded-lg shadow-sm active:scale-95 transition-transform duration-150';

    const cardSizeClass = isFloating
        ? 'w-32 h-20'
        : 'w-[calc(50vw-18px)] h-[30vmin] max-w-[280px] max-h-[190px]';

    return (
        <div
            className={`
                relative flex flex-col items-center justify-center p-3 select-none [transform:translateZ(0)] [backface-visibility:hidden] transition-none
                ${gradient}
                ${isFloating
                    ? `${cardSizeClass} rounded-2xl shadow-2xl ring-4 ring-white/50`
                    : `${cardSizeClass} rounded-3xl`}
                ${isHoveredTarget ? 'scale-90 opacity-80 ring-4 ring-white/50' : ''}
                ${isDragMode && !isFloating ? 'cursor-grab active:cursor-grabbing animate-pulse-slow ring-2 ring-white ring-offset-2 ring-offset-slate-200 dark:ring-offset-slate-900' : ''}
            `}
            style={isFloating && activeDrag ? {
                position: 'fixed',
                zIndex: Z_INDEX_BASE.TOOLTIP,
                left: activeDrag.currX,
                top: activeDrag.currY,
                transform: 'translate(-50%, -50%) rotate(0deg)',
                pointerEvents: 'none',
            } : undefined}
        >
            {/* Оптимизированное динамическое свечение карточки при включенной опции "Эмбиент-фон" */}
            {isGradientActive && (
                <div
                    className="absolute left-1/2 top-1/2 pointer-events-none -z-10 [transform:translateZ(0)] [backface-visibility:hidden] overflow-visible"
                    style={{
                        width: '180px',
                        height: '180px',
                        transform: 'translate(-50%, -50%) scale(2.0)',
                        willChange: isViewModeAnimating ? 'transform' : 'auto'
                    }}
                >
                    <div
                        className={`w-full h-full rounded-full opacity-80 dark:opacity-85 [transform:translateZ(0)] [backface-visibility:hidden] will-change-[opacity] animate-pulse-glow ${isAnyModalOpen ? '[animation-play-state:paused]' : ''}`}
                        style={{
                            background: isTeamOdd
                                ? 'radial-gradient(circle, rgb(var(--primary-500) / 0.55) 0%, rgb(var(--primary-500) / 0.28) 28%, rgb(var(--primary-500) / 0.1) 52%, transparent 72%)'
                                : 'radial-gradient(circle, rgb(var(--secondary-500) / 0.55) 0%, rgb(var(--secondary-500) / 0.28) 28%, rgb(var(--secondary-500) / 0.1) 52%, transparent 72%)',
                        }}
                    />
                </div>
            )}
            {!isFloating && hasHero && !isDragMode && (
                <div className="absolute top-0 left-0 w-full flex justify-between p-2 z-20">
                    <button
                        type="button"
                        onClick={(e) => onBanClick(e, player)}
                        aria-label="Забанить героя"
                        className={buttonStyle}
                    >
                        <Ban size={14} />
                    </button>
                    <div className="flex gap-1">
                        {canManualSelect && (
                            <button
                                type="button"
                                data-testid="manual-select-btn"
                                onClick={(e) => onOpenManualSelect(e, player.playerNumber)}
                                aria-label="Выбрать героя вручную"
                                className={buttonStyle}
                            >
                                <UserCog size={14} />
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onRerollSpecific(player.playerNumber); }}
                            aria-label="Перевыбрать героя"
                            className={buttonStyle}
                        >
                            <RefreshCw size={14} />
                        </button>
                    </div>
                </div>
            )}

            {/* Rank Badge */}
            {hasHero && heroRank && !isDragMode && !isFloating && (
                <div key={player.hero?.id || 'rank'} className="absolute top-2 right-1/2 translate-x-1/2 z-10 animate-hero-reveal">
                    <div className="px-1.5 py-0.5 rounded bg-black/20 border border-white/10 text-[10px] sm:text-[11px] font-bold tracking-widest text-white/90">{heroRank}</div>
                </div>
            )}

            {/* Main Content */}
            <div className={`flex flex-col items-center justify-center w-full transition-transform duration-300 ${isFloating ? 'scale-75' : ''}`}>
                {!isFloating && (
                    <h2
                        className={`font-black text-center leading-tight drop-shadow-md px-1 w-full line-clamp-2 mt-1 min-h-[1.5em] z-10 flex items-center justify-center gap-1.5 ${heroName.length > 50 ? 'text-sm sm:text-base' : heroName.length > 35 ? 'text-sm sm:text-lg' : 'text-lg sm:text-2xl'}`}
                    >
                        {hasHero ? (
                            <span
                                key={player.hero?.id || 'hero-name'}
                                className={`inline-flex items-center justify-center gap-1.5 w-full ${!isDragMode && !isFloating ? 'animate-hero-reveal' : ''}`}
                            >
                                <span className="truncate">{heroName}</span>
                            </span>
                        ) : (
                            <span className="opacity-50 text-2xl sm:text-3xl font-bold animate-pulse-soft">?</span>
                        )}
                    </h2>
                )}

                {isDebugMode && hasHero && !isFloating && !isDragMode && (
                    <div className="mt-1 px-2 py-0.5 rounded-md bg-black/50 backdrop-blur-sm border border-amber-400/40 text-[9px] font-mono font-bold text-amber-300 shadow-sm z-10">
                        W: {weight.toFixed(2)} | P: {power}
                    </div>
                )}

                {isFloating && (
                    <div className="text-3xl font-bold opacity-90 drop-shadow-md">{displayName.charAt(0).toUpperCase() || <Users size={32} />}</div>
                )}

                <div className={`flex items-center gap-2 opacity-90 z-10 transition-[transform,opacity] duration-300 ${isFloating ? 'mt-0' : 'absolute bottom-3'}`}>
                    {!isFloating && !showNumberBadge && (
                        <Avatar entityType="player" entityId={displayName} name={displayName} size="xs" />
                    )}
                    {showNumberBadge && !isFloating && (
                        <div className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white/20 text-[10px] sm:text-xs font-black shadow-sm border border-white/10">{player.playerNumber}</div>
                    )}
                    <span className="font-bold text-[10px] sm:text-xs tracking-widest uppercase truncate max-w-[120px] drop-shadow-sm">{displayName}</span>
                </div>
            </div>
        </div>
    );
};

interface PlayerResultCardProps {
    player: AssignedPlayer;
    assignments: AssignedPlayer[];
    playerNames: string[];
    viewMode: 'facing' | 'cross';
    isDragMode: boolean;
    isDraggingThis: boolean;
    isHoveredTarget: boolean;
    isGradientActive: boolean;
    isViewModeAnimating: boolean;
    isAnyModalOpen: boolean;
    isDebugMode: boolean;
    weightsMap: Map<string, number>;
    canManualSelect: boolean;
    cardRef: (el: HTMLDivElement | null) => void;
    onPointerDown: (e: React.PointerEvent, position: CardPosition) => void;
    onBanClick: (e: React.MouseEvent, player: AssignedPlayer) => void;
    onOpenManualSelect: (e: React.MouseEvent, playerNumber: number) => void;
    onRerollSpecific: (playerNumber: number) => void;
}

/**
 * Positioned player card on the 2x2 result board (supports facing and cross layouts).
 */
export const PlayerResultCard: React.FC<PlayerResultCardProps> = ({
    player,
    assignments,
    playerNames,
    viewMode,
    isDragMode,
    isDraggingThis,
    isHoveredTarget,
    isGradientActive,
    isViewModeAnimating,
    isAnyModalOpen,
    isDebugMode,
    weightsMap,
    canManualSelect,
    cardRef,
    onPointerDown,
    onBanClick,
    onOpenManualSelect,
    onRerollSpecific
}) => {
    const position = player.position;
    const shouldAnimate = isViewModeAnimating && !isDraggingThis;

    const weight = player.hero ? (weightsMap.get(player.hero.id) || 1) : 1;
    const power = player.hero ? getHeroWeight(player.hero) : 6;

    let transformStyle = '';

    if (viewMode === 'facing') {
        const horizOffset = 'min(calc(25vw - 3px), 148px)';
        const vertOffset = 'min(26vmin, 160px)';

        const teamOddPlayers = assignments.filter(a => a.team === 'Odd');
        const teamEvenPlayers = assignments.filter(a => a.team === 'Even');

        if (player.team === 'Odd') {
            const idx = teamOddPlayers.findIndex(a => a.position === player.position);
            const isLeft = idx <= 0;
            const signX = isLeft ? '-' : '+';
            transformStyle = `translate3d(calc(-50% ${signX} ${horizOffset}), calc(-50% - ${vertOffset}), 0) scale(1) rotate(0deg)`;
        } else {
            const idx = teamEvenPlayers.findIndex(a => a.position === player.position);
            const isLeft = idx <= 0;
            const signX = isLeft ? '-' : '+';
            transformStyle = `translate3d(calc(-50% ${signX} ${horizOffset}), calc(-50% + ${vertOffset}), 0) scale(1) rotate(0deg)`;
        }
    } else {
        const btnRadius = '45px';
        const gap = '8px';
        const halfH = 'min(16vmin, 100px)';
        const halfW = 'min(26vmin, 160px)';

        const sideOffsetFromCenter = `calc(${btnRadius} + ${gap} + ${halfH})`;
        const verticalOffsetFromCenter = `calc(${halfW} + ${gap} + ${halfH})`;

        const crossScale = 1.12;

        switch (position) {
            case 'top':
                transformStyle = `translate3d(-50%, calc(-50% - ${verticalOffsetFromCenter}), 0) scale(${crossScale}) rotate(180deg)`;
                break;
            case 'bottom':
                transformStyle = `translate3d(-50%, calc(-50% + ${verticalOffsetFromCenter}), 0) scale(${crossScale}) rotate(0deg)`;
                break;
            case 'left':
                transformStyle = `translate3d(calc(-50% - ${sideOffsetFromCenter}), -50%, 0) scale(${crossScale}) rotate(90deg)`;
                break;
            case 'right':
                transformStyle = `translate3d(calc(-50% + ${sideOffsetFromCenter}), -50%, 0) scale(${crossScale}) rotate(-90deg)`;
                break;
        }
    }

    return (
        <div
            ref={cardRef}
            className="absolute top-1/2 left-1/2 z-10 pointer-events-auto [transform:translateZ(0)] [backface-visibility:hidden]"
            style={{
                transform: transformStyle,
                transformOrigin: 'center',
                transition: shouldAnimate ? 'transform 500ms cubic-bezier(0.34,1.56,0.64,1)' : 'none',
                willChange: shouldAnimate ? 'transform' : 'auto',
                touchAction: 'none'
            }}
            onPointerDown={(e) => onPointerDown(e, position)}
        >
            {isDraggingThis && (
                <div className="absolute inset-0 rounded-3xl border-2 border-dashed border-white/30 bg-white/10 animate-pulse z-0 w-[calc(50vw-18px)] h-[30vmin] max-w-[280px] max-h-[190px]" />
            )}
            <div className={isDraggingThis ? 'opacity-0 pointer-events-none' : ''}>
                <CardInnerContent
                    player={player}
                    playerNames={playerNames}
                    isFloating={false}
                    isDragMode={isDragMode}
                    isHoveredTarget={isHoveredTarget}
                    isGradientActive={isGradientActive}
                    isViewModeAnimating={isViewModeAnimating}
                    isAnyModalOpen={isAnyModalOpen}
                    isDebugMode={isDebugMode}
                    weight={weight}
                    power={power}
                    canManualSelect={canManualSelect}
                    onBanClick={onBanClick}
                    onOpenManualSelect={onOpenManualSelect}
                    onRerollSpecific={onRerollSpecific}
                />
            </div>
        </div>
    );
};

interface FloatingResultCardProps {
    player: AssignedPlayer;
    playerNames: string[];
    activeDrag: ActiveCardDrag;
    isGradientActive: boolean;
}

/**
 * Floating drag preview card rendered while swapping player positions.
 */
export const FloatingResultCard: React.FC<FloatingResultCardProps> = ({
    player,
    playerNames,
    activeDrag,
    isGradientActive
}) => {
    return (
        <CardInnerContent
            player={player}
            playerNames={playerNames}
            isFloating={true}
            isDragMode={true}
            isHoveredTarget={false}
            isGradientActive={isGradientActive}
            isViewModeAnimating={false}
            isAnyModalOpen={false}
            isDebugMode={false}
            weight={1}
            power={6}
            activeDrag={activeDrag}
            canManualSelect={false}
            onBanClick={() => {}}
            onOpenManualSelect={() => {}}
            onRerollSpecific={() => {}}
        />
    );
};
