import React from 'react';
import { Sparkles, Check } from 'lucide-react';
import { CHANGELOG, ChangelogSection } from '../utils/changelog';
import { BaseModal } from './common/BaseModal';

interface ChangelogOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    triggerHaptic: (pattern?: number | number[]) => void;
}

export const ChangelogOverlay: React.FC<ChangelogOverlayProps> = ({
    isOpen,
    onClose,
    triggerHaptic
}) => {
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
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center text-amber-500 shrink-0">
                <Sparkles size={20} className="fill-amber-500/20 animate-pulse" />
            </div>
            <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight">Что нового?</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">История обновлений</p>
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
            footer={modalFooter}
        >
            <div className="space-y-8 pr-1">
                {CHANGELOG.map((release, idx) => (
                    <div key={release.version} className="relative">
                        {/* Line connecting releases */}
                        {idx < CHANGELOG.length - 1 && (
                            <div className="absolute left-[19px] top-[40px] bottom-[-40px] w-0.5 bg-slate-100 dark:bg-slate-800 pointer-events-none" />
                        )}

                        {/* Release Header */}
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200/40 dark:border-slate-700/40 text-xs font-black text-slate-800 dark:text-slate-200 shadow-sm z-10 shrink-0">
                                v{release.version}
                            </div>
                            <div className="min-w-0">
                                <h4 className="text-sm sm:text-base font-black text-slate-800 dark:text-white truncate">
                                    {release.title || `Версия ${release.version}`}
                                </h4>
                                <p className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 font-bold">{release.date}</p>
                            </div>
                        </div>

                        {/* Release Sections */}
                        <div className="ml-12 space-y-4">
                            {release.sections.map((section, sIdx) => (
                                <div key={sIdx} className="space-y-2">
                                    <div className="flex">
                                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${getBadgeStyle(section.type)}`}>
                                            {getBadgeLabel(section.type)}
                                        </span>
                                    </div>
                                    <ul className="space-y-1.5 pl-1.5">
                                        {section.items.map((item, iIdx) => (
                                            <li key={iIdx} className="text-xs sm:text-sm text-slate-600 dark:text-slate-350 flex items-start gap-2 leading-relaxed">
                                                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 mt-[7px] shrink-0" />
                                                <span>{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </BaseModal>
    );
};
