import React from 'react';
import { Shield, Trophy, Swords, Skull, Zap, HelpCircle } from 'lucide-react';
import { BaseModal } from '../common/BaseModal';
import { ALL_RANK_TIERS_INFO, XP_PER_WIN, XP_PER_LOSS, XP_PER_KILL, BASE_XP_PER_LEVEL, XP_GROWTH_PER_LEVEL } from '../../utils/playerLevel';

interface RanksInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const RanksInfoModal: React.FC<RanksInfoModalProps> = ({ isOpen, onClose }) => {
    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="Система Рангов и Опыта"
            subtitle="Информация об уровнях, званиях и формуле начисления XP"
            icon={<Shield className="text-amber-500" size={22} />}
            maxWidth="md"
            priority={35}
            modalId="ranks-info-modal"
        >
            <div className="space-y-5">
                {/* XP Rules Breakdown */}
                <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5 px-0.5">
                        Как начисляется Опыт (XP)
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                        <div className="p-3 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 text-center flex flex-col items-center justify-between">
                            <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-1">
                                <Trophy size={15} />
                            </div>
                            <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Победа</div>
                            <div className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5">+{XP_PER_WIN} XP</div>
                        </div>

                        <div className="p-3 rounded-2xl bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/20 text-center flex flex-col items-center justify-between">
                            <div className="w-7 h-7 rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-1">
                                <Swords size={15} />
                            </div>
                            <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Матч</div>
                            <div className="text-sm font-black text-blue-600 dark:text-blue-400 mt-0.5">+{XP_PER_LOSS} XP</div>
                        </div>

                        <div className="p-3 rounded-2xl bg-rose-500/10 dark:bg-rose-500/15 border border-rose-500/20 text-center flex flex-col items-center justify-between">
                            <div className="w-7 h-7 rounded-xl bg-rose-500/20 text-rose-500 flex items-center justify-center mb-1">
                                <Skull size={15} />
                            </div>
                            <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Фраг</div>
                            <div className="text-sm font-black text-rose-500 mt-0.5">+{XP_PER_KILL} XP</div>
                        </div>
                    </div>

                    <div className="mt-2.5 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex items-center gap-2">
                        <Zap size={14} className="text-amber-500 shrink-0" />
                        <span>С каждым уровнем требуемый опыт увеличивается на <strong className="text-slate-900 dark:text-white font-bold">+{XP_GROWTH_PER_LEVEL} XP</strong> (LVL 1 → {BASE_XP_PER_LEVEL} XP, LVL 2 → {BASE_XP_PER_LEVEL + XP_GROWTH_PER_LEVEL} XP, LVL 3 → {BASE_XP_PER_LEVEL + 2 * XP_GROWTH_PER_LEVEL} XP и т.д.).</span>
                    </div>
                </div>

                {/* All Rank Tiers Table */}
                <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5 px-0.5">
                        Все звания и ранги
                    </h4>

                    <div className="space-y-2">
                        {ALL_RANK_TIERS_INFO.map((tier) => (
                            <div
                                key={tier.name}
                                className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${tier.bgClass} ${tier.borderClass}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`px-2.5 py-1 rounded-xl text-xs font-black bg-gradient-to-r ${tier.badgeBg} shadow-xs shrink-0`}>
                                        {tier.levelRange}
                                    </div>
                                    <div>
                                        <div className={`text-sm font-black ${tier.textClass}`}>
                                            {tier.name}
                                        </div>
                                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                            Требуется: {tier.xpRange}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </BaseModal>
    );
};
