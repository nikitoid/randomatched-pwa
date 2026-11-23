import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  STORAGE_KEYS,
  SESSION_STORAGE_KEYS,
  getStorageItem,
  setStorageItem,
  removeStorageItem,
  getStorageJSON,
  setStorageJSON,
  getStorageSnapshot,
  getSessionItem,
  setSessionItem,
  removeSessionItem,
} from '../../utils/storage';

describe('utils/storage', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('keeps critical localStorage and sessionStorage keys unchanged', () => {
    expect(STORAGE_KEYS.THEME).toBe('theme');
    expect(STORAGE_KEYS.COLOR_SCHEME).toBe('colorScheme');
    expect(STORAGE_KEYS.LISTS).toBe('randomatched_lists_v1');
    expect(STORAGE_KEYS.MATCH_HISTORY).toBe('randomatched_match_history_v1');
    expect(STORAGE_KEYS.SEASONS).toBe('randomatched_seasons_v1');
    expect(STORAGE_KEYS.AVATARS_FALLBACK).toBe('randomatched_avatars_fallback');
    expect(SESSION_STORAGE_KEYS.JUST_UPDATED).toBe('randomatched_just_updated');
  });

  it('reads, writes, snapshots, and removes localStorage & sessionStorage items', () => {
    expect(setStorageItem('k1', 'v1')).toBe(true);
    expect(getStorageItem('k1')).toBe('v1');
    expect(getStorageSnapshot()).toEqual([{ key: 'k1', value: 'v1' }]);
    expect(removeStorageItem('k1')).toBe(true);
    expect(getStorageItem('k1')).toBeNull();

    expect(setSessionItem('sk1', 'sv1')).toBe(true);
    expect(getSessionItem('sk1')).toBe('sv1');
    expect(removeSessionItem('sk1')).toBe(true);
    expect(getSessionItem('sk1')).toBeNull();
  });

  it('handles JSON serialization, missing keys, and corrupted JSON safely', () => {
    const fallback = { ok: false };
    expect(getStorageJSON('missing', fallback)).toBe(fallback);

    expect(setStorageJSON('obj', { a: 1, b: [2, 3] })).toBe(true);
    expect(getStorageJSON('obj', fallback)).toEqual({ a: 1, b: [2, 3] });

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.setItem('broken', '{not valid json');
    expect(getStorageJSON('broken', fallback)).toBe(fallback);
    expect(warnSpy).toHaveBeenCalled();

    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(setStorageJSON('circular', circular)).toBe(false);
  });

  it('gracefully handles QuotaExceededError on setItem', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });

    expect(setStorageItem('heavy', 'payload')).toBe(false);
    expect(warnSpy).toHaveBeenCalled();
  });
});
