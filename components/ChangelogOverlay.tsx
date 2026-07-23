import React from 'react';
import { Sparkles, Check } from 'lucide-react';
import { CHANGELOG, ChangelogSection, isReleaseUnread, getUnreadReleasesCount } from '../utils/changelog';
import { BaseModal } from './common/BaseModal';

interface ChangelogOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    lastSeenVersion: string | null;
    triggerHaptic: (pattern?: number | number[]) => void;
}

export const ChangelogOverlay: React.FC<ChangelogOverlayProps> = ({
    isOpen,
    onClose,
    lastSeenVersion,
    triggerHaptic
}) => {
    const unreadCount = getUnreadReleasesCount(lastSeenVersion);

    const getBadgeStyle = (type: ChangelogSection['type']) => {
        switch (type) {
            case 'added':
                return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30';
            case 'changed':
                return 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30';
            case 'fixed':
                return 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30';
            default:
                return 'bg-slate-50 text-slate-700 dark:bg-slate-800/30 dark:text-slate-400 border border-slate-100 dark:border-slate-800/30';
        }
    };

    const getBadgeLabel = (type: ChangelogSection['type']) => {
        switch (type) {
            case 'added':
                return 'Новое';
            case 'changed':
                return 'Изменено';
            case 'fixed':
                return 'Исправлено';
            default:
                return 'Обновление';
        }
    };

    const handleClose = () => {
        triggerHaptic(10);
        onClose();
    };

    const modalTitle = (
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center text-amber-500 shrink-0 shadow-inner">
                <Sparkles size={20} className="fill-amber-500/20 animate-pulse" />
            </div>
            <div>
                <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight">Что нового?</h3>
                    {unreadCount > 0 && (
                        <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-rose-500 text-white rounded-full shadow-sm animate-pulse">
                            +{unreadCount} {unreadCount === 1 ? 'новое' : 'новых'}
                        </span>
                    )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">История обновлений</p>
            </div>
        </div>
    );

    const modalFooter = (
        <button
            onClick={handleClose}
            className="w-full py-3.5 bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white font-bold text-sm sm:text-base rounded-2xl active:scale-[0.98] transition-all shadow-lg shadow-primary-500/20 flex items-center justify-center gap-2 min-h-[48px]"
        >
            <Check size={18} />
            <span>Понятно, класс!</span>
        </button>
    );

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={handleClose}
            title={modalTitle}
            maxWidth="md"
            variant="auto"
            modalId="changelog-overlay"
            priority={40}
            showCloseButton={false}
            footer={modalFooter}
        >
            <div className="space-y-6 pr-1">
                {CHANGELOG.map((release, idx) => {
                    const isUnread = isReleaseUnread(release.version, lastSeenVersion);
                    const isFirstRead = !isUnread && idx > 0 && isReleaseUnread(CHANGELOG[idx - 1].version, lastSeenVersion);

                    return (
                        <React.Fragment key={release.version}>
                            {/* Divider before older already read releases */}
                            {isFirstRead && (
                                <div className="relative py-3 flex items-center justify-center my-4">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-dashed border-slate-200 dark:border-slate-700/80" />
                                    </div>
                                    <div className="relative bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest border border-slate-200 dark:border-slate-700/60 shadow-xs">
                                        Просмотрено ранее
                                    </div>
                                </div>
                            )}

                            <div className={`relative transition-all duration-300 ${
                                isUnread
                                    ? 'overflow-hidden p-3.5 sm:p-4 rounded-2xl bg-gradient-to-b from-primary-500/10 via-primary-500/[0.03] to-transparent border border-primary-500/30 dark:border-primary-500/40 shadow-sm ring-1 ring-primary-500/15'
                                    : 'p-1 rounded-2xl'
                            }`}>
                                {/* Line for UNREAD: stays strictly inside the highlighted release card */}
                                {isUnread && release.sections.length > 0 && (
                                    <div className="absolute left-[27px] top-[40px] bottom-[16px] w-0.5 bg-primary-500/25 dark:bg-primary-400/25 pointer-events-none" />
                                )}

                                {/* Line for READ: continuous timeline line connecting read versions */}
                                {!isUnread && idx < CHANGELOG.length - 1 && (
                                    <div className="absolute left-[27px] top-[36px] bottom-[-36px] w-0.5 bg-slate-200 dark:bg-slate-800 pointer-events-none" />
                                )}

                                {/* Release Header */}
                                <div className="flex items-start justify-between gap-2.5 mb-3.5">
                                    <div className="flex items-start gap-3 min-w-0 flex-1">
                                        <div className={`px-3 h-7 rounded-full flex items-center justify-center text-xs font-black tracking-tight shrink-0 min-w-[46px] z-10 mt-0.5 ${
                                            isUnread
                                                ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30 border border-primary-400/40 dark:border-primary-400/30'
                                                : 'bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 text-slate-800 dark:text-slate-200 shadow-sm'
                                        }`}>
                                            v{release.version}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h4 className="text-sm sm:text-base font-black text-slate-800 dark:text-white leading-snug break-words">
                                                {release.title || `Версия ${release.version}`}
                                            </h4>
                                            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">{release.date}</p>
                                        </div>
                                    </div>

                                    {isUnread && (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-primary-500 text-white shadow-xs shadow-primary-500/20 shrink-0 mt-0.5">
                                            <Sparkles size={11} className="fill-white/30 animate-pulse" />
                                            <span>Новое</span>
                                        </span>
                                    )}
                                </div>

                                {/* Release Sections */}
                                <div className="ml-10 space-y-3.5 relative z-10">
                                    {release.sections.map((section, sIdx) => (
                                        <div key={sIdx} className="space-y-2">
                                            <div className="flex">
                                                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${getBadgeStyle(section.type)}`}>
                                                    {getBadgeLabel(section.type)}
                                                </span>
                                            </div>
                                            <ul className="space-y-1.5 pl-0.5">
                                                {section.items.map((item, iIdx) => (
                                                    <li key={iIdx} className={`text-xs sm:text-sm flex items-start gap-2.5 leading-relaxed ${
                                                        isUnread
                                                            ? 'text-slate-900 dark:text-white font-medium'
                                                            : 'text-slate-700 dark:text-slate-300 font-normal'
                                                    }`}>
                                                        <span className={`rounded-full mt-[7px] shrink-0 ${
                                                            isUnread
                                                                ? 'w-2 h-2 bg-primary-500 shadow-xs shadow-primary-500/50 ring-2 ring-white dark:ring-slate-900'
                                                                : 'w-1.5 h-1.5 bg-slate-400 dark:bg-slate-500'
                                                        }`} />
                                                        <span>{item}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </React.Fragment>
                    );
                })}
            </div>
        </BaseModal>
    );
};

