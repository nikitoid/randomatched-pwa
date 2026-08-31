import React, { useState, useMemo } from 'react';
import {
    Sparkles,
    Check,
    Search,
    X,
    Calendar,
    History,
    Sliders,
    Wrench,
    ShieldCheck,
    Plus,
    Tag,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { CHANGELOG, ChangelogSection, isReleaseUnread, getUnreadReleasesCount, APP_VERSION } from '../utils/changelog';
import { BaseModal } from './common/BaseModal';

interface ChangelogOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    lastSeenVersion: string | null;
    triggerHaptic: (pattern?: number | number[]) => void;
}

type FilterType = 'all' | 'added' | 'changed' | 'fixed';

export const ChangelogOverlay: React.FC<ChangelogOverlayProps> = ({
    isOpen,
    onClose,
    lastSeenVersion,
    triggerHaptic
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<FilterType>('all');
    const [expandedVersions, setExpandedVersions] = useState<Record<string, boolean>>({});

    const unreadCount = getUnreadReleasesCount(lastSeenVersion);

    const handleClose = () => {
        triggerHaptic(10);
        onClose();
    };

    const handleFilterChange = (filter: FilterType) => {
        triggerHaptic(10);
        setActiveFilter(filter);
    };

    const toggleExpandRelease = (version: string) => {
        triggerHaptic(8);
        setExpandedVersions((prev) => ({
            ...prev,
            [version]: !prev[version]
        }));
    };

    const getSectionIcon = (type: ChangelogSection['type']) => {
        switch (type) {
            case 'added':
                return <Plus size={12} className="stroke-[2.5]" aria-hidden="true" />;
            case 'changed':
                return <Sliders size={12} className="stroke-[2.5]" aria-hidden="true" />;
            case 'fixed':
                return <Wrench size={12} className="stroke-[2.5]" aria-hidden="true" />;
            case 'security':
                return <ShieldCheck size={12} className="stroke-[2.5]" aria-hidden="true" />;
            default:
                return <Tag size={12} className="stroke-[2.5]" aria-hidden="true" />;
        }
    };

    const getBadgeStyle = (type: ChangelogSection['type']) => {
        switch (type) {
            case 'added':
                return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25';
            case 'changed':
                return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/25';
            case 'fixed':
                return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25';
            case 'security':
                return 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/25';
            default:
                return 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/25';
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
            case 'security':
                return 'Безопасность';
            default:
                return 'Обновление';
        }
    };

    // Filter releases based on search query and active category filter
    const filteredReleases = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();

        return CHANGELOG.map((release) => {
            // Filter sections inside each release
            const matchingSections = release.sections.filter((section) => {
                if (activeFilter !== 'all' && section.type !== activeFilter) {
                    return false;
                }

                if (!query) return true;

                const matchTitle = section.title.toLowerCase().includes(query);
                const matchItems = section.items.some((item) => item.toLowerCase().includes(query));
                const matchReleaseTitle = (release.title || '').toLowerCase().includes(query);
                const matchVersion = release.version.toLowerCase().includes(query);

                return matchTitle || matchItems || matchReleaseTitle || matchVersion;
            });

            return {
                ...release,
                matchingSections
            };
        }).filter((release) => release.matchingSections.length > 0);
    }, [searchQuery, activeFilter]);

    const modalTitle = (
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500/20 via-orange-500/15 to-transparent dark:from-amber-500/25 dark:via-orange-500/20 rounded-2xl flex items-center justify-center text-amber-500 dark:text-amber-400 shrink-0 border border-amber-500/30 shadow-xs">
                <Sparkles size={20} className="fill-amber-500/30 animate-pulse" aria-hidden="true" />
            </div>
            <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-tight">
                        Что нового?
                    </h3>
                    {unreadCount > 0 && (
                        <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-rose-500 text-white rounded-full shadow-xs animate-pulse">
                            +{unreadCount} {unreadCount === 1 ? 'новое' : 'новых'}
                        </span>
                    )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5 mt-0.5">
                    <span>История обновлений</span>
                    <span className="inline-block w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                    <span className="font-semibold text-slate-400 dark:text-slate-500 lowercase">v{APP_VERSION}</span>
                </p>
            </div>
        </div>
    );

    const subHeaderContent = (
        <div className="space-y-2.5">
            {/* Search Input */}
            <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" aria-hidden="true" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Поиск по обновлениям..."
                    className="w-full pl-9 pr-8 py-2 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-100/90 dark:hover:bg-slate-800 text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 rounded-xl border border-slate-200/80 dark:border-slate-700/60 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all"
                />
                {searchQuery && (
                    <button
                        type="button"
                        onClick={() => {
                            setSearchQuery('');
                            triggerHaptic(5);
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white flex items-center justify-center text-xs transition-colors"
                        aria-label="Очистить поиск"
                    >
                        <X size={12} />
                    </button>
                )}
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                <button
                    type="button"
                    onClick={() => handleFilterChange('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all select-none min-h-[32px] flex items-center gap-1.5 ${
                        activeFilter === 'all'
                            ? 'bg-primary-500 text-white shadow-xs shadow-primary-500/30'
                            : 'bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 border border-slate-200/50 dark:border-slate-700/40'
                    }`}
                >
                    <span>Все релизы</span>
                </button>

                <button
                    type="button"
                    onClick={() => handleFilterChange('added')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all select-none min-h-[32px] flex items-center gap-1 ${
                        activeFilter === 'added'
                            ? 'bg-emerald-500 text-white shadow-xs shadow-emerald-500/30'
                            : 'bg-slate-100 dark:bg-slate-800/70 text-emerald-700 dark:text-emerald-400 hover:bg-slate-200/70 dark:hover:bg-slate-800 border border-slate-200/50 dark:border-slate-700/40'
                    }`}
                >
                    <Plus size={13} className="stroke-[2.5]" aria-hidden="true" />
                    <span>Новое</span>
                </button>

                <button
                    type="button"
                    onClick={() => handleFilterChange('changed')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all select-none min-h-[32px] flex items-center gap-1 ${
                        activeFilter === 'changed'
                            ? 'bg-blue-500 text-white shadow-xs shadow-blue-500/30'
                            : 'bg-slate-100 dark:bg-slate-800/70 text-blue-700 dark:text-blue-400 hover:bg-slate-200/70 dark:hover:bg-slate-800 border border-slate-200/50 dark:border-slate-700/40'
                    }`}
                >
                    <Sliders size={13} className="stroke-[2.5]" aria-hidden="true" />
                    <span>Улучшения</span>
                </button>

                <button
                    type="button"
                    onClick={() => handleFilterChange('fixed')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all select-none min-h-[32px] flex items-center gap-1 ${
                        activeFilter === 'fixed'
                            ? 'bg-amber-500 text-white shadow-xs shadow-amber-500/30'
                            : 'bg-slate-100 dark:bg-slate-800/70 text-amber-700 dark:text-amber-400 hover:bg-slate-200/70 dark:hover:bg-slate-800 border border-slate-200/50 dark:border-slate-700/40'
                    }`}
                >
                    <Wrench size={13} className="stroke-[2.5]" aria-hidden="true" />
                    <span>Исправления</span>
                </button>
            </div>
        </div>
    );

    const modalFooter = (
        <button
            type="button"
            onClick={handleClose}
            className="w-full py-3.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 active:from-primary-700 active:to-primary-800 text-white font-bold text-sm sm:text-base rounded-2xl active:scale-[0.98] transition-all shadow-md shadow-primary-500/25 flex items-center justify-center gap-2 min-h-[48px] cursor-pointer"
        >
            <Check size={18} className="stroke-[2.5]" aria-hidden="true" />
            <span>Понятно, класс!</span>
        </button>
    );

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={handleClose}
            title={modalTitle}
            subHeader={subHeaderContent}
            maxWidth="md"
            variant="auto"
            modalId="changelog-overlay"
            priority={40}
            showCloseButton={false}
            footer={modalFooter}
        >
            <div className="space-y-4 pr-0.5">
                {filteredReleases.length === 0 ? (
                    <div className="py-12 px-4 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/50 flex items-center justify-center mx-auto mb-3 text-slate-400 dark:text-slate-500">
                            <Search size={22} />
                        </div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Ничего не найдено</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                            Попробуйте изменить поисковый запрос или сбросить активный фильтр категорий.
                        </p>
                    </div>
                ) : (
                    filteredReleases.map((release, idx) => {
                        const isUnread = isReleaseUnread(release.version, lastSeenVersion);
                        const isFirstRead =
                            !isUnread &&
                            idx > 0 &&
                            isReleaseUnread(filteredReleases[idx - 1].version, lastSeenVersion);

                        const isExpanded = expandedVersions[release.version] ?? (isUnread || idx === 0);

                        return (
                            <React.Fragment key={release.version}>
                                {/* Archive Divider before previously viewed releases */}
                                {isFirstRead && (
                                    <div className="relative py-2.5 flex items-center justify-center my-2 select-none">
                                        <div className="absolute inset-0 flex items-center">
                                            <div className="w-full border-t border-dashed border-slate-200 dark:border-slate-800" />
                                        </div>
                                        <div className="relative bg-slate-100/90 dark:bg-slate-800/90 backdrop-blur-xs px-3.5 py-1 rounded-full text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest border border-slate-200 dark:border-slate-700/60 shadow-2xs flex items-center gap-1.5">
                                            <History size={11} aria-hidden="true" />
                                            <span>Просмотрено ранее</span>
                                        </div>
                                    </div>
                                )}

                                {/* Release Card */}
                                <div
                                    className={`relative transition-all duration-200 rounded-2xl overflow-hidden ${
                                        isUnread
                                            ? 'bg-gradient-to-b from-primary-500/10 via-primary-500/[0.03] to-white/60 dark:to-slate-900/60 border border-primary-500/35 dark:border-primary-500/40 shadow-xs ring-1 ring-primary-500/15'
                                            : 'bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-800/80'
                                    }`}
                                >
                                    {/* Card Header */}
                                    <div
                                        onClick={() => toggleExpandRelease(release.version)}
                                        className="p-3.5 sm:p-4 flex items-start justify-between gap-2.5 cursor-pointer select-none active:bg-slate-100/50 dark:active:bg-slate-800/40 transition-colors"
                                    >
                                        <div className="flex items-start gap-2.5 sm:gap-3 min-w-0 flex-1">
                                            {/* Version Pill */}
                                            <div
                                                className={`px-2.5 py-1 rounded-xl flex items-center justify-center text-xs font-black tracking-tight shrink-0 mt-0.5 ${
                                                    isUnread
                                                        ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-xs shadow-primary-500/30 border border-primary-400/40'
                                                        : 'bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 shadow-2xs'
                                                }`}
                                            >
                                                v{release.version}
                                            </div>

                                            {/* Title & Date */}
                                            <div className="min-w-0 flex-1">
                                                <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white leading-snug break-words">
                                                    {release.title || `Версия ${release.version}`}
                                                </h4>
                                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1">
                                                        <Calendar size={11} className="text-slate-400 shrink-0" aria-hidden="true" />
                                                        <span>{release.date}</span>
                                                    </span>
                                                    {isUnread && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-primary-500/15 text-primary-600 dark:text-primary-400 border border-primary-500/25">
                                                            <Sparkles size={9} className="animate-pulse" aria-hidden="true" />
                                                            <span>Новое</span>
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Toggle Expand Icon */}
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleExpandRelease(release.version);
                                            }}
                                            className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center shrink-0 transition-colors mt-0.5"
                                            aria-label={isExpanded ? 'Свернуть' : 'Развернуть'}
                                        >
                                            {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                                        </button>
                                    </div>

                                    {/* Card Content (Sections & Items) */}
                                    {isExpanded && (
                                        <div className="px-3.5 sm:px-4 pb-3.5 sm:pb-4 pt-1 space-y-3.5 border-t border-slate-100 dark:border-slate-800/70">
                                            {release.matchingSections.map((section, sIdx) => (
                                                <div key={sIdx} className="space-y-2">
                                                    {/* Section Type Badge & Title */}
                                                    <div className="flex items-center gap-2 flex-wrap pt-1">
                                                        <span
                                                            className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border shrink-0 ${getBadgeStyle(
                                                                section.type
                                                            )}`}
                                                        >
                                                            {getSectionIcon(section.type)}
                                                            <span>{getBadgeLabel(section.type)}</span>
                                                        </span>
                                                        {section.title && (
                                                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                                                {section.title}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Section Items */}
                                                    <ul className="space-y-1.5 pl-0.5">
                                                        {section.items.map((item, iIdx) => (
                                                            <li
                                                                key={iIdx}
                                                                className={`text-xs sm:text-sm flex items-start gap-2.5 leading-relaxed ${
                                                                    isUnread
                                                                        ? 'text-slate-900 dark:text-slate-100 font-medium'
                                                                        : 'text-slate-700 dark:text-slate-300 font-normal'
                                                                }`}
                                                            >
                                                                <span
                                                                    className={`rounded-full mt-[7px] shrink-0 ${
                                                                        isUnread
                                                                            ? 'w-2 h-2 bg-primary-500 shadow-xs shadow-primary-500/50 ring-2 ring-white dark:ring-slate-900'
                                                                            : 'w-1.5 h-1.5 bg-slate-400 dark:bg-slate-500'
                                                                    }`}
                                                                    aria-hidden="true"
                                                                />
                                                                <span className="flex-1 break-words">{item}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </React.Fragment>
                        );
                    })
                )}
            </div>
        </BaseModal>
    );
};
