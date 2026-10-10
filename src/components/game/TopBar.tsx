import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeOutUp, SlideInDown } from 'react-native-reanimated';

import { colors, fonts, MIN_TOUCH, radius, softShadow } from '@/constants/theme';
import type { RoundResult } from '@/types/game';

interface Props {
  score: number;
  computerScore: number;
  round: number;
  totalRounds: number;
  roundResults: readonly RoundResult[];
  hintsRemaining: number;
  hintDisabled: boolean;
  reduceMotion: boolean;
  onPause: () => void;
  onHint: () => void;
}

export function PauseGlyph({ color = '#fff', size = 18 }: { color?: string; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: size * 0.28 }}>
      <View style={{ width: size * 0.3, height: size, borderRadius: 3, backgroundColor: color }} />
      <View style={{ width: size * 0.3, height: size, borderRadius: 3, backgroundColor: color }} />
    </View>
  );
}

/** Animated "+N" that floats above the score whenever it increases. */
function ScoreDelta({ score, reduceMotion }: { score: number; reduceMotion: boolean }) {
  const prev = useRef(score);
  const [delta, setDelta] = useState<{ value: number; key: number } | null>(null);
  useEffect(() => {
    const d = score - prev.current;
    prev.current = score;
    if (d <= 0) return;
    const key = Date.now();
    setDelta({ value: d, key });
    const t = setTimeout(() => setDelta((cur) => (cur?.key === key ? null : cur)), 1100);
    return () => clearTimeout(t);
  }, [score]);
  if (!delta) return null;
  return (
    <Animated.Text
      key={delta.key}
      entering={reduceMotion ? undefined : SlideInDown.springify().damping(14)}
      exiting={reduceMotion ? undefined : FadeOutUp.duration(300)}
      style={styles.delta}
      accessibilityLiveRegion="polite"
    >
      +{delta.value}
    </Animated.Text>
  );
}

export function TopBar({
  score,
  computerScore,
  round,
  totalRounds,
  roundResults,
  hintsRemaining,
  hintDisabled,
  reduceMotion,
  onPause,
  onHint,
}: Props) {
  return (
    <View style={styles.bar}>
      <Pressable
        onPress={onPause}
        style={[styles.circle, softShadow(3)]}
        accessibilityRole="button"
        accessibilityLabel="Pause game"
        hitSlop={6}
      >
        <PauseGlyph />
      </Pressable>

      <View style={styles.block} accessibilityLabel={`Round ${round} of ${totalRounds}`}>
        <Text style={styles.label}>Round</Text>
        <Text style={styles.round}>
          {round}/{totalRounds}
        </Text>
        <View style={styles.dots}>
          {Array.from({ length: totalRounds }, (_, i) => {
            const r = roundResults[i];
            const bg = !r ? colors.gridLineStrong : r.outcome === 'player' ? colors.green : r.outcome === 'computer' ? colors.red : colors.gold;
            return <View key={i} style={[styles.dot, { backgroundColor: bg }]} />;
          })}
        </View>
      </View>

      <View style={styles.block} accessibilityLabel={`Your score ${score}`}>
        <Text style={styles.label}>Score</Text>
        <Text style={styles.score}>{score}</Text>
        <View style={styles.deltaWrap} pointerEvents="none">
          <ScoreDelta score={score} reduceMotion={reduceMotion} />
        </View>
      </View>

      <View style={styles.block} accessibilityLabel={`Computer score ${computerScore}`}>
        <Text style={styles.label}>CPU</Text>
        <Text style={styles.cpu}>{computerScore}</Text>
      </View>

      <Pressable
        onPress={onHint}
        disabled={hintDisabled}
        style={[styles.circle, styles.hintBtn, softShadow(3), hintDisabled && styles.disabled]}
        accessibilityRole="button"
        accessibilityLabel={`Hint, ${hintsRemaining} remaining`}
        accessibilityState={{ disabled: hintDisabled }}
        hitSlop={6}
      >
        <Text style={styles.hintGlyph}>?</Text>
        <View style={[styles.badge, hintsRemaining === 0 && styles.badgeEmpty]}>
          <Text style={styles.badgeText}>{hintsRemaining}</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 4,
  },
  circle: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    borderRadius: radius.pill,
    backgroundColor: colors.forest,
    borderWidth: 2,
    borderColor: colors.forestDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintBtn: { backgroundColor: colors.gold, borderColor: '#B88412' },
  hintGlyph: { fontFamily: fonts.bold, fontSize: 26, color: colors.ink, marginTop: -2 },
  disabled: { opacity: 0.5 },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 4,
    borderRadius: 11,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeEmpty: { backgroundColor: colors.muted },
  badgeText: { color: '#fff', fontFamily: fonts.bold, fontSize: 12 },
  block: { alignItems: 'center', minWidth: 56 },
  label: { fontFamily: fonts.medium, fontSize: 13, color: colors.inkSoft },
  round: { fontFamily: fonts.bold, fontSize: 22, color: colors.blue, lineHeight: 26 },
  score: { fontFamily: fonts.bold, fontSize: 26, color: colors.blue, lineHeight: 30 },
  cpu: { fontFamily: fonts.bold, fontSize: 22, color: colors.forest, lineHeight: 26 },
  dots: { flexDirection: 'row', gap: 4, marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  deltaWrap: { position: 'absolute', top: -2, right: -22 },
  delta: { fontFamily: fonts.bold, fontSize: 18, color: colors.green },
});
