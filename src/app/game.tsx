import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, BackHandler, StyleSheet, Text, View } from 'react-native';

import { ChalkButton } from '@/components/ChalkButton';
import { Dialog } from '@/components/Dialog';
import { AlphabetGrid } from '@/components/game/AlphabetGrid';
import { Countdown } from '@/components/game/Countdown';
import { MoveChain } from '@/components/game/MoveChain';
import { TopBar } from '@/components/game/TopBar';
import { TurnIndicator } from '@/components/game/TurnIndicator';
import { WordBoard } from '@/components/game/WordBoard';
import { Screen } from '@/components/Screen';
import { colors, fonts } from '@/constants/theme';
import { isDifficulty } from '@/data/difficulty';
import { accuracyPercent, movesLeftInRound } from '@/features/game/engine';
import { computeHint } from '@/features/game/hints';
import { SCORING } from '@/features/game/scoring';
import { INVALID_MESSAGES } from '@/features/game/validation';
import { longestOf, type GameSummary } from '@/features/stats/stats';
import { useGame } from '@/hooks/useGame';
import { useSettings } from '@/hooks/useSettings';
import { useStableCallback } from '@/hooks/useStableCallback';
import { useStats } from '@/hooks/useStats';
import { haptics } from '@/services/haptics';
import { sound } from '@/services/sound';
import type { GameEvent, RoundResult } from '@/types/game';
import { replaceAt } from '@/utils/word';

type Tone = 'info' | 'error' | 'success' | 'hint';
interface Selection {
  token: number;
  index: number;
  letter: string | null;
}

const up = (w: string) => w.toUpperCase();

function messageForEvent(e: GameEvent | undefined): { text: string; tone: Tone } | null {
  if (!e) return null;
  switch (e.type) {
    case 'invalid':
      return { text: INVALID_MESSAGES[e.reason], tone: 'error' };
    case 'player_move': {
      const extras = [
        e.breakdown.newWord ? `new word +${e.breakdown.newWord}` : '',
        e.breakdown.challenging ? `tricky word +${e.breakdown.challenging}` : '',
      ].filter(Boolean);
      return {
        text: `${up(e.move.to)}! +${e.breakdown.total}${extras.length ? ` (${extras.join(', ')})` : ''}`,
        tone: 'success',
      };
    }
    case 'computer_move':
      return {
        text: `Computer changed ${up(e.move.from[e.move.position])} → ${up(e.move.letter)}: ${up(e.move.to)}. Your turn!`,
        tone: 'info',
      };
    case 'hint':
      return {
        text: `Hint: change ${up(e.hint.fromLetter)} to ${up(e.hint.letter)} to make ${up(e.hint.word)}.`,
        tone: 'hint',
      };
    case 'no_hints':
      return { text: 'No hints left this game.', tone: 'error' };
    default:
      return null;
  }
}

function roundMessage(r: RoundResult, maxMoves: number): string {
  const word = up(r.finalWord);
  switch (r.reason) {
    case 'no_moves':
      return r.outcome === 'player'
        ? `No unused word can be made from ${word}. The computer is stuck!`
        : `No unused word can be made from ${word}. You ran out of moves.`;
    case 'computer_stuck':
      return `The computer couldn't find a word from ${word}.`;
    case 'move_limit':
      return `The round reached its ${maxMoves}-move limit.`;
    case 'conceded':
      return 'You conceded the round.';
    case 'dead_start':
      return `Nobody could move from ${word}.`;
  }
}

export default function GameScreen() {
  const params = useLocalSearchParams<{ difficulty?: string }>();
  const difficulty = isDifficulty(params.difficulty) ? params.difficulty : 'simple';
  const { playedWords, recordGame, stats } = useStats();
  const { settings, reduceMotion } = useSettings();
  const { state, dictionary, actions } = useGame(difficulty, playedWords);

  const isPlayerTurn = state.phase === 'player_turn';
  const word = state.currentWord;

  // Selection is tied to the turn token, so it disappears automatically when the turn changes.
  const [rawSelection, setSelection] = useState<Selection | null>(null);
  const selection = isPlayerTurn && rawSelection?.token === state.turnToken ? rawSelection : null;
  const [localMessage, setLocalMessage] = useState<{ text: string; tone: Tone; seq: number } | null>(null);

  // ---- engine events → sound, haptics -------------------------------------------------
  const lastEventId = useRef(0);
  useEffect(() => {
    for (const e of state.events) {
      if (e.id <= lastEventId.current) continue;
      lastEventId.current = e.id;
      switch (e.type) {
        case 'invalid':
          sound.play('error');
          haptics.error();
          break;
        case 'player_move':
          sound.play('success');
          haptics.success();
          break;
        case 'computer_move':
          sound.play('chalk');
          haptics.light();
          break;
        case 'hint':
          haptics.light();
          break;
        case 'round_end':
          if (state.phase !== 'finished') {
            sound.play(e.result.outcome === 'computer' ? 'lose' : 'success');
            if (e.result.outcome === 'player') haptics.success();
            else haptics.warning();
          }
          break;
        case 'game_end':
          sound.play(e.outcome === 'computer' ? 'lose' : 'win');
          if (e.outcome === 'player') haptics.success();
          else haptics.warning();
          break;
      }
    }
  }, [state.events, state.phase]);

  // ---- record finished games exactly once ----------------------------------------------
  const recordedGameId = useRef<number | null>(null);
  const summary = useMemo<Omit<GameSummary, 'id' | 'date'> | null>(() => {
    if (state.phase !== 'finished' || !state.outcome) return null;
    return {
      difficulty,
      outcome: state.outcome,
      score: state.playerScore,
      computerScore: state.computerScore,
      roundsWon: state.roundResults.filter((r) => r.outcome === 'player').length,
      roundsLost: state.roundResults.filter((r) => r.outcome === 'computer').length,
      validWords: state.counters.validMoves,
      totalMoves: state.counters.validMoves + state.counters.computerMoves,
      accuracy: accuracyPercent(state.counters),
      longestWord: longestOf(state.counters.wordsFormed),
    };
  }, [state, difficulty]);

  useEffect(() => {
    if (!summary || recordedGameId.current === state.gameId) return;
    recordedGameId.current = state.gameId;
    const now = new Date();
    recordGame({ ...summary, id: `${now.getTime()}-${state.gameId}`, date: now.toISOString() }, state.counters.wordsFormed);
  }, [summary, state.gameId, state.counters.wordsFormed, recordGame]);

  // ---- pause on Android back and when the app goes to the background ------------------
  const pause = actions.pause;
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        pause();
        return true;
      });
      return () => sub.remove();
    }, [pause]),
  );
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') pause();
    });
    return () => sub.remove();
  }, [pause]);

  // ---- interaction handlers ----------------------------------------------------------
  const onTilePress = useStableCallback((index: number) => {
    if (!isPlayerTurn) return;
    sound.play('tap');
    haptics.select();
    setSelection(selection?.index === index ? null : { token: state.turnToken, index, letter: null });
  });

  const onLetter = useStableCallback((letter: string) => {
    if (!isPlayerTurn) return;
    if (!selection) {
      setLocalMessage({ text: 'First tap the letter in the word you want to change.', tone: 'hint', seq: state.eventSeq });
      haptics.warning();
      return;
    }
    if (letter === word[selection.index]) return;
    sound.play('chalk');
    haptics.select();
    setSelection({ ...selection, letter });
  });

  const proposed = selection?.letter ? replaceAt(word, selection.index, selection.letter) : null;

  const submit = () => {
    if (!proposed || !isPlayerTurn) return;
    actions.submit(proposed);
    // Keep the slot open after a rejected word so another letter can be tried immediately.
    setSelection((s) => (s ? { ...s, letter: null } : s));
  };

  const cancelSelection = () => setSelection(null);

  // ---- derived display -----------------------------------------------------------------
  const lastEvent = state.events[state.events.length - 1];
  const eventMessage = messageForEvent(lastEvent);
  const message =
    localMessage && localMessage.seq === state.eventSeq
      ? localMessage
      : eventMessage ??
        (isPlayerTurn
          ? { text: 'Tap a letter in the word to change it.', tone: 'info' as Tone }
          : state.phase === 'computer_turn'
            ? { text: 'The computer is choosing a word…', tone: 'info' as Tone }
            : null);

  const lastInvalid = lastEvent?.type === 'invalid' ? lastEvent.id : 0;
  const lastAccepted = lastEvent?.type === 'player_move' ? lastEvent.id : 0;
  const lastChangedIndex = state.moves.length ? state.moves[state.moves.length - 1].position : null;
  const hintIndex = isPlayerTurn && state.activeHint ? state.activeHint.position : null;
  const hintLetter = isPlayerTurn && state.activeHint ? state.activeHint.letter : null;

  const turnMode = state.phase === 'computer_turn' ? 'computer' : isPlayerTurn ? 'player' : 'idle';
  const turnText =
    turnMode === 'computer' ? 'Computer thinking' : turnMode === 'player' ? 'Your turn' : state.phase === 'paused' ? 'Paused' : 'Get ready';

  const caption = selection
    ? selection.letter
      ? `Submit ${up(proposed!)} or pick another letter`
      : `Pick a new letter for slot ${selection.index + 1}`
    : isPlayerTurn
      ? 'Tap a letter to replace it'
      : ' ';

  const lastRound = state.roundResults[state.roundResults.length - 1];
  const concedeExample =
    state.phase === 'round_over' && lastRound?.reason === 'conceded'
      ? computeHint(dictionary, state.currentWord, state.usedWords)
      : null;

  const quit = () => router.dismissTo('/home');
  const finishTitle = state.outcome === 'player' ? 'Victory!' : state.outcome === 'computer' ? 'Defeat' : 'Draw';

  return (
    <Screen>
      <TopBar
        score={state.playerScore}
        computerScore={state.computerScore}
        round={state.round}
        totalRounds={state.totalRounds}
        roundResults={state.roundResults}
        hintsRemaining={state.hintsRemaining}
        hintDisabled={!isPlayerTurn || (state.hintsRemaining === 0 && !state.activeHint)}
        reduceMotion={reduceMotion}
        onPause={actions.pause}
        onHint={actions.hint}
      />
      <View style={styles.turnRow}>
        <TurnIndicator mode={turnMode} text={turnText} movesLeft={movesLeftInRound(state)} reduceMotion={reduceMotion} />
      </View>

      <WordBoard
        word={word}
        selectedIndex={selection?.index ?? null}
        replacement={selection?.letter ?? null}
        lastChangedIndex={selection ? null : lastChangedIndex}
        hintIndex={selection ? null : hintIndex}
        interactive={isPlayerTurn}
        reduceMotion={reduceMotion}
        shakeKey={lastInvalid}
        celebrateKey={lastAccepted}
        caption={caption}
        onTilePress={onTilePress}
      />

      <View style={styles.feedback}>
        {message ? (
          <Text
            style={[styles.message, styles[message.tone]]}
            accessibilityLiveRegion="polite"
            numberOfLines={2}
          >
            {message.text}
          </Text>
        ) : null}
      </View>

      <View style={styles.actions}>
        <ChalkButton
          label="Cancel"
          variant="ghost"
          onPress={cancelSelection}
          disabled={!selection}
          style={styles.actionBtn}
          accessibilityHint="Restores the original word"
        />
        <ChalkButton
          label={proposed ? `Submit ${up(proposed)}` : 'Submit'}
          onPress={submit}
          disabled={!proposed || !isPlayerTurn}
          style={styles.submitBtn}
        />
      </View>

      <View style={styles.chain}>
        <MoveChain startWord={state.startWord} moves={state.moves} reduceMotion={reduceMotion} />
      </View>

      <View style={styles.grid}>
        <AlphabetGrid
          disabled={!isPlayerTurn}
          originalLetter={selection ? word[selection.index] : null}
          chosenLetter={selection?.letter ?? null}
          hintLetter={selection && hintLetter && state.activeHint?.position === selection.index ? hintLetter : null}
          onLetter={onLetter}
        />
      </View>

      {state.phase === 'ready' ? (
        <Countdown
          key={`${state.gameId}-${state.round}`}
          title={`Round ${state.round} of ${state.totalRounds}`}
          subtitle={state.roundStarter === 'player' ? 'You go first' : 'The computer goes first'}
          enabled={settings.countdownEnabled}
          reduceMotion={reduceMotion}
          onDone={actions.start}
        />
      ) : null}

      <Dialog visible={state.phase === 'paused'} title="Paused" onRequestClose={actions.resume} reduceMotion={reduceMotion}>
        <ChalkButton label="Resume" onPress={actions.resume} />
        <ChalkButton
          label="I'm stuck — concede round"
          variant="secondary"
          onPress={actions.concede}
          disabled={state.pausedPhase !== 'player_turn' && state.pausedPhase !== 'computer_turn'}
        />
        <ChalkButton label="Restart game" variant="secondary" onPress={actions.restart} />
        <ChalkButton label="How to play" variant="secondary" onPress={() => router.push('/how-to-play')} />
        <ChalkButton label="Quit to menu" variant="danger" onPress={quit} />
      </Dialog>

      <Dialog
        visible={state.phase === 'round_over' && !!lastRound}
        title={
          lastRound?.outcome === 'player'
            ? `Round ${lastRound.round}: you win!`
            : lastRound?.outcome === 'computer'
              ? `Round ${lastRound?.round}: computer wins`
              : `Round ${lastRound?.round}: draw`
        }
        tone={lastRound?.outcome === 'player' ? 'win' : lastRound?.outcome === 'computer' ? 'lose' : 'draw'}
        message={
          lastRound
            ? `${roundMessage(lastRound, state.maxMovesPerRound)}${
                concedeExample ? ` You could have played ${up(concedeExample.word)}.` : ''
              }${lastRound.outcome === 'player' ? ` Round bonus +${SCORING.roundWinBonus[difficulty]}.` : ''}`
            : undefined
        }
        reduceMotion={reduceMotion}
      >
        <ChalkButton label="Next round" onPress={actions.nextRound} />
        <ChalkButton label="Quit to menu" variant="ghost" onPress={quit} />
      </Dialog>

      <Dialog
        visible={state.phase === 'finished'}
        title={finishTitle}
        tone={state.outcome === 'player' ? 'win' : state.outcome === 'computer' ? 'lose' : 'draw'}
        message={
          lastRound
            ? `${roundMessage(lastRound, state.maxMovesPerRound)} Final score: ${state.playerScore}.`
            : undefined
        }
        reduceMotion={reduceMotion}
      >
        <ChalkButton
          label="See results"
          onPress={() =>
            summary &&
            router.replace({
              pathname: '/result',
              params: {
                difficulty,
                outcome: summary.outcome,
                score: String(summary.score),
                computerScore: String(summary.computerScore),
                roundsWon: String(summary.roundsWon),
                roundsLost: String(summary.roundsLost),
                validWords: String(summary.validWords),
                totalMoves: String(summary.totalMoves),
                accuracy: String(summary.accuracy),
                hintsUsed: String(state.counters.hintsUsed),
                newBest: String(summary.score > 0 && summary.score >= stats.bestScoreByDifficulty[difficulty]),
                words: state.counters.wordsFormed.slice(-12).join(','),
              },
            })
          }
        />
      </Dialog>
    </Screen>
  );
}

const styles = StyleSheet.create({
  turnRow: { marginTop: 4, marginBottom: 14 },
  feedback: { minHeight: 52, justifyContent: 'center', paddingHorizontal: 20, marginTop: 8 },
  message: { fontFamily: fonts.medium, fontSize: 16, textAlign: 'center', lineHeight: 21 },
  info: { color: colors.inkSoft },
  error: { color: colors.red },
  success: { color: colors.green },
  hint: { color: '#8A5A00' },
  actions: { flexDirection: 'row', gap: 12, paddingHorizontal: 18, maxWidth: 560, width: '100%', alignSelf: 'center' },
  actionBtn: { flex: 1 },
  submitBtn: { flex: 2 },
  chain: { flex: 1, justifyContent: 'center', minHeight: 56 },
  grid: { paddingBottom: 8 },
});
