import React, { useMemo } from 'react';
import { Camera, Shield, Swords, Wand2, Sparkles, User } from 'lucide-react';
import { useAvatars } from '../../context/AvatarContext';

export interface AvatarProps {
  entityType: 'player' | 'hero';
  entityId: string;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showEditButton?: boolean;
  onEditClick?: () => void;
  onClick?: () => void;
  className?: string;
}

const SIZE_MAP = {
  xs: 'w-5 h-5 text-[10px]',
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
  '2xl': 'w-22 h-22 text-3xl',
};

const ICON_SIZE_MAP = {
  xs: 11,
  sm: 14,
  md: 18,
  lg: 24,
  xl: 32,
  '2xl': 44,
};

const EDIT_ICON_SIZE_MAP = {
  xs: 8,
  sm: 10,
  md: 12,
  lg: 14,
  xl: 16,
  '2xl': 20,
};

const GRADIENTS = [
  'from-indigo-600 to-violet-600 text-indigo-100',
  'from-emerald-600 to-teal-600 text-emerald-100',
  'from-rose-600 to-pink-600 text-rose-100',
  'from-amber-500 to-orange-600 text-amber-100',
  'from-sky-600 to-blue-600 text-sky-100',
  'from-purple-600 to-fuchsia-600 text-purple-100',
  'from-cyan-600 to-teal-600 text-cyan-100',
];

function getHashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export const Avatar: React.FC<AvatarProps> = ({
  entityType,
  entityId,
  name,
  size = 'md',
  showEditButton = false,
  onEditClick,
  onClick,
  className = '',
}) => {
  const { getAvatar } = useAvatars();
  const avatarUrl = getAvatar(entityType, entityId || name);

  const gradientClass = useMemo(() => {
    const hash = getHashString(entityId || name || 'default');
    return GRADIENTS[hash % GRADIENTS.length];
  }, [entityId, name]);

  const initials = useMemo(() => getInitials(name), [name]);

  const renderHeroIcon = () => {
    const hash = getHashString(entityId || name);
    const iconSize = ICON_SIZE_MAP[size];
    const mod = hash % 4;
    switch (mod) {
      case 0:
        return <Swords size={iconSize} />;
      case 1:
        return <Shield size={iconSize} />;
      case 2:
        return <Wand2 size={iconSize} />;
      default:
        return <Sparkles size={iconSize} />;
    }
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    if (showEditButton && onEditClick) {
      e.stopPropagation();
      onEditClick();
    } else if (onClick) {
      onClick();
    }
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${onClick || (showEditButton && onEditClick) ? 'cursor-pointer group' : ''}`}
      onClick={handleContainerClick}
    >
      <div
        className={`rounded-full overflow-hidden flex items-center justify-center font-bold border border-white/20 dark:border-slate-700/50 shadow-sm transition-all duration-200 ${
          SIZE_MAP[size]
        } ${avatarUrl ? 'bg-slate-200 dark:bg-slate-800' : `bg-gradient-to-br ${gradientClass}`} ${
          onClick || (showEditButton && onEditClick) ? 'group-active:scale-95 group-hover:ring-2 group-hover:ring-indigo-500/40' : ''
        } ${className}`}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name || 'Avatar'}
            className="w-full h-full object-cover rounded-full"
            loading="lazy"
          />
        ) : entityType === 'player' ? (
          <span>{initials}</span>
        ) : (
          renderHeroIcon()
        )}
      </div>

      {showEditButton && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onEditClick) onEditClick();
          }}
          className={`absolute -bottom-0.5 -right-0.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-md border-2 border-white dark:border-slate-900 flex items-center justify-center transition-all group-hover:scale-110 active:scale-95 ${
            size === '2xl' ? 'p-2' : size === 'xl' ? 'p-1.5' : 'p-1'
          }`}
          aria-label="Изменить аватар"
        >
          <Camera size={EDIT_ICON_SIZE_MAP[size]} />
        </button>
      )}
    </div>
  );
};
