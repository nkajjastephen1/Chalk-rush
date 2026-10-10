import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { colors, fonts, radius } from '@/constants/theme';

function ThinkingDot({ delay, reduceMotion }: { delay: number; reduceMotion: boolean }) {
  const y = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    y.set(withDelay(
      delay,
      withRepeat(withSequence(withTiming(-5, { duration: 260 }), withTiming(0, { duration: 260 })), -1),
    ));
  }, [delay, reduceMotion, y]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));
  return <Animated.View style={[styles.dot, style]} />;
}

interface Props {
  mode: 'player' | 'computer' | 'idle';
  text: string;
  movesLeft: number;
  reduceMotion: boolean;
}

export function TurnIndicator({ mode, text, movesLeft, reduceMotion }: Props) {
  return (
    <View style={styles.row}>
      <View
        style={[styles.pill, mode === 'player' && styles.player, mode === 'computer' && styles.computer]}
        accessibilityLiveRegion="polite"
        accessibilityLabel={text}
      >
        <Text style={[styles.text, mode === 'computer' && styles.textLight]}>{text}</Text>
        {mode === 'computer' ? (
          <View style={styles.dots}>
            {[0, 140, 280].map((d) => (
              <ThinkingDot key={d} delay={d} reduceMotion={reduceMotion} />
            ))}
          </View>
        ) : null}
      </View>
      <Text style={styles.moves} accessibilityLabel={`${movesLeft} moves left in this round`}>
        {movesLeft} moves left
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.gridLine,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  player: { backgroundColor: colors.blueSoft, borderColor: colors.blue },
  computer: { backgroundColor: colors.chalkboard, borderColor: colors.forestDark },
  text: { fontFamily: fonts.semibold, fontSize: 16, color: colors.blue },
  textLight: { color: colors.chalk },
  dots: { flexDirection: 'row', gap: 4, paddingTop: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.chalk },
  moves: { fontFamily: fonts.medium, fontSize: 14, color: colors.muted },
});
