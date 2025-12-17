import { HeroList } from './types';

export const DEFAULT_HEROES: string[] = [
  "Медуза",
  "Синдбад",
  "Алиса",
  "Бигфут",
  "Король Артур",
  "Дракула",
  "Шерлок Холмс",
  "Джекил и Хайд",
  "Человек-невидимка",
  "Брюс Ли"
];

export const PRESET_LISTS: HeroList[] = [
  {
    id: 'default',
    name: 'Базовый набор и Том 1 (Демо)',
    heroes: DEFAULT_HEROES,
    isLocal: true,
    lastModified: Date.now()
  }
];