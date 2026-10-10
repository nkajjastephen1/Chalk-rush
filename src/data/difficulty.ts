import type { Difficulty, WordTier } from '@/types/game';

export type AiStrategy = 'casual' | 'lookahead' | 'minimax' | 'deep';

export interface DifficultyConfig {
  id: Difficulty;
  label: string;
  tagline: string;
  description: string;
  /** 1–4, shown as a difficulty meter. */
  level: number;
  /** Possible word lengths for starting words. */
  wordLengths: readonly number[];
  rounds: number;
  /** Total moves (both players) before a round is declared a draw. */
  maxMovesPerRound: number;
  hints: number;
  /** Rarest word tier the computer knows. The player may always use the full dictionary. */
  aiVocabularyMaxTier: WordTier;
  /**
   * Opponent model used by the search: the rarest tier the computer expects the player to find.
   * Positions where the player's only escapes are rarer words count as traps.
   */
  playerModelMaxTier: WordTier;
  aiStrategy: AiStrategy;
  /** Max plies for minimax / iterative deepening. */
  searchDepth: number;
  /** Wall-clock budget for the search in ms (cooperatively scheduled, never blocks the UI). */
  searchTimeMs: number;
  /** Hard cap on searched positions. */
  searchNodeBudget: number;
  /** Starting words must have at least this many legal moves. */
  startMinNeighbors: number;
  /** Minimum time the computer "thinks" so its move is readable. */
  computerThinkMs: number;
}

export const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  simple: {
    id: 'simple',
    label: 'Simple',
    tagline: 'Friendly 3-letter warm-up',
    description:
      'Three-letter words. The computer only knows common words and picks one at random. Plenty of hints.',
    level: 1,
    wordLengths: [3],
    rounds: 3,
    maxMovesPerRound: 12,
    hints: 5,
    aiVocabularyMaxTier: 1,
    playerModelMaxTier: 3,
    aiStrategy: 'casual',
    searchDepth: 0,
    searchTimeMs: 0,
    searchNodeBudget: 0,
    startMinNeighbors: 10,
    computerThinkMs: 900,
  },
  medium: {
    id: 'medium',
    label: 'Medium',
    tagline: 'Four letters, a careful rival',
    description:
      'Four-letter words. The computer looks one move ahead: it grabs immediate wins and avoids walking into traps.',
    level: 2,
    wordLengths: [4],
    rounds: 3,
    maxMovesPerRound: 16,
    hints: 3,
    aiVocabularyMaxTier: 2,
    playerModelMaxTier: 3,
    aiStrategy: 'lookahead',
    searchDepth: 2,
    searchTimeMs: 600,
    searchNodeBudget: 20000,
    startMinNeighbors: 8,
    computerThinkMs: 800,
  },
  hard: {
    id: 'hard',
    label: 'Hard',
    tagline: 'Minimax search, full vocabulary',
    description:
      'Four- and five-letter words. A 4-ply minimax search steers you toward words whose only escapes are rare.',
    level: 3,
    wordLengths: [4, 5],
    rounds: 3,
    maxMovesPerRound: 20,
    hints: 2,
    aiVocabularyMaxTier: 3,
    playerModelMaxTier: 2,
    aiStrategy: 'minimax',
    searchDepth: 4,
    searchTimeMs: 1200,
    searchNodeBudget: 60000,
    startMinNeighbors: 6,
    computerThinkMs: 700,
  },
  advanced: {
    id: 'advanced',
    label: 'Advanced',
    tagline: 'Deep search, no mercy',
    description:
      'Five-letter words. Deep iterative alpha-beta search hunts for forced wins across the word graph within a time budget.',
    level: 4,
    wordLengths: [5],
    rounds: 3,
    maxMovesPerRound: 24,
    hints: 1,
    aiVocabularyMaxTier: 3,
    playerModelMaxTier: 2,
    aiStrategy: 'deep',
    searchDepth: 14,
    searchTimeMs: 2000,
    searchNodeBudget: 250000,
    startMinNeighbors: 5,
    computerThinkMs: 600,
  },
};

export const DIFFICULTY_ORDER: readonly Difficulty[] = ['simple', 'medium', 'hard', 'advanced'];

export function isDifficulty(value: unknown): value is Difficulty {
  return typeof value === 'string' && value in DIFFICULTIES;
}
