import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GraphPaper } from './GraphPaper';

interface Props {
  children: ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
}

/** Full-screen container: graph-paper background + safe-area padding. */
export function Screen({ children, scroll, style }: Props) {
  return (
    <View style={styles.root}>
      <GraphPaper />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
        {scroll ? (
          <ScrollView contentContainerStyle={[styles.scroll, style]} showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.fill, style]}>{children}</View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  fill: { flex: 1 },
  scroll: { flexGrow: 1, padding: 20, paddingBottom: 40 },
});
