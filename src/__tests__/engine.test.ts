import { getEnglishDictionary } from '@/data/dictionary';
import { DIFFICULTIES } from '@/data/difficulty';
import { pickStartWord } from '@/data/startWords';
import { startComputerTurn } from '@/features/game/computerTurn';
import {
  accuracyPercent,
  createGame,
  gameReducer,
  type EngineContext,
  type GameAction,
  type GameState,
} from '@/features/game/engine';
import { gameEndBonus, SCORING, scorePlayerMove } from '@/features/game/scoring';
import { createRng } from '@/utils/random';

import { lineDictionary, trapDictionary } from '@/testing/dictionaries';

const run = (state: GameState, ctx: EngineContext, ...actions: GameAction[]) =>
  actions.reduce((s, a) => gameReducer(s, a, ctx), state);

const ctxFor = (dictionary = trapDictionary(), previouslyPlayed: string[] = []): EngineContext => ({
  dictionary,
  previouslyPlayed: new Set(previouslyPlayed),
});

describe('game flow', () => {
  it('starts in ready and moves to the player turn', () => {
    const ctx = ctxFor();
    const s0 = createGame('simple', 'cat');
    expect(s0.phase).toBe('ready');
    const s1 = run(s0, ctx, { type: 'START' });
    expect(s1.phase).toBe('player_turn');
    expect(s1.turnToken).toBe(s0.turnToken + 1);
  });

  it('applies a valid player move, scores it and hands over to the computer', () => {
    const ctx = ctxFor();
    const s = run(createGame('simple', 'cat'), ctx, { type: 'START' }, { type: 'SUBMIT', word: 'COT' });
    expect(s.currentWord).toBe('cot');
    expect(s.usedWords).toEqual(['cat', 'cot']);
    expect(s.phase).toBe('computer_turn');
    expect(s.playerScore).toBe(SCORING.validMove + SCORING.newWordBonus);
    expect(s.events[0]).toMatchObject({ type: 'player_move', move: { position: 1, letter: 'o' } });
  });

  it('rejects invalid submissions without changing the word or awarding points', () => {
    const ctx = ctxFor();
    const s1 = run(createGame('simple', 'cat'), ctx, { type: 'START' });
    const s2 = run(s1, ctx, { type: 'SUBMIT', word: 'cxt' }, { type: 'SUBMIT', word: 'cog' });
    expect(s2.currentWord).toBe('cat');
    expect(s2.playerScore).toBe(0);
    expect(s2.phase).toBe('player_turn');
    expect(s2.counters).toMatchObject({ submissions: 2, invalidAttempts: 2, validMoves: 0 });
    expect(s2.events[0]).toMatchObject({ type: 'invalid', reason: 'multiple_changes' });
    expect(accuracyPercent(s2.counters)).toBe(0);
  });

  it('ignores submissions outside the player turn (no double submit)', () => {
    const ctx = ctxFor();
    const s1 = run(createGame('simple', 'cat'), ctx, { type: 'START' }, { type: 'SUBMIT', word: 'cot' });
    const s2 = run(s1, ctx, { type: 'SUBMIT', word: 'cot' });
    expect(s2).toBe(s1);
  });

  it('computer wins the round when the player has no legal move', () => {
    const ctx = ctxFor();
    const s = run(createGame('simple', 'cat'), ctx, { type: 'START' }, { type: 'SUBMIT', word: 'hat' });
    expect(s.phase).toBe('computer_turn');
    const s2 = run(s, ctx, { type: 'COMPUTER_MOVE', word: 'ham', token: s.turnToken });
    expect(s2.phase).toBe('round_over');
    expect(s2.roundResults[0]).toMatchObject({ outcome: 'computer', reason: 'no_moves' });

    const line = ctxFor(lineDictionary());
    // cat → cot leaves the computer only cut, after which the player is stuck.
    const l1 = run(createGame('simple', 'cat'), line, { type: 'START' }, { type: 'SUBMIT', word: 'cot' });
    const l2 = run(l1, line, { type: 'COMPUTER_MOVE', word: 'cut', token: l1.turnToken });
    expect(l2.roundResults[0]).toMatchObject({ outcome: 'computer', reason: 'no_moves' });
  });

  it('player wins when their move leaves the computer stuck', () => {
    const ctx = ctxFor();
    const s = run(
      createGame('simple', 'cat'),
      ctx,
      { type: 'START' },
      { type: 'SUBMIT', word: 'cot' },
    );
    const s2 = run(s, ctx, { type: 'COMPUTER_MOVE', word: 'cog', token: s.turnToken });
    const s3 = run(s2, ctx, { type: 'SUBMIT', word: 'bog' });
    expect(s3.phase).toBe('round_over');
    expect(s3.roundResults[0]).toMatchObject({ outcome: 'player', reason: 'no_moves' });
    expect(s3.playerScore).toBeGreaterThanOrEqual(SCORING.roundWinBonus.simple + 2 * SCORING.validMove);
  });

  it('player wins when the computer vocabulary has no move', () => {
    const ctx = ctxFor();
    const s = run(createGame('simple', 'cat'), ctx, { type: 'START' }, { type: 'SUBMIT', word: 'cot' });
    const s2 = run(s, ctx, { type: 'COMPUTER_STUCK', token: s.turnToken });
    expect(s2.roundResults[0]).toMatchObject({ outcome: 'player', reason: 'computer_stuck' });
  });

  it('declares a draw when the round hits the move cap', () => {
    const ctx = ctxFor();
    const s0 = { ...createGame('simple', 'cat'), maxMovesPerRound: 1 };
    const s = run(s0, ctx, { type: 'START' }, { type: 'SUBMIT', word: 'cot' });
    expect(s.roundResults[0]).toMatchObject({ outcome: 'draw', reason: 'move_limit' });
  });

  it('declares a draw when neither player can move from the start word', () => {
    const ctx = ctxFor();
    const s = run(createGame('simple', 'zzz'), ctx, { type: 'START' });
    expect(s.roundResults[0]).toMatchObject({ outcome: 'draw', reason: 'dead_start' });
  });

  it('plays three rounds, alternates the starter and decides the game', () => {
    const ctx = ctxFor();
    let s = run(createGame('simple', 'cat'), ctx, { type: 'START' }, { type: 'CONCEDE_ROUND' });
    expect(s.phase).toBe('round_over');
    s = run(s, ctx, { type: 'NEXT_ROUND', startWord: 'cat' });
    expect(s).toMatchObject({ round: 2, roundStarter: 'computer', phase: 'ready', usedWords: ['cat'] });
    s = run(s, ctx, { type: 'START' });
    expect(s.phase).toBe('computer_turn');
    s = run(s, ctx, { type: 'COMPUTER_STUCK', token: s.turnToken });
    s = run(s, ctx, { type: 'NEXT_ROUND', startWord: 'cat' }, { type: 'START' }, { type: 'CONCEDE_ROUND' });
    expect(s.phase).toBe('finished');
    expect(s.outcome).toBe('computer');
    expect(s.roundResults.map((r) => r.outcome)).toEqual(['computer', 'player', 'computer']);
    expect(s.events.map((e) => e.type)).toEqual(['round_end', 'game_end']);
  });

  it('awards a draw bonus for a drawn game', () => {
    const ctx = ctxFor();
    let s = { ...createGame('simple', 'zzz'), totalRounds: 1 };
    s = run(s, ctx, { type: 'START' });
    expect(s.outcome).toBe('draw');
    expect(s.playerScore).toBe(gameEndBonus('simple', 'draw'));
  });
});

describe('hints in the engine', () => {
  it('uses a hint, decrements the counter, and scores a hinted move at the reduced rate', () => {
    const ctx = ctxFor();
    let s = run(createGame('simple', 'cat'), ctx, { type: 'START' }, { type: 'HINT' });
    expect(s.hintsRemaining).toBe(DIFFICULTIES.simple.hints - 1);
    expect(s.activeHint).not.toBeNull();
    // Asking again re-shows the same hint without spending another.
    s = run(s, ctx, { type: 'HINT' });
    expect(s.hintsRemaining).toBe(DIFFICULTIES.simple.hints - 1);
    s = run(s, ctx, { type: 'SUBMIT', word: s.activeHint!.word });
    expect(s.playerScore).toBe(SCORING.hintedMove);
    expect(s.counters.hintsUsed).toBe(1);
  });

  it('reports when no hints remain', () => {
    const ctx = ctxFor();
    let s = { ...createGame('advanced', 'cat'), hintsRemaining: 0 };
    s = run(s, ctx, { type: 'START' }, { type: 'HINT' });
    expect(s.events[0].type).toBe('no_hints');
    expect(s.activeHint).toBeNull();
  });
});

describe('scoring', () => {
  it('awards base, new-word and challenging bonuses', () => {
    expect(scorePlayerMove({ tier: 1, isNewForPlayer: false, hinted: false }).total).toBe(SCORING.validMove);
    expect(scorePlayerMove({ tier: 3, isNewForPlayer: true, hinted: false }).total).toBe(
      SCORING.validMove + SCORING.newWordBonus + SCORING.challengingWordBonus,
    );
    expect(scorePlayerMove({ tier: 3, isNewForPlayer: true, hinted: true }).total).toBe(SCORING.hintedMove);
  });

  it('does not award the new-word bonus for words from previous games', () => {
    const ctx = ctxFor(trapDictionary(), ['cot']);
    const s = run(createGame('simple', 'cat'), ctx, { type: 'START' }, { type: 'SUBMIT', word: 'cot' });
    expect(s.playerScore).toBe(SCORING.validMove);
  });

  it('time bonus is disabled by default', () => {
    expect(SCORING.timeBonus.enabled).toBe(false);
    expect(scorePlayerMove({ tier: 1, isNewForPlayer: false, hinted: false, elapsedMs: 1 }).time).toBe(0);
  });

  it('rewards wins according to difficulty', () => {
    expect(gameEndBonus('advanced', 'player')).toBeGreaterThan(gameEndBonus('simple', 'player'));
    expect(gameEndBonus('hard', 'computer')).toBe(0);
  });
});

describe('pause, reset and asynchronous computer turns', () => {
  it('ignores a computer move carrying a stale turn token', () => {
    const ctx = ctxFor();
    const s = run(createGame('simple', 'cat'), ctx, { type: 'START' }, { type: 'SUBMIT', word: 'cot' });
    const staleToken = s.turnToken;
    const paused = run(s, ctx, { type: 'PAUSE' });
    expect(paused.phase).toBe('paused');
    expect(run(paused, ctx, { type: 'COMPUTER_MOVE', word: 'cog', token: staleToken })).toBe(paused);
    const resumed = run(paused, ctx, { type: 'RESUME' });
    expect(resumed.phase).toBe('computer_turn');
    expect(run(resumed, ctx, { type: 'COMPUTER_MOVE', word: 'cog', token: staleToken })).toBe(resumed);
    const moved = run(resumed, ctx, { type: 'COMPUTER_MOVE', word: 'cog', token: resumed.turnToken });
    expect(moved.currentWord).toBe('cog');
  });

  it('a new game discards pending computer moves', () => {
    const ctx = ctxFor();
    const s = run(createGame('simple', 'cat'), ctx, { type: 'START' }, { type: 'SUBMIT', word: 'cot' });
    const fresh = run(s, ctx, { type: 'NEW_GAME', difficulty: 'simple', startWord: 'cat' });
    expect(fresh.phase).toBe('ready');
    expect(fresh.gameId).toBe(s.gameId + 1);
    expect(fresh.playerScore).toBe(0);
    expect(run(fresh, ctx, { type: 'COMPUTER_MOVE', word: 'cog', token: s.turnToken })).toBe(fresh);
  });

  it('ignores computer moves after the game has finished', () => {
    const ctx = ctxFor();
    let s = { ...createGame('simple', 'cat'), totalRounds: 1 };
    s = run(s, ctx, { type: 'START' }, { type: 'SUBMIT', word: 'cot' });
    const token = s.turnToken;
    s = run(s, ctx, { type: 'COMPUTER_STUCK', token });
    expect(s.phase).toBe('finished');
    expect(run(s, ctx, { type: 'COMPUTER_MOVE', word: 'cog', token })).toBe(s);
  });

  it('a cancelled computer turn resolves to null', async () => {
    const ctx = ctxFor();
    const s = run(createGame('simple', 'cat'), ctx, { type: 'START' }, { type: 'SUBMIT', word: 'cot' });
    const handle = startComputerTurn(s, ctx, createRng(1), { minThinkMs: 0 });
    handle.cancel();
    await expect(handle.promise).resolves.toBeNull();
  });

  it('a completed computer turn produces a legal, token-tagged action', async () => {
    const ctx = ctxFor();
    const s = run(createGame('simple', 'cat'), ctx, { type: 'START' }, { type: 'SUBMIT', word: 'cot' });
    const action = await startComputerTurn(s, ctx, createRng(1), { minThinkMs: 0 }).promise;
    expect(action).toMatchObject({ type: 'COMPUTER_MOVE', token: s.turnToken });
    const next = run(s, ctx, action!);
    expect(['cog', 'cod']).toContain(next.currentWord);
  });
});

describe('start words', () => {
  const en = getEnglishDictionary();
  it.each(['simple', 'medium', 'hard', 'advanced'] as const)('picks a playable %s start word', (d) => {
    const config = DIFFICULTIES[d];
    const rng = createRng(42);
    for (let i = 0; i < 10; i++) {
      const w = pickStartWord(en, config, rng);
      expect(config.wordLengths).toContain(w.length);
      expect(en.tierOf(w)).toBe(1);
      expect(en.neighbors(w).length).toBeGreaterThanOrEqual(config.startMinNeighbors);
    }
  });
});
