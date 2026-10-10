import type { Dictionary } from '@/data/dictionary';
import type { DifficultyConfig } from '@/data/difficulty';
import { pickRandom, type Rng } from '@/utils/random';

/**
 * Picks a common starting word with enough legal moves for both sides,
 * avoiding words in `exclude` (e.g. starting words of earlier rounds).
 */
export function pickStartWord(
  dictionary: Dictionary,
  config: DifficultyConfig,
  rng: Rng,
  exclude: Iterable<string> = [],
): string {
  const excluded = new Set(exclude);
  const length = pickRandom(config.wordLengths, rng) ?? config.wordLengths[0];
  const pool = dictionary.wordsOfLength(length, 1);
  if (pool.length === 0) throw new Error(`No starting words of length ${length}`);

  const isGood = (w: string) => {
    if (excluded.has(w)) return false;
    const neighbors = dictionary.neighbors(w);
    if (neighbors.length < config.startMinNeighbors) return false;
    const aiKnown = neighbors.filter((n) => (dictionary.tierOf(n) ?? 3) <= config.aiVocabularyMaxTier);
    return aiKnown.length >= 3;
  };

  for (let attempt = 0; attempt < 400; attempt++) {
    const w = pool[Math.floor(rng() * pool.length)];
    if (isGood(w)) return w;
  }
  const fallback = pool.find(isGood) ?? pool.find((w) => !excluded.has(w)) ?? pool[0];
  return fallback;
}
