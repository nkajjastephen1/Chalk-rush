import { Dictionary } from '@/data/dictionary';

/**
 * A tiny hand-built word graph used to test strategy deterministically.
 *
 *   cat ─ cot ─ cog ─ bog        cat → cot is a forced win for the mover:
 *    │     │     │               the reply cog is answered by bog, the reply
 *   hat   cod ───┘               cod by god, and both leave no further moves.
 *    │     │
 *   ham   god                    cat → hat loses: the reply ham leaves no move.
 */
export const trapDictionary = () =>
  Dictionary.fromTieredLists({ 1: 'cat cot cog bog cod god hat ham' });

/** Same graph, but the winning branch is only reachable through a rarer word. */
export const tieredTrapDictionary = () =>
  Dictionary.fromTieredLists({ 1: 'cat cog bog cod god hat ham', 2: 'cot' });

export const lineDictionary = () => Dictionary.fromTieredLists({ 1: 'cat cot cut' });
