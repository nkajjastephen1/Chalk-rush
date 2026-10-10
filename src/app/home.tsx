import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ChalkButton } from '@/components/ChalkButton';
import { ChalkLogo } from '@/components/ChalkLogo';
import { Screen } from '@/components/Screen';
import { colors, fonts, radius, softShadow } from '@/constants/theme';
import { useSettings } from '@/hooks/useSettings';
import { useStats } from '@/hooks/useStats';

export default function Home() {
  const { stats } = useStats();
  const { reduceMotion } = useSettings();
  const enter = (i: number) => (reduceMotion ? undefined : FadeInDown.delay(120 + i * 70).duration(380));

  return (
    <Screen scroll style={styles.content}>
      <View style={styles.logo}>
        <ChalkLogo size="md" animated={!reduceMotion} />
      </View>
      <Animated.Text entering={enter(0)} style={styles.description}>
        Change one letter at a time to make a new word. Outwit the computer until it runs out of moves!
      </Animated.Text>

      <Animated.View entering={enter(1)} style={[styles.statsCard, softShadow(3)]}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{stats.bestScore}</Text>
          <Text style={styles.statLabel}>Best score</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{stats.gamesCompleted}</Text>
          <Text style={styles.statLabel}>Games played</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{stats.currentStreak}</Text>
          <Text style={styles.statLabel}>Win streak</Text>
        </View>
      </Animated.View>

      <Animated.View entering={enter(2)} style={styles.play}>
        <ChalkButton
          label="Play"
          size="lg"
          onPress={() => router.push('/difficulty')}
          accessibilityHint="Choose a difficulty and start a game"
        />
      </Animated.View>

      <Animated.View entering={enter(3)} style={styles.grid}>
        <ChalkButton label="How to Play" variant="secondary" onPress={() => router.push('/how-to-play')} style={styles.half} />
        <ChalkButton label="Statistics" variant="secondary" onPress={() => router.push('/stats')} style={styles.half} />
        <ChalkButton label="Settings" variant="secondary" onPress={() => router.push('/settings')} style={styles.half} />
        <ChalkButton label="About" variant="secondary" onPress={() => router.push('/about')} style={styles.half} />
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: 'stretch', justifyContent: 'center', gap: 20, maxWidth: 520, width: '100%', alignSelf: 'center' },
  logo: { alignItems: 'center', marginTop: 8 },
  description: {
    fontFamily: fonts.regular,
    fontSize: 17,
    lineHeight: 24,
    color: colors.inkSoft,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: colors.cream,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.creamBorder,
    paddingVertical: 14,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontFamily: fonts.bold, fontSize: 26, color: colors.blue },
  statLabel: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  divider: { width: 1, backgroundColor: colors.creamBorder },
  play: { marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  half: { flexGrow: 1, flexBasis: '45%' },
});
