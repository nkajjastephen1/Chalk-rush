import type { Dictionary } from '@/data/dictionary';
import type { Hint } from '@/types/game';
import { diffPositions } from '@/utils/word';

import { legalMoves, type UsedWords } from './validation';

/**
 * Suggests a legal move for the player. Preference order:
 *   1. moves that leave the opponent with no reply (instant round win),
 *   2. familiar (lower tier) words,
 *   3. fewest replies for the opponent,
 *   4. alphabetical, for determinism.
 */
export function computeHint(dictionary: Dictionary, current: string, used: UsedWords): Hint | null {
  const moves = legalMoves(dictionary, current, used);
  if (moves.length === 0) return null;
  const usedSet = new Set(Array.isArray(used) ? used : [...(used as ReadonlySet<string>)]);
  usedSet.add(current);

  const ranked = moves
    .map((word) => {
      usedSet.add(word);
      const replies = legalMoves(dictionary, word, usedSet).length;
      usedSet.delete(word);
      return { word, replies, tier: dictionary.tierOf(word) ?? 3 };
    })
    .sort((a, b) => {
      const aWin = a.replies === 0 ? 0 : 1;
      const bWin = b.replies === 0 ? 0 : 1;
      if (aWin !== bWin) return aWin - bWin;
      if (a.tier !== b.tier) return a.tier - b.tier;
      if (a.replies !== b.replies) return a.replies - b.replies;
      return a.word < b.word ? -1 : 1;
    });

  const best = ranked[0].word;
  const position = diffPositions(current, best)![0];
  return { position, fromLetter: current[position], letter: best[position], word: best };
}
