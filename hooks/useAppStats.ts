import { Hero, HeroList } from '../types';
import { RANKS } from '../constants';

export const useAppStats = (
  isGroupMode: boolean,
  selectedGroupIds: Set<string>,
  lists: HeroList[],
  activeList?: HeroList
) => {
  const getRankBarColor = (rank: string) => {
    if (rank === 'S+') return 'bg-yellow-500 dark:bg-yellow-500';
    if (rank === 'S-') return 'bg-yellow-400 dark:bg-yellow-400';
    if (rank.startsWith('S')) return 'bg-yellow-500 dark:bg-yellow-500';

    if (rank === 'A+') return 'bg-violet-600 dark:bg-violet-600';
    if (rank === 'A-') return 'bg-violet-500 dark:bg-violet-500';
    if (rank.startsWith('A')) return 'bg-violet-600 dark:bg-violet-600';

    if (rank === 'B+') return 'bg-blue-600 dark:bg-blue-600';
    if (rank === 'B-') return 'bg-blue-500 dark:bg-blue-500';
    if (rank.startsWith('B')) return 'bg-blue-600 dark:bg-blue-600';

    if (rank === 'C+') return 'bg-green-600 dark:bg-green-600';
    if (rank === 'C-') return 'bg-green-500 dark:bg-green-500';
    if (rank.startsWith('C')) return 'bg-green-600 dark:bg-green-600';

    if (rank === 'D+') return 'bg-slate-300 dark:bg-slate-200';
    if (rank === 'D-') return 'bg-slate-200 dark:bg-slate-300';
    if (rank.startsWith('D')) return 'bg-slate-300 dark:bg-slate-200';

    if (rank === 'E+') return 'bg-gray-600 dark:bg-gray-500';
    if (rank === 'E-') return 'bg-gray-500 dark:bg-gray-600';
    if (rank.startsWith('E')) return 'bg-gray-600 dark:bg-gray-500';

    return 'bg-slate-200 dark:bg-slate-700'; 
  };

  const getSelectionStats = () => {
    let targetHeroes: Hero[] = [];
    
    // Helper to get unique heroes locally within the hook if needed, 
    // or we can rely on the passed data. 
    // For now, let's implement the logic directly matching App.tsx
    
    if (isGroupMode) {
        const targetLists = lists.filter(l => selectedGroupIds.has(l.id));
        // We need a way to get unique heroes. 
        // In App.tsx it imported getUniqueHeroesFromLists from utils/generator.
        // We should probably export that logic or just do it here. 
        // For better separation, let's assume we can import it.
        // I will add the import at the top later once I confirm the file path.
        // Actually, let's duplicate the simple logic or import it.
        const allHeroes = targetLists.flatMap(l => l.heroes);
        const uniqueMap = new Map();
        allHeroes.forEach(h => uniqueMap.set(h.id, h));
        targetHeroes = Array.from(uniqueMap.values());
    } else {
        if (activeList) targetHeroes = activeList.heroes;
    }

    const counts: Record<string, number> = {};
    targetHeroes.forEach(h => {
        if (h.rank) counts[h.rank] = (counts[h.rank] || 0) + 1;
    });
    const max = Math.max(...Object.values(counts), 1);
    return { counts, max, total: targetHeroes.length };
  };

  return {
    getRankBarColor,
    getSelectionStats
  };
};
