import { useCallback, useEffect, useReducer, useRef, useState } from 'react';

import { getEnglishDictionary } from '@/data/dictionary';
import { DIFFICULTIES } from '@/data/difficulty';
import { pickStartWord } from '@/data/startWords';
import { startComputerTurn } from '@/features/game/computerTurn';
import { createGame, gameReducer, type EngineContext, type GameAction, type GameState } from '@/features/game/engine';
import type { Difficulty } from '@/types/game';
import { createRng, randomSeed } from '@/utils/random';

/**
 * Owns one game: the pure engine reducer plus the asynchronous computer turn.
 * The computer's search runs cooperatively and its result is tagged with the turn token,
 * so pausing, restarting or leaving the screen can never apply a stale move.
 */
export function useGame(difficulty: Difficulty, previouslyPlayed: ReadonlySet<string>) {
  const [ctx] = useState<EngineContext>(() => ({
    dictionary: getEnglishDictionary(),
    previouslyPlayed: new Set(previouslyPlayed),
  }));
  const [rng] = useState(() => createRng(randomSeed()));
  const config = DIFFICULTIES[difficulty];

  const reducer = useCallback((s: GameState, a: GameAction) => gameReducer(s, a, ctx), [ctx]);
  const [state, dispatch] = useReducer(reducer, undefined, () =>
    createGame(difficulty, pickStartWord(ctx.dictionary, config, rng)),
  );

  const turnStartedAt = useRef(0);

  useEffect(() => {
    if (state.phase === 'player_turn') turnStartedAt.current = Date.now();
  }, [state.phase, state.turnToken]);

  useEffect(() => {
    if (state.phase !== 'computer_turn') return;
    const handle = startComputerTurn(state, ctx, rng);
    handle.promise
      .then((action) => {
        if (action) dispatch(action);
      })
      .catch((err) => {
        console.error('[ai] computer turn failed', err);
        dispatch({ type: 'COMPUTER_STUCK', token: state.turnToken });
      });
    return handle.cancel;
  }, [state, ctx, rng]);

  const actions = {
    start: useCallback(() => dispatch({ type: 'START' }), []),
    submit: useCallback(
      (word: string) => dispatch({ type: 'SUBMIT', word, elapsedMs: Date.now() - turnStartedAt.current }),
      [],
    ),
    hint: useCallback(() => dispatch({ type: 'HINT' }), []),
    pause: useCallback(() => dispatch({ type: 'PAUSE' }), []),
    resume: useCallback(() => dispatch({ type: 'RESUME' }), []),
    concede: useCallback(() => dispatch({ type: 'CONCEDE_ROUND' }), []),
    nextRound: useCallback(() => {
      const previousStarts = [state.startWord, ...state.roundResults.map((r) => r.startWord)];
      dispatch({ type: 'NEXT_ROUND', startWord: pickStartWord(ctx.dictionary, config, rng, previousStarts) });
    }, [state.startWord, state.roundResults, ctx, config, rng]),
    restart: useCallback(() => {
      dispatch({ type: 'NEW_GAME', difficulty, startWord: pickStartWord(ctx.dictionary, config, rng) });
    }, [difficulty, ctx, config, rng]),
  };

  return { state, config, dictionary: ctx.dictionary, actions };
}
