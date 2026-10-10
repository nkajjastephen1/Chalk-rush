import { StyleSheet, View } from 'react-native';

import { colors } from '@/constants/theme';

const LEVEL_COLORS = [colors.green, colors.gold, '#E07B2A', colors.red];

export function DifficultyMeter({ level, max = 4 }: { level: number; max?: number }) {
  return (
    <View style={styles.row} accessibilityLabel={`Difficulty ${level} of ${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <View
          key={i}
          style={[
            styles.bar,
            { height: 8 + i * 5 },
            i < level ? { backgroundColor: LEVEL_COLORS[level - 1] } : styles.off,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  bar: { width: 8, borderRadius: 3 },
  off: { backgroundColor: colors.gridLineStrong },
});
