import type { Difficulty, RoundOutcome } from '@/types/game';

export interface GameSummary {
  id: string;
  date: string;
  difficulty: Difficulty;
  outcome: RoundOutcome;
  score: number;
  computerScore: number;
  roundsWon: number;
  roundsLost: number;
  validWords: number;
  totalMoves: number;
  accuracy: number;
  longestWord: string;
}

export interface PlayerStats {
  gamesCompleted: number;
  wins: number;
  losses: number;
  draws: number;
  currentStreak: number;
  bestStreak: number;
  bestScore: number;
  bestScoreByDifficulty: Record<Difficulty, number>;
  longestWord: string;
  totalValidWords: number;
  recent: GameSummary[];
}

export const MAX_RECENT = 20;

export const EMPTY_STATS: PlayerStats = {
  gamesCompleted: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  currentStreak: 0,
  bestStreak: 0,
  bestScore: 0,
  bestScoreByDifficulty: { simple: 0, medium: 0, hard: 0, advanced: 0 },
  longestWord: '',
  totalValidWords: 0,
  recent: [],
};

export function longestOf(words: readonly string[]): string {
  return words.reduce((best, w) => (w.length > best.length ? w : best), '');
}

/** Pure stats update; the streak counts consecutive wins and resets on a loss or draw. */
export function applyGameSummary(stats: PlayerStats, summary: GameSummary): PlayerStats {
  const won = summary.outcome === 'player';
  const lost = summary.outcome === 'computer';
  const currentStreak = won ? stats.currentStreak + 1 : 0;
  const prevBest = stats.bestScoreByDifficulty[summary.difficulty] ?? 0;
  return {
    gamesCompleted: stats.gamesCompleted + 1,
    wins: stats.wins + (won ? 1 : 0),
    losses: stats.losses + (lost ? 1 : 0),
    draws: stats.draws + (!won && !lost ? 1 : 0),
    currentStreak,
    bestStreak: Math.max(stats.bestStreak, currentStreak),
    bestScore: Math.max(stats.bestScore, summary.score),
    bestScoreByDifficulty: {
      ...stats.bestScoreByDifficulty,
      [summary.difficulty]: Math.max(prevBest, summary.score),
    },
    longestWord:
      summary.longestWord.length > stats.longestWord.length ? summary.longestWord : stats.longestWord,
    totalValidWords: stats.totalValidWords + summary.validWords,
    recent: [summary, ...stats.recent].slice(0, MAX_RECENT),
  };
}

export function winRate(stats: PlayerStats): number {
  if (stats.gamesCompleted === 0) return 0;
  return Math.round((stats.wins / stats.gamesCompleted) * 100);
}

/** Merges possibly-partial stored data with defaults so older saves keep working. */
export function sanitizeStats(raw: unknown): PlayerStats {
  if (!raw || typeof raw !== 'object') return EMPTY_STATS;
  const r = raw as Partial<PlayerStats>;
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  return {
    gamesCompleted: num(r.gamesCompleted),
    wins: num(r.wins),
    losses: num(r.losses),
    draws: num(r.draws),
    currentStreak: num(r.currentStreak),
    bestStreak: num(r.bestStreak),
    bestScore: num(r.bestScore),
    bestScoreByDifficulty: {
      simple: num(r.bestScoreByDifficulty?.simple),
      medium: num(r.bestScoreByDifficulty?.medium),
      hard: num(r.bestScoreByDifficulty?.hard),
      advanced: num(r.bestScoreByDifficulty?.advanced),
    },
    longestWord: typeof r.longestWord === 'string' ? r.longestWord : '',
    totalValidWords: num(r.totalValidWords),
    recent: Array.isArray(r.recent) ? r.recent.slice(0, MAX_RECENT) : [],
  };
}
