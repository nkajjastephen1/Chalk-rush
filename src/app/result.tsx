import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  BounceIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { ChalkButton } from '@/components/ChalkButton';
import { Screen } from '@/components/Screen';
import { colors, fonts, radius, softShadow } from '@/constants/theme';
import { DIFFICULTIES, isDifficulty } from '@/data/difficulty';
import { useSettings } from '@/hooks/useSettings';

type Params = Record<
  | 'difficulty'
  | 'outcome'
  | 'score'
  | 'computerScore'
  | 'roundsWon'
  | 'roundsLost'
  | 'validWords'
  | 'totalMoves'
  | 'accuracy'
  | 'hintsUsed'
  | 'newBest'
  | 'words',
  string
>;

const CONFETTI = ['#1E3FAE', '#2E8B57', '#E5A823', '#C0392B', '#1F5135'];

function Confetti({ index }: { index: number }) {
  const y = useSharedValue(0);
  useEffect(() => {
    y.set(withRepeat(
      withSequence(withTiming(10, { duration: 600 + index * 40 }), withTiming(0, { duration: 600 + index * 40 })),
      -1,
    ));
  }, [index, y]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }, { rotate: `${index * 37}deg` }] }));
  return (
    <Animated.View
      entering={BounceIn.delay(index * 60)}
      style={[styles.confetti, { backgroundColor: CONFETTI[index % CONFETTI.length] }, style]}
    />
  );
}

export default function Result() {
  const p = useLocalSearchParams<Partial<Params>>();
  const { reduceMotion } = useSettings();
  const difficulty = isDifficulty(p.difficulty) ? p.difficulty : 'simple';
  const outcome = p.outcome === 'player' || p.outcome === 'computer' ? p.outcome : 'draw';
  const title = outcome === 'player' ? 'You Win!' : outcome === 'computer' ? 'You Lose' : "It's a Draw";
  const subtitle =
    outcome === 'player'
      ? 'The computer ran out of words.'
      : outcome === 'computer'
        ? 'Good effort — the computer outplayed you this time.'
        : 'An even match!';
  const tone = outcome === 'player' ? colors.green : outcome === 'computer' ? colors.red : colors.gold;
  const words = (p.words ?? '').split(',').filter(Boolean);

  const rows: [string, string][] = [
    ['Difficulty', DIFFICULTIES[difficulty].label],
    ['Rounds won', `${p.roundsWon ?? 0} – ${p.roundsLost ?? 0}`],
    ['Valid words formed', p.validWords ?? '0'],
    ['Accuracy', `${p.accuracy ?? 100}%`],
    ['Total moves', p.totalMoves ?? '0'],
    ['Hints used', p.hintsUsed ?? '0'],
    ['Computer score', p.computerScore ?? '0'],
  ];

  return (
    <Screen scroll style={styles.content}>
      <View style={styles.hero}>
        {outcome === 'player' && !reduceMotion ? (
          <View style={styles.confettiRow} pointerEvents="none">
            {Array.from({ length: 10 }, (_, i) => (
              <Confetti key={i} index={i} />
            ))}
          </View>
        ) : null}
        <Animated.Text
          entering={reduceMotion ? undefined : outcome === 'player' ? BounceIn.duration(700) : FadeInDown.duration(500)}
          style={[styles.title, { color: tone }]}
          accessibilityRole="header"
        >
          {title}
        </Animated.Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      <Animated.View entering={reduceMotion ? undefined : FadeInDown.delay(200)} style={[styles.scoreCard, softShadow(5)]}>
        <Text style={styles.scoreLabel}>Final score</Text>
        <Text style={styles.score}>{p.score ?? 0}</Text>
        {p.newBest === 'true' ? <Text style={styles.best}>New best for {DIFFICULTIES[difficulty].label}!</Text> : null}
      </Animated.View>

      <Animated.View entering={reduceMotion ? undefined : FadeInDown.delay(320)} style={styles.table}>
        {rows.map(([k, v]) => (
          <View key={k} style={styles.row}>
            <Text style={styles.key}>{k}</Text>
            <Text style={styles.value}>{v}</Text>
          </View>
        ))}
      </Animated.View>

      {words.length ? (
        <View style={styles.words}>
          <Text style={styles.wordsTitle}>Your words</Text>
          <Text style={styles.wordsList}>{words.map((w) => w.toUpperCase()).join('  ·  ')}</Text>
        </View>
      ) : null}

      <View style={styles.buttons}>
        <ChalkButton
          label="Play Again"
          size="lg"
          onPress={() => router.replace({ pathname: '/game', params: { difficulty } })}
        />
        <ChalkButton label="Change Difficulty" variant="secondary" onPress={() => router.dismissTo('/difficulty')} />
        <ChalkButton label="Home" variant="ghost" onPress={() => router.dismissTo('/home')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 18, maxWidth: 520, width: '100%', alignSelf: 'center' },
  hero: { alignItems: 'center', marginTop: 16 },
  confettiRow: { flexDirection: 'row', gap: 14, marginBottom: 10 },
  confetti: { width: 10, height: 16, borderRadius: 3 },
  title: { fontFamily: fonts.bold, fontSize: 44 },
  subtitle: { fontFamily: fonts.regular, fontSize: 17, color: colors.inkSoft, textAlign: 'center', marginTop: 4 },
  scoreCard: {
    alignItems: 'center',
    backgroundColor: colors.cream,
    borderColor: colors.creamBorder,
    borderWidth: 3,
    borderRadius: radius.xl,
    paddingVertical: 18,
  },
  scoreLabel: { fontFamily: fonts.medium, fontSize: 16, color: colors.inkSoft },
  score: { fontFamily: fonts.bold, fontSize: 56, color: colors.blue, lineHeight: 64 },
  best: { fontFamily: fonts.semibold, fontSize: 15, color: colors.green },
  table: {
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.gridLineStrong,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gridLineStrong,
  },
  key: { fontFamily: fonts.regular, fontSize: 16, color: colors.inkSoft },
  value: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  words: { alignItems: 'center' },
  wordsTitle: { fontFamily: fonts.medium, fontSize: 15, color: colors.muted },
  wordsList: { fontFamily: fonts.hand, fontSize: 22, color: colors.blue, textAlign: 'center', marginTop: 4 },
  buttons: { gap: 12, marginTop: 4 },
});
