import AsyncStorage from '@react-native-async-storage/async-storage';

import { isDifficulty } from '@/data/difficulty';
import { EMPTY_STATS, sanitizeStats, type PlayerStats } from '@/features/stats/stats';
import type { Difficulty } from '@/types/game';
import type { LetterCase } from '@/utils/word';

const KEYS = {
  settings: 'chalkrush:v1:settings',
  stats: 'chalkrush:v1:stats',
  playedWords: 'chalkrush:v1:playedWords',
} as const;

/** Cap on remembered words for the new-word bonus, to bound storage size. */
const MAX_PLAYED_WORDS = 5000;

export interface Settings {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  countdownEnabled: boolean;
  /** 'system' follows the OS reduce-motion setting. */
  reduceMotion: 'system' | 'on' | 'off';
  /** How letters are shown on the board, keyboard and word lists. */
  letterCase: LetterCase;
  lastDifficulty: Difficulty;
}

export const DEFAULT_SETTINGS: Settings = {
  soundEnabled: true,
  hapticsEnabled: true,
  countdownEnabled: true,
  reduceMotion: 'system',
  letterCase: 'upper',
  lastDifficulty: 'simple',
};

async function readJson(key: string): Promise<unknown> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.warn(`[storage] failed to read ${key}`, err);
    return null;
  }
}

async function writeJson(key: string, value: unknown): Promise<boolean> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.warn(`[storage] failed to write ${key}`, err);
    return false;
  }
}

export async function loadSettings(): Promise<Settings> {
  const raw = (await readJson(KEYS.settings)) as Partial<Settings> | null;
  if (!raw || typeof raw !== 'object') return DEFAULT_SETTINGS;
  return {
    soundEnabled: typeof raw.soundEnabled === 'boolean' ? raw.soundEnabled : DEFAULT_SETTINGS.soundEnabled,
    hapticsEnabled:
      typeof raw.hapticsEnabled === 'boolean' ? raw.hapticsEnabled : DEFAULT_SETTINGS.hapticsEnabled,
    countdownEnabled:
      typeof raw.countdownEnabled === 'boolean' ? raw.countdownEnabled : DEFAULT_SETTINGS.countdownEnabled,
    reduceMotion:
      raw.reduceMotion === 'on' || raw.reduceMotion === 'off' || raw.reduceMotion === 'system'
        ? raw.reduceMotion
        : DEFAULT_SETTINGS.reduceMotion,
    letterCase: raw.letterCase === 'lower' || raw.letterCase === 'upper' ? raw.letterCase : DEFAULT_SETTINGS.letterCase,
    lastDifficulty: isDifficulty(raw.lastDifficulty) ? raw.lastDifficulty : DEFAULT_SETTINGS.lastDifficulty,
  };
}

export const saveSettings = (settings: Settings) => writeJson(KEYS.settings, settings);

export async function loadStats(): Promise<PlayerStats> {
  return sanitizeStats(await readJson(KEYS.stats));
}

export const saveStats = (stats: PlayerStats) => writeJson(KEYS.stats, stats);

export async function resetStats(): Promise<PlayerStats> {
  try {
    await AsyncStorage.multiRemove([KEYS.stats, KEYS.playedWords]);
  } catch (err) {
    console.warn('[storage] failed to reset stats', err);
  }
  return EMPTY_STATS;
}

export async function loadPlayedWords(): Promise<string[]> {
  const raw = await readJson(KEYS.playedWords);
  return Array.isArray(raw) ? raw.filter((w): w is string => typeof w === 'string') : [];
}

export function mergePlayedWords(existing: readonly string[], added: readonly string[]): string[] {
  const set = new Set(existing);
  for (const w of added) set.add(w);
  const all = [...set];
  return all.length > MAX_PLAYED_WORDS ? all.slice(all.length - MAX_PLAYED_WORDS) : all;
}

export const savePlayedWords = (words: readonly string[]) => writeJson(KEYS.playedWords, words);
