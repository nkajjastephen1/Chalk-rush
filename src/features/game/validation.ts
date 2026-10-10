import type { Dictionary } from '@/data/dictionary';
import type { InvalidReason, ValidationResult, WordTier } from '@/types/game';
import { diffPositions, isAlphabetic, normalizeWord } from '@/utils/word';

export type UsedWords = ReadonlySet<string> | readonly string[];

function isUsed(used: UsedWords, word: string): boolean {
  return Array.isArray(used) ? used.includes(word) : (used as ReadonlySet<string>).has(word);
}

/**
 * Checks whether `proposed` is a legal move from `current`.
 * Checks run cheapest-first so the feedback names the most fundamental problem.
 */
export function validateMove(
  dictionary: Dictionary,
  current: string,
  proposed: string,
  used: UsedWords,
): ValidationResult {
  const from = normalizeWord(current);
  const word = normalizeWord(proposed);
  if (!word) return { ok: false, reason: 'empty' };
  if (!isAlphabetic(word)) return { ok: false, reason: 'invalid_characters' };
  if (word.length !== from.length) return { ok: false, reason: 'wrong_length' };
  const diff = diffPositions(from, word)!;
  if (diff.length === 0) return { ok: false, reason: 'unchanged' };
  if (diff.length > 1) return { ok: false, reason: 'multiple_changes' };
  if (!dictionary.has(word)) return { ok: false, reason: 'not_a_word' };
  if (isUsed(used, word)) return { ok: false, reason: 'already_used' };
  return { ok: true, word, position: diff[0] };
}

/** All legal moves from `current`, optionally restricted to words of tier ≤ maxTier. */
export function legalMoves(
  dictionary: Dictionary,
  current: string,
  used: UsedWords,
  maxTier: WordTier = 3,
): string[] {
  return dictionary
    .neighbors(normalizeWord(current))
    .filter((w) => !isUsed(used, w) && (dictionary.tierOf(w) ?? 3) <= maxTier);
}

export function hasLegalMove(dictionary: Dictionary, current: string, used: UsedWords, maxTier: WordTier = 3) {
  const word = normalizeWord(current);
  return dictionary
    .neighbors(word)
    .some((w) => !isUsed(used, w) && (dictionary.tierOf(w) ?? 3) <= maxTier);
}

export const INVALID_MESSAGES: Record<InvalidReason, string> = {
  empty: 'Pick a letter to change first.',
  invalid_characters: 'Only the letters A–Z are allowed.',
  wrong_length: 'The new word must keep the same length.',
  unchanged: 'Change one letter before submitting.',
  multiple_changes: 'Only one letter can change per move.',
  not_a_word: "That's not in the dictionary. Try another letter!",
  already_used: 'That word was already played this round.',
};
