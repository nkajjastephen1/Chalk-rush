import type { Dictionary } from '@/data/dictionary';
import type { DifficultyConfig } from '@/data/difficulty';
import { legalMoves } from '@/features/game/validation';
import { pickRandom, type Rng } from '@/utils/random';

import type { Task } from './scheduler';
import { searchBestMove } from './search';

export interface ComputerTurnInput {
  dictionary: Dictionary;
  currentWord: string;
  usedWords: readonly string[];
  config: DifficultyConfig;
  /** Moves left before the round's move cap (including the computer's move). */
  movesLeft: number;
  rng: Rng;
  now?: () => number;
}

/** Legal moves the computer knows at this difficulty (its vocabulary is tier-limited). */
export function computerCandidates(input: Pick<ComputerTurnInput, 'dictionary' | 'currentWord' | 'usedWords' | 'config'>) {
  return legalMoves(input.dictionary, input.currentWord, input.usedWords, input.config.aiVocabularyMaxTier);
}

/**
 * Simple: a random familiar word. No lookahead at all — this is intentionally weak.
 */
function* casualMove(input: ComputerTurnInput): Task<string | null> {
  const candidates = computerCandidates(input);
  yield;
  return pickRandom(candidates, input.rng) ?? null;
}

/**
 * Medium: one full move of lookahead.
 *   1. Take a move that leaves the player with no reply, if one exists.
 *   2. Otherwise discard moves where some player reply leaves the computer stuck.
 *   3. Pick among the remaining moves, favouring ones that leave the player fewer replies.
 */
function* lookaheadMove(input: ComputerTurnInput): Task<string | null> {
  const { dictionary, rng } = input;
  const candidates = computerCandidates(input);
  if (candidates.length === 0) return null;
  const used = new Set(input.usedWords);
  used.add(input.currentWord);

  const evaluated: { word: string; replies: number; safe: boolean }[] = [];
  for (const word of candidates) {
    used.add(word);
    const replies = legalMoves(dictionary, word, used);
    if (replies.length === 0 && input.movesLeft > 1) {
      used.delete(word);
      return word;
    }
    let safe = true;
    for (const reply of replies) {
      used.add(reply);
      const counter = legalMoves(dictionary, reply, used, input.config.aiVocabularyMaxTier);
      used.delete(reply);
      if (counter.length === 0) {
        safe = false;
        break;
      }
    }
    used.delete(word);
    evaluated.push({ word, replies: replies.length, safe });
    yield;
  }

  const safe = evaluated.filter((e) => e.safe);
  const pool = safe.length > 0 ? safe : evaluated;
  pool.sort((a, b) => a.replies - b.replies);
  // Choose randomly from the better half so play stays varied but sensible.
  const top = pool.slice(0, Math.max(1, Math.ceil(pool.length / 2)));
  return pickRandom(top, rng)?.word ?? null;
}

/** Hard and Advanced: alpha-beta search with different depth and budget limits. */
function* searchMove(input: ComputerTurnInput): Task<string | null> {
  const { config } = input;
  const result = yield* searchBestMove({
    dictionary: input.dictionary,
    word: input.currentWord,
    used: new Set(input.usedWords),
    aiMaxTier: config.aiVocabularyMaxTier,
    opponentMaxTier: config.playerModelMaxTier,
    movesLeft: input.movesLeft,
    maxDepth: config.searchDepth,
    nodeBudget: config.searchNodeBudget,
    timeBudgetMs: config.searchTimeMs,
    rng: input.rng,
    now: input.now,
  });
  return result.move;
}

/** Returns the computer's chosen word, or null when it knows no legal move. */
export function chooseComputerMove(input: ComputerTurnInput): Task<string | null> {
  switch (input.config.aiStrategy) {
    case 'casual':
      return casualMove(input);
    case 'lookahead':
      return lookaheadMove(input);
    case 'minimax':
    case 'deep':
      return searchMove(input);
  }
}
