import type { Dictionary } from '@/data/dictionary';
import { DIFFICULTIES } from '@/data/difficulty';
import type {
  Difficulty,
  GameEvent,
  GamePhase,
  GameStatsCounters,
  Hint,
  Move,
  Player,
  RoundEndReason,
  RoundOutcome,
  RoundResult,
} from '@/types/game';
import { diffPositions } from '@/utils/word';

import { computeHint } from './hints';
import { gameEndBonus, SCORING, scorePlayerMove } from './scoring';
import { hasLegalMove, validateMove } from './validation';

export interface EngineContext {
  dictionary: Dictionary;
  /** Words the player formed in earlier games (for the new-word bonus). */
  previouslyPlayed: ReadonlySet<string>;
}

type ActivePhase = Exclude<GamePhase, 'paused'>;

export interface GameState {
  gameId: number;
  difficulty: Difficulty;
  phase: GamePhase;
  pausedPhase: ActivePhase | null;
  round: number;
  totalRounds: number;
  roundStarter: Player;
  startWord: string;
  currentWord: string;
  /** Words used this round, including the starting word. */
  usedWords: string[];
  /** Moves made this round. */
  moves: Move[];
  maxMovesPerRound: number;
  playerScore: number;
  computerScore: number;
  roundResults: RoundResult[];
  hintsRemaining: number;
  activeHint: Hint | null;
  counters: GameStatsCounters;
  /**
   * Incremented on every phase transition. Asynchronous computer moves carry the token
   * they were started with and are ignored if it no longer matches.
   */
  turnToken: number;
  eventSeq: number;
  /** Events produced by the most recent action (ids are monotonically increasing). */
  events: GameEvent[];
  outcome: RoundOutcome | null;
}

export type GameAction =
  | { type: 'START' }
  | { type: 'SUBMIT'; word: string; elapsedMs?: number }
  | { type: 'COMPUTER_MOVE'; word: string; token: number }
  | { type: 'COMPUTER_STUCK'; token: number }
  | { type: 'HINT' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'CONCEDE_ROUND' }
  | { type: 'NEXT_ROUND'; startWord: string }
  | { type: 'NEW_GAME'; difficulty: Difficulty; startWord: string };

export function createGame(difficulty: Difficulty, startWord: string, gameId = 1): GameState {
  const config = DIFFICULTIES[difficulty];
  return {
    gameId,
    difficulty,
    phase: 'ready',
    pausedPhase: null,
    round: 1,
    totalRounds: config.rounds,
    roundStarter: 'player',
    startWord,
    currentWord: startWord,
    usedWords: [startWord],
    moves: [],
    maxMovesPerRound: config.maxMovesPerRound,
    playerScore: 0,
    computerScore: 0,
    roundResults: [],
    hintsRemaining: config.hints,
    activeHint: null,
    counters: {
      submissions: 0,
      validMoves: 0,
      invalidAttempts: 0,
      hintsUsed: 0,
      computerMoves: 0,
      wordsFormed: [],
    },
    turnToken: 0,
    eventSeq: 0,
    events: [],
    outcome: null,
  };
}

const turnPhase = (p: Player): ActivePhase => (p === 'player' ? 'player_turn' : 'computer_turn');
const other = (p: Player): Player => (p === 'player' ? 'computer' : 'player');

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
type EventInput = DistributiveOmit<GameEvent, 'id'>;

function withEvents(state: GameState, ...inputs: EventInput[]): GameState {
  let seq = state.eventSeq;
  const events = inputs.map((e) => ({ ...e, id: ++seq }) as GameEvent);
  return { ...state, eventSeq: seq, events };
}

function setPhase(state: GameState, phase: GamePhase): GameState {
  return { ...state, phase, turnToken: state.turnToken + 1 };
}

function endRound(
  state: GameState,
  outcome: RoundOutcome,
  reason: RoundEndReason,
  prior: EventInput[] = [],
): GameState {
  const result: RoundResult = {
    round: state.round,
    outcome,
    reason,
    startWord: state.startWord,
    finalWord: state.currentWord,
    moves: state.moves.length,
  };
  const roundBonus = outcome === 'player' ? SCORING.roundWinBonus[state.difficulty] : 0;
  const roundResults = [...state.roundResults, result];
  let next: GameState = {
    ...state,
    roundResults,
    playerScore: state.playerScore + roundBonus,
    activeHint: null,
    pausedPhase: null,
  };
  const events: EventInput[] = [...prior, { type: 'round_end', result, bonus: roundBonus }];

  if (state.round >= state.totalRounds) {
    const playerWins = roundResults.filter((r) => r.outcome === 'player').length;
    const computerWins = roundResults.filter((r) => r.outcome === 'computer').length;
    const gameOutcome: RoundOutcome =
      playerWins > computerWins ? 'player' : computerWins > playerWins ? 'computer' : 'draw';
    const bonus = gameEndBonus(state.difficulty, gameOutcome);
    next = { ...next, outcome: gameOutcome, playerScore: next.playerScore + bonus };
    events.push({ type: 'game_end', outcome: gameOutcome, bonus });
    return withEvents(setPhase(next, 'finished'), ...events);
  }
  return withEvents(setPhase(next, 'round_over'), ...events);
}

/** After `by` has moved: enforce the move cap, then check whether the opponent can reply. */
function afterMove(state: GameState, by: Player, ctx: EngineContext, prior: EventInput[]): GameState {
  if (state.moves.length >= state.maxMovesPerRound) {
    return endRound(state, 'draw', 'move_limit', prior);
  }
  if (!hasLegalMove(ctx.dictionary, state.currentWord, state.usedWords)) {
    return endRound(state, by, 'no_moves', prior);
  }
  return withEvents(setPhase(state, turnPhase(other(by))), ...prior);
}

function applyMove(state: GameState, move: Move): GameState {
  return {
    ...state,
    currentWord: move.to,
    usedWords: [...state.usedWords, move.to],
    moves: [...state.moves, move],
    activeHint: null,
  };
}

export function gameReducer(state: GameState, action: GameAction, ctx: EngineContext): GameState {
  switch (action.type) {
    case 'NEW_GAME':
      return createGame(action.difficulty, action.startWord, state.gameId + 1);

    case 'START': {
      if (state.phase !== 'ready') return state;
      if (!hasLegalMove(ctx.dictionary, state.currentWord, state.usedWords)) {
        return endRound(state, 'draw', 'dead_start');
      }
      return withEvents(setPhase(state, turnPhase(state.roundStarter)));
    }

    case 'SUBMIT': {
      if (state.phase !== 'player_turn') return state;
      const result = validateMove(ctx.dictionary, state.currentWord, action.word, state.usedWords);
      if (!result.ok) {
        return withEvents(
          {
            ...state,
            counters: {
              ...state.counters,
              submissions: state.counters.submissions + 1,
              invalidAttempts: state.counters.invalidAttempts + 1,
            },
          },
          { type: 'invalid', reason: result.reason, word: action.word },
        );
      }
      const word = result.word;
      const hinted = state.activeHint?.word === word;
      const breakdown = scorePlayerMove({
        tier: ctx.dictionary.tierOf(word) ?? 3,
        isNewForPlayer: !ctx.previouslyPlayed.has(word) && !state.counters.wordsFormed.includes(word),
        hinted,
        elapsedMs: action.elapsedMs,
      });
      const move: Move = {
        by: 'player',
        from: state.currentWord,
        to: word,
        position: result.position,
        letter: word[result.position],
        points: breakdown.total,
        hinted,
      };
      const next: GameState = {
        ...applyMove(state, move),
        playerScore: state.playerScore + breakdown.total,
        counters: {
          ...state.counters,
          submissions: state.counters.submissions + 1,
          validMoves: state.counters.validMoves + 1,
          wordsFormed: [...state.counters.wordsFormed, word],
        },
      };
      return afterMove(next, 'player', ctx, [{ type: 'player_move', move, breakdown }]);
    }

    case 'COMPUTER_MOVE': {
      if (state.phase !== 'computer_turn' || action.token !== state.turnToken) return state;
      const result = validateMove(ctx.dictionary, state.currentWord, action.word, state.usedWords);
      if (!result.ok) {
        // The AI only proposes legal words; if that ever fails, it forfeits rather than cheating.
        return endRound(state, 'player', 'computer_stuck');
      }
      const move: Move = {
        by: 'computer',
        from: state.currentWord,
        to: result.word,
        position: result.position,
        letter: result.word[result.position],
        points: SCORING.computerMove,
        hinted: false,
      };
      const next: GameState = {
        ...applyMove(state, move),
        computerScore: state.computerScore + SCORING.computerMove,
        counters: { ...state.counters, computerMoves: state.counters.computerMoves + 1 },
      };
      return afterMove(next, 'computer', ctx, [{ type: 'computer_move', move }]);
    }

    case 'COMPUTER_STUCK': {
      if (state.phase !== 'computer_turn' || action.token !== state.turnToken) return state;
      return endRound(state, 'player', 'computer_stuck');
    }

    case 'HINT': {
      if (state.phase !== 'player_turn') return state;
      if (state.activeHint) return withEvents(state, { type: 'hint', hint: state.activeHint });
      if (state.hintsRemaining <= 0) return withEvents(state, { type: 'no_hints' });
      const hint = computeHint(ctx.dictionary, state.currentWord, state.usedWords);
      if (!hint) return withEvents(state, { type: 'no_hints' });
      return withEvents(
        {
          ...state,
          hintsRemaining: state.hintsRemaining - 1,
          activeHint: hint,
          counters: { ...state.counters, hintsUsed: state.counters.hintsUsed + 1 },
        },
        { type: 'hint', hint },
      );
    }

    case 'PAUSE': {
      if (state.phase !== 'player_turn' && state.phase !== 'computer_turn' && state.phase !== 'ready') {
        return state;
      }
      return withEvents({ ...setPhase(state, 'paused'), pausedPhase: state.phase });
    }

    case 'RESUME': {
      if (state.phase !== 'paused' || !state.pausedPhase) return state;
      return withEvents({ ...setPhase(state, state.pausedPhase), pausedPhase: null });
    }

    case 'CONCEDE_ROUND': {
      const active = state.phase === 'paused' ? state.pausedPhase : state.phase;
      if (active !== 'player_turn' && active !== 'computer_turn') return state;
      return endRound(state, 'computer', 'conceded');
    }

    case 'NEXT_ROUND': {
      if (state.phase !== 'round_over') return state;
      const starter = other(state.roundStarter);
      return withEvents({
        ...setPhase(state, 'ready'),
        round: state.round + 1,
        roundStarter: starter,
        startWord: action.startWord,
        currentWord: action.startWord,
        usedWords: [action.startWord],
        moves: [],
        activeHint: null,
      });
    }

    default:
      return state;
  }
}

/** Accuracy of the player's submissions as a 0–100 integer. */
export function accuracyPercent(counters: GameStatsCounters): number {
  if (counters.submissions === 0) return 100;
  return Math.round((counters.validMoves / counters.submissions) * 100);
}

export function movesLeftInRound(state: GameState): number {
  return Math.max(0, state.maxMovesPerRound - state.moves.length);
}

export function changedPosition(from: string, to: string): number {
  return diffPositions(from, to)?.[0] ?? -1;
}
