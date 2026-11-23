/**
 * Centralized, type-safe wrapper over localStorage and sessionStorage.
 * Protects against SSR/non-browser environments, Safari private mode,
 * QuotaExceededError, and corrupted JSON payloads.
 */

export const STORAGE_KEYS = {
  // Theme & personalization
  THEME: 'theme',
  COLOR_SCHEME: 'colorScheme',
  THEME_ROUNDNESS: 'themeRoundness',
  THEME_BG_PATTERN: 'themeBgPattern',
  THEME_BG_GRADIENT: 'themeBgGradient',
  THEME_VARIABLES: 'themeVariables',

  // Lists & source selection
  LISTS: 'randomatched_lists_v1',
  SELECTED_LIST_ID: 'randomatched_selected_list_id',
  GROUP_MODE: 'randomatched_group_mode_v1',
  SELECTED_GROUP: 'randomatched_selected_group_v1',

  // Players & team history
  PLAYER_NAMES: 'randomatched_player_names_v1',
  SAVED_TEAMS: 'randomatched_saved_teams_v1',

  // Session & generator
  LAST_SESSION: 'randomatched_last_session_v1',
  GENERATION_MODE: 'randomatched_generation_mode_v1',
  EXTRA_MODE: 'randomatched_extra_mode_v1',
  PRIORITIZE_UNPLAYED: 'randomatched_prioritize_unplayed_v1',
  DEBUG_MODE: 'randomatched_debug_mode_v1',
  RESULT_VIEW_MODE: 'randomatched_result_view_mode',

  // Match history
  MATCH_HISTORY: 'randomatched_match_history_v1',
  DELETED_MATCHES: 'randomatched_deleted_matches_v1',
  DELETED_HISTORY_CONTENT: 'randomatched_deleted_history_content_v1',

  // Seasons
  SEASONS: 'randomatched_seasons_v1',
  DELETED_SEASONS: 'randomatched_deleted_seasons_v1',
  USER_DEFAULT_SEASON: 'randomatched_user_default_season_v1',

  // Avatars
  AVATARS_FALLBACK: 'randomatched_avatars_fallback',
  DELETED_AVATAR_KEYS: 'randomatched_deleted_avatar_keys_v1',

  // Haptics
  HAPTICS_ENABLED: 'randomatched_haptics_enabled_v1',
  HAPTICS_FORCE_AUDIO: 'randomatched_haptics_force_audio_v1',

  // System flags
  HAS_AUTO_SYNCED: 'randomatched_has_auto_synced',
  LAST_SEEN_VERSION: 'randomatched_last_seen_version',
  CLIENT_ID: 'randomatched_client_id',
  MERGE_IGNORED_GROUPS: 'randomatched_merge_ignored_groups',
} as const;

export const SESSION_STORAGE_KEYS = {
  JUST_UPDATED: 'randomatched_just_updated',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
export type SessionStorageKey = (typeof SESSION_STORAGE_KEYS)[keyof typeof SESSION_STORAGE_KEYS];

function hasLocalStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function hasSessionStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

export function getStorageItem(key: string): string | null {
  if (!hasLocalStorage()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch (e) {
    console.warn(`[storage] Failed to read localStorage key "${key}":`, e);
    return null;
  }
}

export function setStorageItem(key: string, value: string): boolean {
  if (!hasLocalStorage()) return false;
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (e) {
    console.warn(`[storage] Failed to write localStorage key "${key}":`, e);
    return false;
  }
}

export function removeStorageItem(key: string): boolean {
  if (!hasLocalStorage()) return false;
  try {
    window.localStorage.removeItem(key);
    return true;
  } catch (e) {
    console.warn(`[storage] Failed to remove localStorage key "${key}":`, e);
    return false;
  }
}

export function getStorageJSON<T>(key: string, fallback: T): T {
  const raw = getStorageItem(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch (e) {
    console.warn(`[storage] Failed to parse JSON from localStorage key "${key}":`, e);
    return fallback;
  }
}

export function setStorageJSON<T>(key: string, value: T): boolean {
  try {
    const serialized = JSON.stringify(value);
    return setStorageItem(key, serialized);
  } catch (e) {
    console.warn(`[storage] Failed to serialize JSON for localStorage key "${key}":`, e);
    return false;
  }
}

export function getStorageSnapshot(): Array<{ key: string; value: string }> {
  if (!hasLocalStorage()) return [];
  try {
    const entries: Array<{ key: string; value: string }> = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key !== null) {
        entries.push({
          key,
          value: getStorageItem(key) || '',
        });
      }
    }
    return entries;
  } catch (e) {
    console.warn('[storage] Failed to read localStorage snapshot:', e);
    return [];
  }
}

export function getSessionItem(key: string): string | null {
  if (!hasSessionStorage()) return null;
  try {
    return window.sessionStorage.getItem(key);
  } catch (e) {
    console.warn(`[storage] Failed to read sessionStorage key "${key}":`, e);
    return null;
  }
}

export function setSessionItem(key: string, value: string): boolean {
  if (!hasSessionStorage()) return false;
  try {
    window.sessionStorage.setItem(key, value);
    return true;
  } catch (e) {
    console.warn(`[storage] Failed to write sessionStorage key "${key}":`, e);
    return false;
  }
}

export function removeSessionItem(key: string): boolean {
  if (!hasSessionStorage()) return false;
  try {
    window.sessionStorage.removeItem(key);
    return true;
  } catch (e) {
    console.warn(`[storage] Failed to remove sessionStorage key "${key}":`, e);
    return false;
  }
}
