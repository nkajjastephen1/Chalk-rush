import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { colors, fonts, radius, softShadow } from '@/constants/theme';

interface Props {
  size?: 'lg' | 'md';
  animated?: boolean;
}

/** Chalkboard sign with letters that drop in one by one. */
export function ChalkLogo({ size = 'lg', animated = true }: Props) {
  const letterSize = size === 'lg' ? 46 : 34;
  const renderWord = (word: string, offset: number) => (
    <View style={styles.word}>
      {word.split('').map((ch, i) => (
        <Animated.Text
          key={`${word}-${i}`}
          entering={animated ? FadeInDown.delay((offset + i) * 90).springify().damping(12) : undefined}
          style={[styles.letter, { fontSize: letterSize }, word === 'RUSH' && styles.rush]}
        >
          {ch}
        </Animated.Text>
      ))}
    </View>
  );
  return (
    <Animated.View
      entering={animated ? FadeInUp.duration(400) : undefined}
      style={[styles.board, size === 'md' && styles.boardMd, softShadow(8)]}
      accessibilityRole="header"
      accessibilityLabel="Chalk Rush"
    >
      {renderWord('CHALK', 0)}
      {renderWord('RUSH', 5)}
      <View style={styles.ledge}>
        <View style={styles.chalkStick} />
      </View>
    </Animated.View>
  );
}

export function TitleText({ children }: { children: string }) {
  return (
    <Text style={styles.title} accessibilityRole="header">
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  board: {
    backgroundColor: colors.chalkboard,
    borderColor: '#8B5E34',
    borderWidth: 8,
    borderRadius: radius.lg,
    paddingHorizontal: 28,
    paddingTop: 14,
    paddingBottom: 22,
    alignItems: 'center',
  },
  boardMd: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 18, borderWidth: 6 },
  word: { flexDirection: 'row' },
  letter: { fontFamily: fonts.hand, color: colors.chalk, letterSpacing: 3 },
  rush: { color: '#FFE08A' },
  ledge: {
    position: 'absolute',
    bottom: -2,
    left: 12,
    right: 12,
    height: 8,
    backgroundColor: '#A87447',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  chalkStick: { position: 'absolute', right: 18, top: -4, width: 22, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  title: { fontFamily: fonts.bold, fontSize: 30, color: colors.forest, textAlign: 'center' },
});
