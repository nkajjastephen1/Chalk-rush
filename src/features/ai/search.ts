import type { Dictionary } from '@/data/dictionary';
import type { WordTier } from '@/types/game';
import type { Rng } from '@/utils/random';

import type { Task } from './scheduler';

export const WIN = 10_000;
const YIELD_EVERY = 64;

export interface SearchOptions {
  dictionary: Dictionary;
  /** Word the computer must move from. */
  word: string;
  /** Words already used this round (must include `word`). */
  used: ReadonlySet<string>;
  /** Computer's vocabulary limit. */
  aiMaxTier: WordTier;
  /** Rarest tier the human is expected to find (opponent model). Defaults to 3 (knows everything). */
  opponentMaxTier?: WordTier;
  /** Moves remaining before the round is drawn by the move cap (counting this move). */
  movesLeft: number;
  maxDepth: number;
  nodeBudget: number;
  timeBudgetMs: number;
  rng: Rng;
  now?: () => number;
}

export interface SearchResult {
  move: string | null;
  score: number;
  depthCompleted: number;
  nodes: number;
}

class BudgetExceeded extends Error {}

/**
 * Iterative-deepening negamax with alpha-beta pruning over the one-letter word graph.
 *
 * - Cycle prevention: the path's words are added to the `used` set while searching,
 *   mirroring the "no reuse within a round" rule.
 * - Terminal states: side to move with no known word loses; reaching the move cap is a draw.
 * - Opponent model: the human is assumed to find words up to `opponentMaxTier`, so positions
 *   whose only escapes are rarer words are scored as traps.
 * - Leaf evaluation: mobility of the side to move, with the human's rarer options discounted.
 * - Budget: stops when either the node or time budget runs out and returns the best move
 *   from the deepest fully completed iteration.
 */
export function* searchBestMove(opts: SearchOptions): Task<SearchResult> {
  const { dictionary, aiMaxTier, rng } = opts;
  const opponentMaxTier = opts.opponentMaxTier ?? 3;
  const now = opts.now ?? (() => Date.now());
  const deadline = now() + opts.timeBudgetMs;
  const used = new Set(opts.used);
  used.add(opts.word);
  let nodes = 0;

  const movesFor = (word: string, aiToMove: boolean): string[] => {
    const maxTier = aiToMove ? aiMaxTier : opponentMaxTier;
    const out: string[] = [];
    for (const n of dictionary.neighbors(word)) {
      if (!used.has(n) && (dictionary.tierOf(n) ?? 3) <= maxTier) out.push(n);
    }
    return out;
  };

  /** Order moves so the ones leaving the opponent fewest replies are searched first. */
  const ordered = (moves: string[], aiToMove: boolean): string[] => {
    const scored = moves.map((m) => {
      used.add(m);
      const replies = movesFor(m, !aiToMove).length;
      used.delete(m);
      return { m, replies };
    });
    scored.sort((a, b) => a.replies - b.replies);
    return scored.map((s) => s.m);
  };

  const TIER_WEIGHT = [0, 1, 0.5, 0.25];
  const evaluate = (moves: readonly string[], aiToMove: boolean): number => {
    let mobility = 0;
    for (const m of moves) mobility += aiToMove ? 1 : TIER_WEIGHT[dictionary.tierOf(m) ?? 3];
    return Math.round(Math.min(mobility, 10) * 10 - 40);
  };

  function* negamax(word: string, aiToMove: boolean, depth: number, ply: number, alpha: number, beta: number): Task<number> {
    nodes++;
    if (nodes % YIELD_EVERY === 0) {
      if (nodes > opts.nodeBudget || now() > deadline) throw new BudgetExceeded();
      yield;
    }
    if (ply >= opts.movesLeft) return 0;
    const moves = movesFor(word, aiToMove);
    if (moves.length === 0) return -WIN + ply;
    if (depth === 0) return evaluate(moves, aiToMove);

    let best = -Infinity;
    const list = depth >= 2 ? ordered(moves, aiToMove) : moves;
    for (const m of list) {
      used.add(m);
      let value: number;
      try {
        value = -(yield* negamax(m, !aiToMove, depth - 1, ply + 1, -beta, -alpha)) || 0;
      } finally {
        used.delete(m);
      }
      if (value > best) best = value;
      if (value > alpha) alpha = value;
      if (alpha >= beta) break;
    }
    return best;
  }

  let rootMoves = movesFor(opts.word, true);
  if (rootMoves.length === 0) return { move: null, score: -WIN, depthCompleted: 0, nodes };
  if (rootMoves.length === 1) return { move: rootMoves[0], score: 0, depthCompleted: 0, nodes };
  rootMoves = ordered(rootMoves, true);

  let bestMove = rootMoves[0];
  let bestScore = -Infinity;
  let depthCompleted = 0;

  for (let depth = 1; depth <= opts.maxDepth; depth++) {
    const scores = new Map<string, number>();
    let alpha = -Infinity;
    try {
      for (const m of rootMoves) {
        used.add(m);
        let value: number;
        try {
          // Search with a window open just above alpha so equally good moves keep exact scores
          // (needed for fair random tie-breaking among the best moves).
          value = -(yield* negamax(m, false, depth - 1, 1, -Infinity, -(alpha - 1))) || 0;
        } finally {
          used.delete(m);
        }
        scores.set(m, value);
        if (value > alpha) alpha = value;
      }
    } catch (err) {
      if (err instanceof BudgetExceeded) break;
      throw err;
    }

    depthCompleted = depth;
    const top = Math.max(...scores.values());
    const best = rootMoves.filter((m) => scores.get(m) === top);
    // Among equally strong moves prefer familiar words, then pick randomly for variety.
    const minTier = Math.min(...best.map((m) => dictionary.tierOf(m) ?? 3));
    const familiar = best.filter((m) => (dictionary.tierOf(m) ?? 3) === minTier);
    bestMove = familiar[Math.floor(rng() * familiar.length)];
    bestScore = top;
    rootMoves = [...rootMoves].sort((a, b) => (scores.get(b) ?? 0) - (scores.get(a) ?? 0));

    // A proven result can't change with more depth.
    if (Math.abs(top) > WIN - 1000) break;
    if (depth >= opts.movesLeft) break;
  }

  return { move: bestMove, score: bestScore, depthCompleted, nodes };
}
