import { memo, useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';

import { colors, fonts, radius } from '@/constants/theme';

export type TileStatus = 'idle' | 'selected' | 'filled' | 'changed' | 'hint';

interface Props {
  index: number;
  /** null renders an empty slot (the letter was lifted out for replacement). */
  letter: string | null;
  status: TileStatus;
  size: number;
  disabled: boolean;
  reduceMotion: boolean;
  onPress: (index: number) => void;
  accessibilityLabel: string;
}

function LetterTileBase({ index, letter, status, size, disabled, reduceMotion, onPress, accessibilityLabel }: Props) {
  const lift = useSharedValue(0);
  const pulse = useSharedValue(1);
  const active = status === 'selected' || status === 'filled';

  useEffect(() => {
    lift.set(reduceMotion ? (active ? 1 : 0) : withSpring(active ? 1 : 0, { damping: 14, stiffness: 220 }));
    if (status === 'selected' && letter === null && !reduceMotion) {
      pulse.set(withRepeat(withSequence(withTiming(0.35, { duration: 450 }), withTiming(1, { duration: 450 })), -1));
    } else {
      pulse.set(withTiming(1, { duration: 120 }));
    }
  }, [active, status, letter, reduceMotion, lift, pulse]);

  const tileStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -6 * lift.get() }, { scale: 1 + 0.06 * lift.get() }],
  }));
  const lineStyle = useAnimatedStyle(() => ({ opacity: pulse.get() }));

  const letterColor =
    status === 'filled' || status === 'changed' ? colors.blue : status === 'hint' ? '#8A5A00' : colors.ink;

  return (
    <Pressable
      onPress={() => onPress(index)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: active, disabled }}
      hitSlop={4}
    >
      <Animated.View
        style={[
          styles.tile,
          { width: size, height: size * 1.18 },
          active && styles.tileActive,
          status === 'hint' && styles.tileHint,
          tileStyle,
        ]}
      >
        {letter !== null ? (
          <Animated.Text
            key={letter}
            entering={reduceMotion ? undefined : ZoomIn.springify().damping(12)}
            exiting={reduceMotion ? undefined : FadeOut.duration(140)}
            style={[styles.letter, { fontSize: size * 0.82, lineHeight: size * 1.0, color: letterColor }]}
            allowFontScaling={false}
          >
            {letter.toUpperCase()}
          </Animated.Text>
        ) : null}
        <Animated.View
          style={[
            styles.line,
            active && styles.lineActive,
            status === 'changed' && styles.lineChanged,
            status === 'hint' && styles.lineHint,
            lineStyle,
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}

export const LetterTile = memo(LetterTileBase);

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderRadius: radius.md,
    paddingBottom: 6,
  },
  tileActive: { backgroundColor: colors.blueSoft, borderWidth: 2, borderColor: colors.blue },
  tileHint: { backgroundColor: colors.goldSoft, borderWidth: 2, borderColor: colors.gold, borderStyle: 'dashed' },
  letter: { fontFamily: fonts.hand, textAlign: 'center', includeFontPadding: false },
  line: { position: 'absolute', bottom: 6, left: '14%', right: '14%', height: 3, borderRadius: 2, backgroundColor: colors.ink },
  lineActive: { backgroundColor: colors.blue, height: 4 },
  lineChanged: { backgroundColor: colors.blue },
  lineHint: { backgroundColor: colors.gold },
});
