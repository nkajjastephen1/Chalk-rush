import type { Difficulty, ScoreBreakdown, WordTier } from '@/types/game';

/** All scoring knobs live here so balancing never touches game logic. */
export const SCORING = {
  validMove: 10,
  /** Base points when the move was the one suggested by a hint (no bonuses). */
  hintedMove: 5,
  /** Word never played by the player in any previous game. */
  newWordBonus: 5,
  /** Word whose tier is at least this rare earns the challenging bonus. */
  challengingTierMin: 2 as WordTier,
  challengingWordBonus: 5,
  /** Points awarded to the computer per move (shown for comparison only). */
  computerMove: 10,
  roundWinBonus: { simple: 10, medium: 20, hard: 30, advanced: 40 } as Record<Difficulty, number>,
  gameWinBonus: { simple: 25, medium: 50, hard: 100, advanced: 150 } as Record<Difficulty, number>,
  /** Fraction of the game-win bonus awarded for a drawn game. */
  drawBonusFraction: 0.4,
  timeBonus: {
    enabled: false,
    /** Moves submitted within this many ms of the turn starting earn the full bonus. */
    fastMs: 5000,
    points: 5,
  },
} as const;

export interface MoveScoreInput {
  tier: WordTier;
  isNewForPlayer: boolean;
  hinted: boolean;
  elapsedMs?: number;
}

export function scorePlayerMove(input: MoveScoreInput): ScoreBreakdown {
  if (input.hinted) {
    return { base: SCORING.hintedMove, newWord: 0, challenging: 0, time: 0, total: SCORING.hintedMove };
  }
  const base = SCORING.validMove;
  const newWord = input.isNewForPlayer ? SCORING.newWordBonus : 0;
  const challenging = input.tier >= SCORING.challengingTierMin ? SCORING.challengingWordBonus : 0;
  const time =
    SCORING.timeBonus.enabled && input.elapsedMs !== undefined && input.elapsedMs <= SCORING.timeBonus.fastMs
      ? SCORING.timeBonus.points
      : 0;
  return { base, newWord, challenging, time, total: base + newWord + challenging + time };
}

export function gameEndBonus(difficulty: Difficulty, outcome: 'player' | 'computer' | 'draw'): number {
  if (outcome === 'player') return SCORING.gameWinBonus[difficulty];
  if (outcome === 'draw') return Math.round(SCORING.gameWinBonus[difficulty] * SCORING.drawBonusFraction);
  return 0;
}
