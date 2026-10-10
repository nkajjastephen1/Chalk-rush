import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ChalkButton } from '@/components/ChalkButton';
import { DifficultyMeter } from '@/components/DifficultyMeter';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { colors, fonts, radius, softShadow } from '@/constants/theme';
import { DIFFICULTIES, DIFFICULTY_ORDER } from '@/data/difficulty';
import { useSettings } from '@/hooks/useSettings';
import { useStats } from '@/hooks/useStats';
import type { Difficulty } from '@/types/game';

export default function DifficultySelect() {
  const { settings, update, reduceMotion } = useSettings();
  const { stats } = useStats();
  const selected = settings.lastDifficulty;

  const choose = (d: Difficulty) => update({ lastDifficulty: d });
  const play = () => router.push({ pathname: '/game', params: { difficulty: selected } });

  return (
    <Screen scroll style={styles.content}>
      <ScreenHeader title="Difficulty" />
      {DIFFICULTY_ORDER.map((id, i) => {
        const d = DIFFICULTIES[id];
        const active = id === selected;
        return (
          <Animated.View key={id} entering={reduceMotion ? undefined : FadeInDown.delay(i * 70).duration(320)}>
            <Pressable
              onPress={() => choose(id)}
              onLongPress={() => {
                choose(id);
                router.push({ pathname: '/game', params: { difficulty: id } });
              }}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              accessibilityLabel={`${d.label}. ${d.description}`}
              style={[styles.card, active && styles.cardActive, softShadow(active ? 5 : 2)]}
            >
              <View style={styles.cardHead}>
                <Text style={[styles.name, active && styles.nameActive]}>
                  {i + 1}. {d.label}
                </Text>
                <DifficultyMeter level={d.level} />
              </View>
              <Text style={styles.tagline}>{d.tagline}</Text>
              <Text style={styles.desc}>{d.description}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.meta}>{d.wordLengths.join('–')} letters</Text>
                <Text style={styles.meta}>{d.hints} hints</Text>
                <Text style={styles.meta}>{d.rounds} rounds</Text>
                <Text style={styles.meta}>Best {stats.bestScoreByDifficulty[id]}</Text>
              </View>
            </Pressable>
          </Animated.View>
        );
      })}
      <ChalkButton label={`Play ${DIFFICULTIES[selected].label}`} size="lg" onPress={play} style={styles.play} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12, maxWidth: 560, width: '100%', alignSelf: 'center' },
  card: {
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.gridLineStrong,
    padding: 16,
  },
  cardActive: { backgroundColor: colors.cream, borderColor: colors.forest, borderWidth: 3 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontFamily: fonts.bold, fontSize: 22, color: colors.ink },
  nameActive: { color: colors.forest },
  tagline: { fontFamily: fonts.medium, fontSize: 15, color: colors.blue, marginTop: 2 },
  desc: { fontFamily: fonts.regular, fontSize: 15, color: colors.inkSoft, marginTop: 6, lineHeight: 21 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 },
  meta: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  play: { marginTop: 8 },
});
