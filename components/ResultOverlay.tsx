
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Users, RefreshCw, Ban, Shuffle, Trash2, Dice5, HelpCircle, Info, Check, Move, Sparkles, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { AssignedPlayer, GenerationMode } from '../types';

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
  onSwapPositions?: (pos1: 'top'|'bottom'|'left'|'right', pos2: 'top'|'bottom'|'left'|'right') => void;
}

type Position = 'top' | 'bottom' | 'left' | 'right';

const GENERATION_MODES = [
  { id: 'random', label: 'Рандом', desc: 'Полный хаос', icon: Dice5, color: 'text-slate-500 dark:text-slate-400', bg: 'bg-slate-100 dark:bg-slate-800' },
  { id: 'balanced', label: 'Баланс', desc: 'Умный подбор', icon: Sparkles, color: 'text-primary-600 dark:text-primary-400', bg: 'bg-primary-50 dark:bg-primary-900/20' },
  { id: 'strict', label: 'Лимит', desc: 'Настраиваемый', icon: SlidersHorizontal, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20' }
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
  onSwapPositions
}) => {
  const [confirmModal, setConfirmModal] = useState<{ type: 'single' | 'ban_all'; playerNumber?: number; playerName?: string; } | null>(null);
  const [displayModal, setDisplayModal] = useState<{ type: 'single' | 'ban_all'; playerNumber?: number; playerName?: string; } | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [isRerollConfirm, setIsRerollConfirm] = useState(false);
  const [isModeSelectorOpen, setIsModeSelectorOpen] = useState(false);
  
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

  useEffect(() => {
    if (!isOpen) {
        setIsRerollConfirm(false);
        setIsDragMode(false);
        setActiveDrag(null);
        setHoveredTarget(null);
        setIsModeSelectorOpen(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (confirmModal) {
        setDisplayModal(confirmModal);
    }
  }, [confirmModal]);

  const getPlayer = (pos: Position) => assignments.find(p => p.position === pos);

  const heroesRevealed = assignments.every(a => a.hero !== null);
  const hasCustomNames = playerNames.some(n => n.trim() !== '');

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


  // Helper to render card CONTENT only (reused for normal and floating)
  const renderCardContent = (player: AssignedPlayer, isFloating: boolean, isDraggingThis: boolean, isHoveredTarget: boolean) => {
      const position = player.position;
      const hasHero = player.hero !== null;
      const heroName = player.hero?.name || "";
      const heroRank = player.hero?.rank || "";
      
      let displayName = "";
      let showNumberBadge = false;

      if (hasCustomNames) {
          const positionToIndex = { 'bottom': 0, 'top': 1, 'left': 2, 'right': 3 };
          const index = positionToIndex[position];
          const customName = playerNames[index]?.trim();
          displayName = customName || `Игрок ${index + 1}`;
          showNumberBadge = true; 
      } else {
          displayName = `Игрок ${player.playerNumber}`;
          showNumberBadge = false; 
      }

      const isTeamOdd = player.team === 'Odd';
      
      const gradient = isTeamOdd 
        ? "bg-gradient-to-br from-secondary-500/90 to-secondary-700/90 text-white shadow-[0_0_25px_rgba(var(--secondary-500)/0.4)] border border-secondary-200/30"
        : "bg-gradient-to-br from-primary-500/90 to-primary-700/90 text-white shadow-[0_0_25px_rgba(var(--primary-500)/0.4)] border border-primary-200/30";

      const buttonStyle = "bg-gradient-to-b from-white/20 to-white/5 md:hover:from-white/30 md:hover:to-white/10 active:from-white/30 active:to-white/10 border-t border-white/40 border-b border-black/10 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.2)] active:shadow-none active:scale-95 active:border-white/10 text-white w-7 h-7 flex items-center justify-center rounded-lg backdrop-blur-sm transition-all duration-200";

      const transitionClass = isFloating ? 'transition-none' : 'transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]';

      // Dynamic sizing based on vmin to ensure fit
      const cardSizeClass = isFloating 
        ? 'w-32 h-20' 
        : 'w-[60vmin] h-[34vmin] max-w-[320px] max-h-[190px]';

      return (
        <div 
            className={`
                relative flex flex-col items-center justify-center p-3 backdrop-blur-md select-none ${transitionClass}
                ${gradient}
                ${isFloating 
                    ? `${cardSizeClass} rounded-2xl shadow-2xl ring-4 ring-white/50 z-[100]` 
                    : `${cardSizeClass} rounded-3xl`}
                ${isHoveredTarget ? 'scale-90 opacity-80 ring-4 ring-white/50' : ''}
                ${isDragMode && !isFloating ? 'cursor-grab active:cursor-grabbing hover:scale-105 animate-pulse ring-2 ring-white ring-offset-2 ring-offset-slate-200 dark:ring-offset-slate-900' : ''}
            `}
            style={isFloating ? {
                position: 'fixed',
                left: activeDrag!.currX,
                top: activeDrag!.currY,
                transform: 'translate(-50%, -50%) rotate(0deg)',
                pointerEvents: 'none',
            } : undefined}
        >
            {!isFloating && hasHero && !isDragMode && (
                <div className="absolute top-0 left-0 w-full flex justify-between p-2 animate-fade-in z-20">
                    <button onClick={(e) => handleBanClick(e, player)} className={buttonStyle}><Ban size={14} /></button>
                    <button onClick={(e) => { e.stopPropagation(); onRerollSpecific(player.playerNumber); }} className={buttonStyle}><RefreshCw size={14} /></button>
                </div>
            )}

            {/* Rank Badge */}
            {hasHero && heroRank && !isDragMode && !isFloating && (
                <div className="absolute top-2 right-1/2 translate-x-1/2 z-10 animate-fade-in">
                    <div className="px-1.5 py-0.5 rounded bg-black/20 border border-white/10 text-[10px] sm:text-[11px] font-bold tracking-widest text-white/90">{heroRank}</div>
                </div>
            )}

            {/* Main Content */}
            <div className={`flex flex-col items-center justify-center w-full transition-all duration-300 ${isFloating ? 'scale-75' : ''}`}>
                {!isFloating && (
                <h2 
                    key={player.hero?.id || 'unknown'}
                    className={`font-black text-center leading-tight drop-shadow-md px-1 w-full line-clamp-2 mt-1 min-h-[1.5em] z-10 transition-opacity duration-200 ${hasHero ? 'animate-hero-reveal' : ''} ${heroName.length > 50 ? 'text-xs sm:text-xs' : heroName.length > 35 ? 'text-xs sm:text-sm' : 'text-sm sm:text-xl'}`}
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

    // Center-relative positioning with fixed gaps
    // Center button is roughly 6rem (96px). Radius 48px. Gap 8px. Total offset ~56px.
    // We use a bit more for safe spacing.
    let positionStyle: React.CSSProperties = {};
    const offset = '4.5rem'; // ~72px from center

    switch (position) {
        case 'top':
            positionStyle = { 
                position: 'absolute', 
                bottom: '50%', 
                left: '50%', 
                marginBottom: offset, 
                transform: 'translate(-50%, 0) rotate(180deg)',
                transformOrigin: 'center'
            };
            break;
        case 'bottom':
            positionStyle = { 
                position: 'absolute', 
                top: '50%', 
                left: '50%', 
                marginTop: offset, 
                transform: 'translate(-50%, 0)',
                transformOrigin: 'center'
            };
            break;
        case 'left':
            positionStyle = { 
                position: 'absolute', 
                right: '50%', 
                top: '50%', 
                marginRight: offset, 
                transform: 'translate(0, -50%) rotate(90deg)',
                transformOrigin: 'center'
            };
            break;
        case 'right':
            positionStyle = { 
                position: 'absolute', 
                left: '50%', 
                top: '50%', 
                marginLeft: offset, 
                transform: 'translate(0, -50%) rotate(-90deg)',
                transformOrigin: 'center'
            };
            break;
    }

    return (
        <div 
            ref={(el) => { cardRefs.current[position] = el; }}
            className="z-10"
            style={{ ...positionStyle, touchAction: 'none' }}
            onPointerDown={(e) => handlePointerDown(e, position)}
        >
            {/* Placeholder when dragging */}
            {isDraggingThis && (
                <div className="absolute inset-0 w-[60vmin] h-[34vmin] max-w-[320px] max-h-[190px] rounded-3xl border-2 border-dashed border-white/30 bg-white/5 backdrop-blur-sm animate-pulse z-0" />
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

  const getModalTitle = () => displayModal?.type === 'single' ? 'Забанить героя?' : displayModal?.type === 'ban_all' ? 'Исключить всех?' : 'Подтверждение';
  const getModalDescription = () => displayModal?.type === 'single' ? `"${displayModal.playerName}" будет убран из списка.` : displayModal?.type === 'ban_all' ? 'Все текущие герои будут убраны из списка.' : 'Вы уверены?';
  
  const getModeTitle = () => generationMode === 'random' ? 'Полный рандом' : generationMode === 'balanced' ? 'Умный баланс' : 'Настраиваемый';
  const getModeDescription = () => {
    if (generationMode === 'random') return 'Полный хаос. Герои выбираются случайно, никакого баланса.';
    if (generationMode === 'balanced') return 'Алгоритм генерирует случайный состав, а затем точечно меняет героев (макс. 2), чтобы выровнять силы команд. Это обеспечивает честный баланс (разница ≤ 1), сохраняя эффект неожиданности и разнообразие.';
    return 'Вы сами задаете допустимую разницу в силе (±). Система подберет случайных героев, которые вписываются в этот диапазон, сохраняя вариативность.';
  };

  const showModal = !!confirmModal;
  const currentMode = GENERATION_MODES.find(m => m.id === generationMode) || GENERATION_MODES[0];

  return (
    <>
      <div className={`fixed inset-0 z-50 bg-slate-200/90 dark:bg-slate-950/90 backdrop-blur-xl transition-all duration-500 ${isOpen ? 'opacity-100 pointer-events-auto visible' : 'opacity-0 pointer-events-none invisible'}`}>
        
        {/* Backdrop for Mode Selector */}
        <div 
            className={`fixed inset-0 bg-slate-900/20 backdrop-blur-[2px] z-[60] transition-all duration-300 ${isModeSelectorOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}
            onClick={() => setIsModeSelectorOpen(false)}
        />

        {/* Controls Bar */}
        <div className="absolute top-0 left-0 w-full px-4 pt-safe-area-top pt-6 mt-2 flex justify-between items-center pointer-events-none">
            {setGenerationMode && (
                <div className={`pointer-events-auto relative flex items-center gap-0 bg-white dark:bg-slate-800 h-12 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 animate-in slide-in-from-top-4 duration-500 transition-shadow ${isModeSelectorOpen ? 'z-[61] ring-2 ring-primary-500/50' : 'z-50'}`}>
                    
                    <button 
                        onClick={() => setIsModeSelectorOpen(!isModeSelectorOpen)}
                        className="relative h-full flex items-center pl-2 pr-3 gap-2 outline-none cursor-pointer rounded-l-2xl md:hover:bg-slate-50 dark:md:hover:bg-slate-700/50 active:bg-slate-50 dark:active:bg-slate-700/50 transition-colors"
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
                             {GENERATION_MODES.map(mode => (
                                 <button
                                    key={mode.id}
                                    onClick={() => { setGenerationMode(mode.id as GenerationMode); setIsModeSelectorOpen(false); }}
                                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors ${generationMode === mode.id ? 'bg-slate-100 dark:bg-slate-800' : 'md:hover:bg-slate-50 dark:md:hover:bg-slate-800 active:bg-slate-50 dark:active:bg-slate-800'}`}
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
                             <input type="number" min="0" max="10" step="1" inputMode="numeric" value={balanceThreshold} onChange={(e) => setBalanceThreshold(parseInt(e.target.value) || 0)} className="w-10 py-1 bg-slate-100 dark:bg-slate-700 rounded-md text-center text-sm font-bold outline-none focus:ring-1 focus:ring-primary-500 select-text" />
                        </div>
                    ) : (
                        <div className="w-1" />
                    )}

                    <button onClick={() => setShowInfo(true)} className="mr-1 p-2 rounded-full text-slate-400 md:hover:text-primary-500 md:hover:bg-slate-100 dark:md:hover:bg-slate-700 active:text-primary-500 active:bg-slate-100 dark:active:bg-slate-700 transition-colors"><HelpCircle size={20} /></button>
                </div>
            )}
            <button onClick={onClose} className="pointer-events-auto p-3 rounded-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-lg active:scale-95 transition-transform border border-slate-200 dark:border-slate-700 relative z-50"><X size={24} /></button>
        </div>

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
                onClick={(e) => {
                    e.stopPropagation();
                    if (!heroesRevealed) onRevealHeroes();
                    else if (isRerollConfirm) { onRerollAllHeroes(); setIsRerollConfirm(false); }
                    else setIsRerollConfirm(true);
                }}
                disabled={isDragMode}
                className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center text-white active:scale-95 transition-all border-4 shadow-[0_0_40px_rgba(0,0,0,0.3)]
                    ${isDragMode ? 'opacity-20 grayscale cursor-not-allowed bg-slate-500 border-slate-400' : 
                      isRerollConfirm ? 'bg-red-500 border-red-300 md:hover:bg-red-600 shadow-[0_0_50px_rgba(239,68,68,0.8)]' 
                        : 'bg-primary-600 border-primary-400/50 md:hover:bg-primary-500 shadow-[0_0_40px_rgba(var(--primary-500)/0.6)] md:hover:shadow-[0_0_50px_rgba(var(--primary-500)/0.8)]'}`}
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
                  <button onClick={() => setIsDragMode(!isDragMode)} className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-all ${isDragMode ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-400 ring-2 ring-primary-500 dark:ring-primary-400 shadow-inner' : 'md:hover:bg-white dark:md:hover:bg-slate-800 active:bg-white dark:active:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                      <Move size={20} className="mb-1" /> <span className="text-[10px] font-bold">Двигать</span>
                  </button>
                  <div className="w-px h-8 bg-slate-300 dark:bg-slate-700" />
              </>
          )}
          
          <button onClick={onShuffleTeams} disabled={heroesRevealed || isDragMode} className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-colors ${heroesRevealed || isDragMode ? 'opacity-40 cursor-not-allowed text-slate-400' : 'md:hover:bg-white dark:md:hover:bg-slate-800 active:bg-white dark:active:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
              <Shuffle size={20} className="mb-1" /> <span className="text-[10px] font-bold">Команды</span>
          </button>
          <div className="w-px h-8 bg-slate-300 dark:bg-slate-700" />
          <button onClick={() => setConfirmModal({ type: 'ban_all' })} disabled={!heroesRevealed || isDragMode} className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-colors ${!heroesRevealed || isDragMode ? 'opacity-40 cursor-not-allowed text-slate-400' : 'md:hover:bg-red-50 dark:md:hover:bg-red-900/20 active:bg-red-50 dark:active:bg-red-900/20 text-red-500'}`}>
              <Trash2 size={20} className="mb-1" /> <span className="text-[10px] font-bold">Сброс</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      <div className={`fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm transition-all duration-300 ${showModal ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
           <div className={`bg-white dark:bg-slate-900 w-full max-w-xs rounded-3xl p-6 shadow-2xl transition-all duration-300 border border-slate-100 dark:border-slate-800 ring-1 ring-slate-900/5 dark:ring-white/10 ${showModal ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
              <div className="flex flex-col items-center text-center">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{getModalTitle()}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{getModalDescription()}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                 <button onClick={() => setConfirmModal(null)} className="py-3 font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl">Нет</button>
                 <button onClick={handleConfirmAction} className="py-3 font-bold text-white bg-red-500 rounded-xl">Да</button>
              </div>
           </div>
      </div>

      {/* INFO Modal */}
      <div className={`fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm transition-all duration-300 ${showInfo ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
           <div className={`bg-white dark:bg-slate-900 w-full max-w-xs rounded-3xl p-6 shadow-2xl transition-all duration-300 border border-slate-100 dark:border-slate-800 ring-1 ring-slate-900/5 dark:ring-white/10 ${showInfo ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
              <div className="flex flex-col items-center text-center mb-4">
                  <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full flex items-center justify-center mb-4"><Info size={24} /></div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{getModeTitle()}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{getModeDescription()}</p>
              </div>
              <button onClick={() => setShowInfo(false)} className="w-full py-3 font-bold text-white bg-primary-600 rounded-xl">Понятно</button>
           </div>
      </div>
    </>
  );
};
