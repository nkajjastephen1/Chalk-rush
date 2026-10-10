import { memo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { colors, GRID_SPACING } from '@/constants/theme';

/** White graph-paper background drawn with hairline views (cheap, no images). */
function GraphPaperBase() {
  const { width, height } = useWindowDimensions();
  const cols = Math.ceil(width / GRID_SPACING) + 1;
  const rows = Math.ceil(height / GRID_SPACING) + 1;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.paper]}>
      {Array.from({ length: cols }, (_, i) => (
        <View
          key={`v${i}`}
          style={[styles.v, { left: i * GRID_SPACING }, i % 5 === 0 && styles.strong]}
        />
      ))}
      {Array.from({ length: rows }, (_, i) => (
        <View
          key={`h${i}`}
          style={[styles.h, { top: i * GRID_SPACING }, i % 5 === 0 && styles.strong]}
        />
      ))}
    </View>
  );
}

export const GraphPaper = memo(GraphPaperBase);

const styles = StyleSheet.create({
  paper: { backgroundColor: colors.paper, overflow: 'hidden' },
  v: { position: 'absolute', top: 0, bottom: 0, width: StyleSheet.hairlineWidth, backgroundColor: colors.gridLine },
  h: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: colors.gridLine },
  strong: { backgroundColor: colors.gridLineStrong },
});
