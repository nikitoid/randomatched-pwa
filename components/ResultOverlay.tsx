import React from 'react';
import { X, Users } from 'lucide-react';
import { AssignedPlayer } from '../types';

interface ResultOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  assignments: AssignedPlayer[];
}

export const ResultOverlay: React.FC<ResultOverlayProps> = ({ isOpen, onClose, assignments }) => {
  if (!assignments.length) return null;

  // Helper to find player by position
  const getPlayer = (pos: 'top' | 'bottom' | 'left' | 'right') => 
    assignments.find(p => p.position === pos);

  const top = getPlayer('top');
  const bottom = getPlayer('bottom');
  const left = getPlayer('left');
  const right = getPlayer('right');

  // Fixed sizing for uniformity: w-60 (240px) h-32 (128px)
  const CARD_WIDTH_CLASS = "w-60";
  const CARD_HEIGHT_CLASS = "h-32";

  const renderCard = (player: AssignedPlayer, rotationClass: string) => {
    // Dynamic font size logic based on character count
    // Relaxed thresholds to keep text larger for longer, relying on line-clamp-2
    const len = player.hero.length;
    let fontSizeClass = "text-2xl";
    
    if (len > 30) fontSizeClass = "text-sm";
    else if (len > 24) fontSizeClass = "text-base";
    else if (len > 18) fontSizeClass = "text-lg";
    else if (len > 14) fontSizeClass = "text-xl";
    // <= 14 chars remains text-2xl

    const isTeamOdd = player.team === 'Odd';

    return (
      <div 
        className={`${rotationClass} ${CARD_WIDTH_CLASS} ${CARD_HEIGHT_CLASS} flex flex-col items-center justify-center p-1 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 pointer-events-auto transition-transform select-none`}
      >
        <h2 className={`${fontSizeClass} font-bold text-center text-slate-800 dark:text-slate-100 leading-tight px-1 w-full line-clamp-2 break-words`}>
          {player.hero}
        </h2>
        <div className="flex items-center gap-1.5 mt-1.5 text-slate-500 dark:text-slate-400">
          <Users size={14} />
          <span className="font-medium text-sm">Игрок {player.playerNumber}</span>
        </div>
        <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full mt-1 ${
          isTeamOdd 
            ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' 
            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
        }`}>
          Команда {isTeamOdd ? '1' : '2'}
        </span>
      </div>
    );
  };

  return (
    <div 
      className={`fixed inset-0 z-50 bg-slate-100/95 dark:bg-slate-950/95 backdrop-blur-sm transition-all duration-500 ease-in-out flex flex-col ${
        isOpen ? 'opacity-100 pointer-events-auto scale-100 visible' : 'opacity-0 pointer-events-none scale-95 invisible'
      }`}
    >
      {/* Center Close Button / Hub */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
        <button 
          onClick={onClose}
          className="pointer-events-auto w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-xl transition-transform hover:rotate-90 active:scale-90"
        >
          <X size={32} />
        </button>
      </div>

      {/* Grid Layout for the Cross */}
      <div className="flex-1 w-full h-full relative p-2 overflow-hidden">
        
        {/* TOP SECTION (Rotated 180deg) */}
        {top && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full flex justify-center pt-8 pointer-events-none z-10">
            {renderCard(top, "rotate-180")}
          </div>
        )}

        {/* BOTTOM SECTION */}
        {bottom && (
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full flex justify-center pb-8 pointer-events-none z-10">
            {renderCard(bottom, "")}
          </div>
        )}

        {/* LEFT SECTION (Rotated 90deg) */}
        {left && (
          <div className="absolute top-1/2 left-0 -translate-y-1/2 h-full flex items-center justify-start pl-4 pointer-events-none z-0">
             {/* Offset logic: 
                 Card width is 240px. Center of rotation is center of box.
                 When rotated 90deg, the visual left edge (which is the bottom of the card) 
                 is at x = width/2 - height/2 = 120 - 64 = 56px from the pivot center.
                 We want to pull it closer to the screen edge.
                 -ml-14 (3.5rem = 56px) pulls the element left by 56px.
             */}
             <div className="pointer-events-auto -ml-14"> 
                {renderCard(left, "rotate-90")}
             </div>
          </div>
        )}

        {/* RIGHT SECTION (Rotated -90deg) */}
        {right && (
          <div className="absolute top-1/2 right-0 -translate-y-1/2 h-full flex items-center justify-end pr-4 pointer-events-none z-0">
             <div className="pointer-events-auto -mr-14">
                {renderCard(right, "-rotate-90")}
             </div>
          </div>
        )}
      </div>
    </div>
  );
};