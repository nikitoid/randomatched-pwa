import React, { useState, useEffect } from 'react';
import { useTheme } from './hooks/useTheme';
import { useHeroLists } from './hooks/useHeroLists';
import { ThemeToggle } from './components/ThemeToggle';
import { ResultOverlay } from './components/ResultOverlay';
import { SettingsOverlay } from './components/SettingsOverlay';
import { AssignedPlayer } from './types';
import { Dice5, Shuffle, Users, Settings } from 'lucide-react';

const App: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { lists, addList, updateList, deleteList, isLoaded } = useHeroLists();
  
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [assignments, setAssignments] = useState<AssignedPlayer[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Initialize selectedListId when lists are loaded or modified
  useEffect(() => {
    if (isLoaded && lists.length > 0) {
      // If currently selected list doesn't exist anymore, select the first one
      const exists = lists.find(l => l.id === selectedListId);
      if (!exists) {
        setSelectedListId(lists[0].id);
      }
    } else if (isLoaded && lists.length === 0) {
        setSelectedListId('');
    }
  }, [lists, isLoaded, selectedListId]);
  
  const handleGenerate = () => {
    const list = lists.find(l => l.id === selectedListId);
    if (!list) return;

    if (list.heroes.length < 4) {
      alert("В списке должно быть минимум 4 героя.");
      return;
    }

    setIsAnimating(true);

    // Short delay for button feedback before calculation
    setTimeout(() => {
      // 1. Shuffle Heroes
      const shuffledHeroes = [...list.heroes]
        .sort(() => 0.5 - Math.random())
        .slice(0, 4);

      // 2. Shuffle Player Numbers (1-4)
      const playerNumbers = [1, 2, 3, 4].sort(() => 0.5 - Math.random());

      // 3. Assign Positions (Fixed relative to the table layout)
      const positions: ('bottom' | 'top' | 'left' | 'right')[] = ['bottom', 'top', 'left', 'right'];

      const newAssignments: AssignedPlayer[] = shuffledHeroes.map((hero, index) => {
        const pNum = playerNumbers[index];
        return {
          hero,
          playerNumber: pNum,
          position: positions[index],
          team: pNum % 2 === 0 ? 'Even' : 'Odd' // Even = Team 2, Odd = Team 1
        };
      });

      setAssignments(newAssignments);
      setIsAnimating(false);
      setShowResult(true);
    }, 400);
  };

  return (
    <div className="relative min-h-screen flex flex-col transition-colors duration-300">
      
      {/* Header / Top Bar */}
      <header className="px-6 py-6 flex justify-between items-center bg-white dark:bg-slate-900 shadow-sm z-10">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-2 rounded-lg">
             <Dice5 className="text-white w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Random<span className="text-indigo-600 dark:text-indigo-400">atched</span>
          </h1>
        </div>
        <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 gap-8 max-w-md mx-auto w-full">
        
        {/* Intro Text */}
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
            Генератор команд 2 на 2
          </h2>
          <p className="text-slate-500 dark:text-slate-400">
            Выберите список героев и создайте случайные команды для вашей следующей битвы в Unmatched.
          </p>
        </div>

        {/* Controls Card */}
        <div className="w-full bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 space-y-6">
          
          {/* List Selector */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Выберите список героев
            </label>
            <div className="flex gap-2">
                <div className="relative flex-1">
                <select 
                    value={selectedListId}
                    onChange={(e) => setSelectedListId(e.target.value)}
                    disabled={lists.length === 0}
                    className="w-full appearance-none bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 pr-8 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow disabled:opacity-50"
                >
                    {lists.length === 0 ? (
                        <option>Нет списков</option>
                    ) : (
                        lists.map(list => (
                            <option key={list.id} value={list.id}>{list.name}</option>
                        ))
                    )}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                    <Users size={18} />
                </div>
                </div>
                
                {/* Settings Button */}
                <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="p-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    aria-label="Настройки списков"
                >
                    <Settings size={22} />
                </button>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 px-1">
               {lists.find(l => l.id === selectedListId)?.isLocal ? 'Локальный список' : 'Системный список'}
            </p>
          </div>

          {/* Action Button */}
          <button
            onClick={handleGenerate}
            disabled={isAnimating || !selectedListId || lists.length === 0}
            className={`w-full group relative overflow-hidden rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg py-4 shadow-indigo-500/30 shadow-lg transition-all active:scale-[0.98] ${isAnimating || !selectedListId ? 'opacity-80 grayscale' : ''}`}
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {isAnimating ? (
                <>Генерация...</>
              ) : (
                <>
                  <Shuffle className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                  Сгенерировать команды
                </>
              )}
            </span>
            {/* Simple sheen effect */}
            <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 group-hover:animate-shine" />
          </button>
        </div>

        {/* Footer info */}
        <div className="text-center text-xs text-slate-400 dark:text-slate-600">
          <p>Пары 1 и 3 против 2 и 4</p>
          <p>Четные номера играют против нечетных.</p>
        </div>
      </main>

      {/* Fullscreen Overlay */}
      <ResultOverlay 
        isOpen={showResult} 
        onClose={() => setShowResult(false)} 
        assignments={assignments} 
      />

      {/* Settings Overlay */}
      <SettingsOverlay
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        lists={lists}
        onAddList={addList}
        onUpdateList={updateList}
        onDeleteList={deleteList}
      />
    </div>
  );
};

export default App;