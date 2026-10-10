import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { ZoomIn, ZoomOut } from 'react-native-reanimated';

import { colors, fonts } from '@/constants/theme';

interface Props {
  title: string;
  subtitle: string;
  enabled: boolean;
  reduceMotion: boolean;
  onDone: () => void;
}

/** Short 3-2-1 overlay before a round starts. Calls onDone immediately when disabled. */
export function Countdown({ title, subtitle, enabled, reduceMotion, onDone }: Props) {
  const [count, setCount] = useState(enabled ? 3 : 0);

  useEffect(() => {
    if (count <= 0) {
      const t = setTimeout(onDone, enabled ? 450 : 0);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setCount((c) => c - 1), 700);
    return () => clearTimeout(t);
  }, [count, enabled, onDone]);

  if (!enabled) return null;
  return (
    <View style={styles.overlay} pointerEvents="none" accessibilityLiveRegion="assertive">
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <Animated.Text
        key={count}
        entering={reduceMotion ? undefined : ZoomIn.duration(250)}
        exiting={reduceMotion ? undefined : ZoomOut.duration(200)}
        style={styles.count}
        accessibilityLabel={count > 0 ? String(count) : 'Go'}
      >
        {count > 0 ? count : 'GO!'}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(46, 74, 59, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  title: { fontFamily: fonts.bold, fontSize: 30, color: colors.chalk },
  subtitle: { fontFamily: fonts.regular, fontSize: 18, color: colors.cream, marginTop: 6 },
  count: { fontFamily: fonts.hand, fontSize: 120, color: colors.chalk, marginTop: 18 },
});
