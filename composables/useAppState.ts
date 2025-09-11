import { ref, watch, onMounted, onUnmounted } from 'vue';
import type { HeroList, GenerationResult } from '~/types';

// Mock data for initial state
const initialHeroLists: HeroList[] = [
  {
    id: 'base',
    name: 'Базовый набор',
    heroes: [
      { id: 'h1', name: 'Красная Шапочка' },
      { id: 'h2', name: 'Беовульф' },
      { id: 'h3', name: 'Король Артур' },
      { id: 'h4', name: 'Алиса' },
      { id: 'h5', name: 'Медуза' },
      { id: 'h6', name: 'Синдбад' },
    ],
  },
  {
    id: 'jurassic',
    name: 'Парк Юрского периода',
    heroes: [
        { id: 'h7', name: 'Роберт Малдун' },
        { id: 'h8', name: 'Инжен' },
        { id: 'h9', name: 'Рапторы' },
    ]
  },
];

// Using Nuxt's useState for singleton state
export const useAppState = () => {
  const heroLists = useState<HeroList[]>('heroLists', () => []);
  const activeListId = useState<string | null>('activeListId', () => null);
  const lastGeneration = useState<GenerationResult | null>('lastGeneration', () => null);
  const isOffline = useState<boolean>('isOffline', () => false);

  const updateOnlineStatus = () => {
    if (typeof window !== 'undefined') {
      isOffline.value = !navigator.onLine;
    }
  };

  onMounted(() => {
    // Load from localStorage on client-side
    if (process.client) {
      const savedLists = localStorage.getItem('heroLists');
      if (savedLists) {
        heroLists.value = JSON.parse(savedLists);
      } else {
        // If no saved lists, use initial mock data
        heroLists.value = initialHeroLists;
      }
      
      const savedLastGen = localStorage.getItem('lastGeneration');
      if (savedLastGen) {
        lastGeneration.value = JSON.parse(savedLastGen);
      }

      // Watch for changes and save to localStorage
      watch(heroLists, (newLists) => {
        localStorage.setItem('heroLists', JSON.stringify(newLists));
      }, { deep: true });

      watch(lastGeneration, (newGen) => {
        if (newGen) {
          localStorage.setItem('lastGeneration', JSON.stringify(newGen));
        } else {
          localStorage.removeItem('lastGeneration');
        }
      });

      // Handle online/offline status
      updateOnlineStatus();
      window.addEventListener('online', updateOnlineStatus);
      window.addEventListener('offline', updateOnlineStatus);
    }
  });

  onUnmounted(() => {
     if (process.client) {
        window.removeEventListener('online', updateOnlineStatus);
        window.removeEventListener('offline', updateOnlineStatus);
     }
  });

  return {
    heroLists,
    activeListId,
    lastGeneration,
    isOffline,
  };
};
