export type Difficulty = 'simple' | 'medium' | 'hard' | 'advanced';

/** 1 = common, 2 = standard, 3 = rare (derived from SCOWL size levels). */
export type WordTier = 1 | 2 | 3;

export type Player = 'player' | 'computer';

export type GamePhase =
  | 'ready'
  | 'player_turn'
  | 'computer_turn'
  | 'paused'
  | 'round_over'
  | 'finished';

export type RoundOutcome = Player | 'draw';

export type RoundEndReason =
  | 'no_moves' // the side to move had no legal word left
  | 'computer_stuck' // the computer's vocabulary had no legal move
  | 'move_limit' // the round reached its move cap
  | 'conceded' // the player gave up the round
  | 'dead_start'; // the starting word had no legal moves for anyone

export interface RoundResult {
  round: number;
  outcome: RoundOutcome;
  reason: RoundEndReason;
  startWord: string;
  finalWord: string;
  moves: number;
}

export type InvalidReason =
  | 'empty'
  | 'invalid_characters'
  | 'wrong_length'
  | 'unchanged'
  | 'multiple_changes'
  | 'not_a_word'
  | 'already_used';

export type ValidationResult =
  | { ok: true; word: string; position: number }
  | { ok: false; reason: InvalidReason };

export interface Move {
  by: Player;
  from: string;
  to: string;
  position: number;
  letter: string;
  points: number;
  hinted: boolean;
}

export interface Hint {
  position: number;
  fromLetter: string;
  letter: string;
  word: string;
}

export interface ScoreBreakdown {
  base: number;
  newWord: number;
  challenging: number;
  time: number;
  total: number;
}

export type GameEvent =
  | { id: number; type: 'invalid'; reason: InvalidReason; word: string }
  | { id: number; type: 'player_move'; move: Move; breakdown: ScoreBreakdown }
  | { id: number; type: 'computer_move'; move: Move }
  | { id: number; type: 'hint'; hint: Hint }
  | { id: number; type: 'no_hints' }
  | { id: number; type: 'round_end'; result: RoundResult; bonus: number }
  | { id: number; type: 'game_end'; outcome: RoundOutcome; bonus: number };

export interface GameStatsCounters {
  submissions: number;
  validMoves: number;
  invalidAttempts: number;
  hintsUsed: number;
  computerMoves: number;
  /** Words formed by the player during this game, in order. */
  wordsFormed: string[];
}
