import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { colors, fonts, radius } from '@/constants/theme';
import { SCORING } from '@/features/game/scoring';

const STEPS = [
  'Tap a letter in the word. It lifts out and leaves an empty slot.',
  'Tap a letter in the alphabet to drop it into the slot. Changed your mind? Tap another letter, or Cancel.',
  'Press Submit. If the new word is real English and hasn’t been used this round, it’s accepted.',
  'The computer then changes one letter of your word. Take turns until someone is stuck.',
];

const RULES = [
  'Change exactly one letter per move. Word length never changes.',
  'Every word must be in the dictionary.',
  'A word can only be used once per round.',
  'If it’s your turn and no new word can be made, you lose the round — same for the computer.',
  'Each round has a move limit; reaching it makes the round a draw.',
  'Win the most rounds (out of 3) to win the game.',
];

export default function HowToPlay() {
  return (
    <Screen scroll style={styles.content}>
      <ScreenHeader title="How to Play" />

      <View style={styles.example} accessibilityLabel="Example: CAT, COT, DOT, DOG, LOG, LAG">
        <Text style={styles.exampleText}>CAT → COT → DOT → DOG → LOG → LAG</Text>
      </View>

      <Text style={styles.section}>Your turn</Text>
      {STEPS.map((s, i) => (
        <View key={i} style={styles.item}>
          <Text style={styles.num}>{i + 1}</Text>
          <Text style={styles.text}>{s}</Text>
        </View>
      ))}

      <Text style={styles.section}>Rules</Text>
      {RULES.map((r, i) => (
        <View key={i} style={styles.item}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.text}>{r}</Text>
        </View>
      ))}

      <Text style={styles.section}>Scoring</Text>
      <View style={styles.card}>
        <Text style={styles.text}>+{SCORING.validMove} for each valid word</Text>
        <Text style={styles.text}>+{SCORING.newWordBonus} for a word you’ve never played before</Text>
        <Text style={styles.text}>+{SCORING.challengingWordBonus} for a less common word</Text>
        <Text style={styles.text}>Round and game bonuses grow with difficulty</Text>
        <Text style={styles.text}>A move taken straight from a hint scores {SCORING.hintedMove}</Text>
        <Text style={styles.text}>Invalid attempts never cost points</Text>
      </View>

      <Text style={styles.section}>Hints</Text>
      <Text style={styles.text}>
        Tap the gold “?” button to reveal a real move from the dictionary. The red badge shows how many hints are
        left. Stuck with no idea? Pause and concede the round.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { maxWidth: 560, width: '100%', alignSelf: 'center', gap: 6 },
  example: {
    backgroundColor: colors.chalkboard,
    borderRadius: radius.lg,
    borderWidth: 5,
    borderColor: '#8B5E34',
    padding: 14,
    alignItems: 'center',
  },
  exampleText: { fontFamily: fonts.hand, fontSize: 22, color: colors.chalk, textAlign: 'center' },
  section: { fontFamily: fonts.semibold, fontSize: 20, color: colors.forest, marginTop: 16, marginBottom: 4 },
  item: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 6 },
  num: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.blue,
    color: '#fff',
    textAlign: 'center',
    fontFamily: fonts.bold,
    fontSize: 15,
    lineHeight: 26,
    overflow: 'hidden',
  },
  bullet: { fontFamily: fonts.bold, fontSize: 18, color: colors.blue, width: 14 },
  text: { flex: 1, fontFamily: fonts.regular, fontSize: 16, lineHeight: 23, color: colors.inkSoft },
  card: {
    backgroundColor: colors.cream,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.creamBorder,
    padding: 14,
    gap: 4,
  },
});
