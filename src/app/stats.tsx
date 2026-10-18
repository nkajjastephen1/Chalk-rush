import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { colors, fonts, radius } from '@/constants/theme';
import { DIFFICULTIES, DIFFICULTY_ORDER } from '@/data/difficulty';
import { winRate } from '@/features/stats/stats';
import { useSettings } from '@/hooks/useSettings';
import { useStats } from '@/hooks/useStats';
import { formatLetters } from '@/utils/word';

function Tile({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.tile} accessibilityLabel={`${label}: ${value}`}>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

const OUTCOME_LABEL = { player: 'Win', computer: 'Loss', draw: 'Draw' } as const;
const OUTCOME_COLOR = { player: colors.green, computer: colors.red, draw: colors.gold } as const;

export default function Stats() {
  const { stats, loaded } = useStats();
  const { letterCase } = useSettings().settings;
  return (
    <Screen scroll style={styles.content}>
      <ScreenHeader title="Statistics" />
      {!loaded ? <Text style={styles.empty}>Loading…</Text> : null}
      <View style={styles.grid}>
        <Tile label="Games" value={stats.gamesCompleted} />
        <Tile label="Wins" value={stats.wins} />
        <Tile label="Losses" value={stats.losses} />
        <Tile label="Draws" value={stats.draws} />
        <Tile label="Win rate" value={`${winRate(stats)}%`} />
        <Tile label="Best score" value={stats.bestScore} />
        <Tile label="Current streak" value={stats.currentStreak} />
        <Tile label="Best streak" value={stats.bestStreak} />
        <Tile label="Longest word" value={stats.longestWord ? formatLetters(stats.longestWord, letterCase) : '—'} />
        <Tile label="Words formed" value={stats.totalValidWords} />
      </View>

      <Text style={styles.section}>Best score by difficulty</Text>
      <View style={styles.card}>
        {DIFFICULTY_ORDER.map((d) => (
          <View key={d} style={styles.row}>
            <Text style={styles.rowKey}>{DIFFICULTIES[d].label}</Text>
            <Text style={styles.rowValue}>{stats.bestScoreByDifficulty[d]}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.section}>Recent games</Text>
      <View style={styles.card}>
        {stats.recent.length === 0 ? (
          <Text style={styles.empty}>No games yet. Go play one!</Text>
        ) : (
          stats.recent.map((g) => (
            <View key={g.id} style={styles.row}>
              <Text style={[styles.badge, { color: OUTCOME_COLOR[g.outcome] }]}>{OUTCOME_LABEL[g.outcome]}</Text>
              <Text style={styles.rowKey}>
                {DIFFICULTIES[g.difficulty].label} · {new Date(g.date).toLocaleDateString()}
              </Text>
              <Text style={styles.rowValue}>{g.score}</Text>
            </View>
          ))
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { maxWidth: 560, width: '100%', alignSelf: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    flexGrow: 1,
    flexBasis: '30%',
    backgroundColor: colors.cream,
    borderWidth: 2,
    borderColor: colors.creamBorder,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tileValue: { fontFamily: fonts.bold, fontSize: 22, color: colors.blue },
  tileLabel: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, textAlign: 'center' },
  section: { fontFamily: fonts.semibold, fontSize: 19, color: colors.forest, marginTop: 22, marginBottom: 8 },
  card: {
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.gridLineStrong,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gridLineStrong,
  },
  rowKey: { flex: 1, fontFamily: fonts.regular, fontSize: 16, color: colors.inkSoft },
  rowValue: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  badge: { fontFamily: fonts.bold, fontSize: 15, width: 44 },
  empty: { fontFamily: fonts.regular, fontSize: 16, color: colors.muted, paddingVertical: 12, textAlign: 'center' },
});
