import AsyncStorage from '@react-native-async-storage/async-storage';

import { applyGameSummary, EMPTY_STATS, sanitizeStats, winRate, type GameSummary } from '@/features/stats/stats';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  loadStats,
  mergePlayedWords,
  saveSettings,
  saveStats,
} from '@/services/storage';

const summary = (overrides: Partial<GameSummary> = {}): GameSummary => ({
  id: 'g1',
  date: '2026-01-01T00:00:00.000Z',
  difficulty: 'medium',
  outcome: 'player',
  score: 120,
  computerScore: 60,
  roundsWon: 2,
  roundsLost: 1,
  validWords: 8,
  totalMoves: 15,
  accuracy: 80,
  longestWord: 'lamp',
  ...overrides,
});

describe('stats', () => {
  it('records wins, streaks and best scores per difficulty', () => {
    let s = applyGameSummary(EMPTY_STATS, summary());
    s = applyGameSummary(s, summary({ id: 'g2', score: 90 }));
    expect(s).toMatchObject({ gamesCompleted: 2, wins: 2, currentStreak: 2, bestStreak: 2, bestScore: 120 });
    expect(s.bestScoreByDifficulty.medium).toBe(120);
    expect(s.bestScoreByDifficulty.hard).toBe(0);
    s = applyGameSummary(s, summary({ id: 'g3', outcome: 'computer', score: 10, difficulty: 'hard' }));
    expect(s).toMatchObject({ losses: 1, currentStreak: 0, bestStreak: 2 });
    expect(s.bestScoreByDifficulty.hard).toBe(10);
    s = applyGameSummary(s, summary({ id: 'g4', outcome: 'draw', longestWord: 'plank' }));
    expect(s).toMatchObject({ draws: 1, longestWord: 'plank', totalValidWords: 32 });
    expect(winRate(s)).toBe(50);
    expect(s.recent.map((r) => r.id)).toEqual(['g4', 'g3', 'g2', 'g1']);
  });

  it('sanitizes corrupt or partial saved data', () => {
    expect(sanitizeStats(null)).toEqual(EMPTY_STATS);
    expect(sanitizeStats({ wins: 'x', bestScore: 5 })).toMatchObject({ wins: 0, bestScore: 5 });
  });
});

describe('storage', () => {
  beforeEach(() => AsyncStorage.clear());

  it('round-trips settings and stats', async () => {
    await saveSettings({ ...DEFAULT_SETTINGS, soundEnabled: false, lastDifficulty: 'hard' });
    expect(await loadSettings()).toMatchObject({ soundEnabled: false, lastDifficulty: 'hard' });
    const stats = applyGameSummary(EMPTY_STATS, summary());
    await saveStats(stats);
    expect(await loadStats()).toEqual(stats);
  });

  it('falls back to defaults on corrupt JSON or storage errors', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await AsyncStorage.setItem('chalkrush:v1:settings', '{not json');
    expect(await loadSettings()).toEqual(DEFAULT_SETTINGS);
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('disk'));
    expect(await loadStats()).toEqual(EMPTY_STATS);
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('full'));
    expect(await saveStats(EMPTY_STATS)).toBe(false);
    warn.mockRestore();
  });

  it('merges played words without duplicates', () => {
    expect(mergePlayedWords(['cat', 'cot'], ['cot', 'dot'])).toEqual(['cat', 'cot', 'dot']);
  });
});
