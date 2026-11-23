import { lazyWithPreload } from './lazyWithPreload';

// Wave 1: core offline screens
export const LazyResultOverlay = lazyWithPreload(() =>
  import('../components/ResultOverlay').then((m) => ({ default: m.ResultOverlay }))
);
export const LazyListsOverlay = lazyWithPreload(() =>
  import('../components/ListsOverlay').then((m) => ({ default: m.ListsOverlay }))
);
export const LazyStatsModal = lazyWithPreload(() =>
  import('../components/StatsModal').then((m) => ({ default: m.StatsModal }))
);
export const LazySettingsOverlay = lazyWithPreload(() =>
  import('../components/SettingsOverlay').then((m) => ({ default: m.SettingsOverlay }))
);

// Wave 2: secondary modals
export const LazyGroupStatsModal = lazyWithPreload(() =>
  import('../components/GroupStatsModal').then((m) => ({ default: m.GroupStatsModal }))
);
export const LazyAddHeroesModal = lazyWithPreload(() =>
  import('../components/AddHeroesModal').then((m) => ({ default: m.AddHeroesModal }))
);
export const LazyInactiveHeroesModal = lazyWithPreload(() =>
  import('../components/InactiveHeroesModal').then((m) => ({ default: m.InactiveHeroesModal }))
);
export const LazyChangelogOverlay = lazyWithPreload(() =>
  import('../components/ChangelogOverlay').then((m) => ({ default: m.ChangelogOverlay }))
);
export const LazyAvatarCropperModal = lazyWithPreload(() =>
  import('../components/common/AvatarCropperModal').then((m) => ({ default: m.AvatarCropperModal }))
);
export const LazyAdminModal = lazyWithPreload(() =>
  import('../components/AdminModal').then((m) => ({ default: m.AdminModal }))
);

const WAVE_1_SCREENS = [
  LazyResultOverlay,
  LazyListsOverlay,
  LazyStatsModal,
  LazySettingsOverlay,
];

const WAVE_2_SCREENS = [
  LazyGroupStatsModal,
  LazyAddHeroesModal,
  LazyInactiveHeroesModal,
  LazyChangelogOverlay,
  LazyAvatarCropperModal,
  LazyAdminModal,
];

export const preloadAllScreens = async (): Promise<void> => {
  await Promise.allSettled(WAVE_1_SCREENS.map((screen) => screen.preload()));
  await Promise.allSettled(WAVE_2_SCREENS.map((screen) => screen.preload()));
};
