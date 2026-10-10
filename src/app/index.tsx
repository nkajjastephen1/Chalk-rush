import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ChalkLogo } from '@/components/ChalkLogo';
import { Screen } from '@/components/Screen';
import { colors, fonts } from '@/constants/theme';
import { getEnglishDictionary } from '@/data/dictionary';
import { useSettings } from '@/hooks/useSettings';
import { sound } from '@/services/sound';

/** Animated splash: shows the logo while the dictionary and sounds warm up. */
export default function Splash() {
  const { reduceMotion } = useSettings();

  useEffect(() => {
    const started = Date.now();
    // Let the first frame render, then build the dictionary index off the critical path.
    const warm = setTimeout(() => {
      getEnglishDictionary();
      sound.preload();
      const remaining = Math.max(0, 1600 - (Date.now() - started));
      setTimeout(() => router.replace('/home'), remaining);
    }, 50);
    return () => clearTimeout(warm);
  }, []);

  return (
    <Screen style={styles.center}>
      <ChalkLogo animated={!reduceMotion} />
      <Animated.View entering={reduceMotion ? undefined : FadeIn.delay(900).duration(500)}>
        <Text style={styles.tagline}>One letter at a time.</Text>
      </Animated.View>
      <View style={styles.footer}>
        <Text style={styles.loading}>Sharpening the chalk…</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', gap: 22 },
  tagline: { fontFamily: fonts.hand, fontSize: 26, color: colors.forest },
  footer: { position: 'absolute', bottom: 28 },
  loading: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
});
