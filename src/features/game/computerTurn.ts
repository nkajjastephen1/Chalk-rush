import { chooseComputerMove } from '@/features/ai/computer';
import { CancelledError, runCooperatively, type CancelToken } from '@/features/ai/scheduler';
import { DIFFICULTIES } from '@/data/difficulty';
import type { Rng } from '@/utils/random';

import { movesLeftInRound, type EngineContext, type GameAction, type GameState } from './engine';

export interface ComputerTurnHandle {
  /** Resolves with the action to dispatch, or null if the turn was cancelled. */
  promise: Promise<Extract<GameAction, { type: 'COMPUTER_MOVE' | 'COMPUTER_STUCK' }> | null>;
  cancel: () => void;
}

const delay = (ms: number, token: CancelToken) =>
  new Promise<void>((resolve) => {
    if (ms <= 0) return resolve();
    const started = Date.now();
    const check = () => {
      if (token.cancelled || Date.now() - started >= ms) resolve();
      else setTimeout(check, Math.min(50, ms));
    };
    setTimeout(check, Math.min(50, ms));
  });

/**
 * Starts the computer's turn for `state`. The resulting action carries the turn token
 * that was current when the turn began, so the reducer drops it if the game was
 * paused, reset or finished in the meantime.
 */
export function startComputerTurn(
  state: GameState,
  ctx: EngineContext,
  rng: Rng,
  options: { minThinkMs?: number } = {},
): ComputerTurnHandle {
  const token: CancelToken = { cancelled: false };
  const turnToken = state.turnToken;
  const config = DIFFICULTIES[state.difficulty];
  const minThinkMs = options.minThinkMs ?? config.computerThinkMs;

  const promise = (async () => {
    const started = Date.now();
    try {
      const word = await runCooperatively(
        chooseComputerMove({
          dictionary: ctx.dictionary,
          currentWord: state.currentWord,
          usedWords: state.usedWords,
          config,
          movesLeft: movesLeftInRound(state),
          rng,
        }),
        { cancel: token },
      );
      await delay(minThinkMs - (Date.now() - started), token);
      if (token.cancelled) return null;
      return word
        ? ({ type: 'COMPUTER_MOVE', word, token: turnToken } as const)
        : ({ type: 'COMPUTER_STUCK', token: turnToken } as const);
    } catch (err) {
      if (err instanceof CancelledError) return null;
      throw err;
    }
  })();

  return {
    promise,
    cancel: () => {
      token.cancelled = true;
    },
  };
}
