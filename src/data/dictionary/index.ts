import type { WordTier } from '@/types/game';
import { isAlphabetic, normalizeWord, oneLetterVariants } from '@/utils/word';

/**
 * In-memory word list plus an implicit word graph: two words are adjacent when they
 * differ by exactly one letter. Adjacency lists are computed on demand and cached.
 *
 * To add another language or vocabulary pack, build a new Dictionary from its own
 * tiered word lists; nothing else in the engine depends on English specifically.
 */
export class Dictionary {
  private readonly tiers = new Map<string, WordTier>();
  private readonly lengthIndex = new Map<string, string[]>();
  private readonly neighborCache = new Map<string, readonly string[]>();

  constructor(entries: Iterable<readonly [string, WordTier]>) {
    for (const [raw, tier] of entries) {
      const word = normalizeWord(raw);
      if (!word || !isAlphabetic(word)) continue;
      const existing = this.tiers.get(word);
      if (existing === undefined || tier < existing) this.tiers.set(word, tier);
    }
  }

  static fromTieredLists(lists: Partial<Record<WordTier, string | readonly string[]>>): Dictionary {
    const entries: [string, WordTier][] = [];
    for (const tier of [1, 2, 3] as const) {
      const list = lists[tier];
      if (!list) continue;
      const words = typeof list === 'string' ? list.split(/\s+/) : list;
      for (const w of words) if (w) entries.push([w, tier]);
    }
    return new Dictionary(entries);
  }

  get size(): number {
    return this.tiers.size;
  }

  has(word: string): boolean {
    return this.tiers.has(word);
  }

  tierOf(word: string): WordTier | undefined {
    return this.tiers.get(word);
  }

  /** Words of a given length whose tier is at most `maxTier`, sorted alphabetically. */
  wordsOfLength(length: number, maxTier: WordTier = 3): readonly string[] {
    const key = `${length}:${maxTier}`;
    let list = this.lengthIndex.get(key);
    if (!list) {
      list = [];
      for (const [w, t] of this.tiers) {
        if (w.length === length && t <= maxTier) list.push(w);
      }
      list.sort();
      this.lengthIndex.set(key, list);
    }
    return list;
  }

  /** All dictionary words that differ from `word` by exactly one letter. */
  neighbors(word: string): readonly string[] {
    let list = this.neighborCache.get(word);
    if (!list) {
      list = oneLetterVariants(word).filter((w) => this.tiers.has(w));
      this.neighborCache.set(word, list);
    }
    return list;
  }
}

let shared: Dictionary | null = null;

/** Lazily builds the bundled English dictionary (≈21k words, 3–6 letters). */
export function getEnglishDictionary(): Dictionary {
  if (!shared) {
    // Required lazily so the large string module is only parsed when first needed.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const words = require('./words.en') as typeof import('./words.en');
    shared = Dictionary.fromTieredLists({
      1: words.EN_WORDS_TIER1,
      2: words.EN_WORDS_TIER2,
      3: words.EN_WORDS_TIER3,
    });
  }
  return shared;
}
