import { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';

import { colors, fonts } from '@/constants/theme';
import { useSettings } from '@/hooks/useSettings';
import type { Move } from '@/types/game';
import { formatLetters } from '@/utils/word';

interface Props {
  startWord: string;
  moves: readonly Move[];
  reduceMotion: boolean;
}

/** Horizontal chalk trail of the round so far: CAT → COT → DOT … */
export function MoveChain({ startWord, moves, reduceMotion }: Props) {
  const { letterCase } = useSettings().settings;
  const scroll = useRef<ScrollView>(null);
  useEffect(() => {
    const t = setTimeout(() => scroll.current?.scrollToEnd({ animated: !reduceMotion }), 50);
    return () => clearTimeout(t);
  }, [moves.length, reduceMotion]);

  const label = [startWord, ...moves.map((m) => m.to)].join(', ');
  return (
    <View style={styles.wrap} accessibilityLabel={`Words this round: ${label}`}>
      <ScrollView
        ref={scroll}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Text style={[styles.word, styles.start]}>{formatLetters(startWord, letterCase)}</Text>
        {moves.map((m, i) => (
          <Animated.View
            key={`${i}-${m.to}`}
            entering={reduceMotion ? undefined : FadeInRight.duration(260)}
            style={styles.item}
          >
            <Text style={styles.arrow}>→</Text>
            <Text style={[styles.word, m.by === 'player' ? styles.player : styles.computer]}>
              {m.to.split('').map((ch, idx) => (
                <Text key={idx} style={idx === m.position ? styles.changed : undefined}>
                  {formatLetters(ch, letterCase)}
                </Text>
              ))}
            </Text>
          </Animated.View>
        ))}
      </ScrollView>
      <View style={styles.legend}>
        <View style={[styles.swatch, { backgroundColor: colors.blue }]} />
        <Text style={styles.legendText}>You</Text>
        <View style={[styles.swatch, { backgroundColor: colors.forest }]} />
        <Text style={styles.legendText}>Computer</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { minHeight: 64, justifyContent: 'center' },
  content: { alignItems: 'center', paddingHorizontal: 18, gap: 6 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  word: { fontFamily: fonts.hand, fontSize: 24, letterSpacing: 1 },
  start: { color: colors.inkSoft },
  player: { color: colors.blue },
  computer: { color: colors.forest },
  changed: { textDecorationLine: 'underline' },
  arrow: { fontFamily: fonts.regular, fontSize: 18, color: colors.muted },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 18, marginTop: 2 },
  swatch: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginRight: 8 },
});
