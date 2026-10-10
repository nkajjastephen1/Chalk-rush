import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, MIN_TOUCH, radius } from '@/constants/theme';

/** Simple back-arrow header used by secondary screens. */
export function ScreenHeader({ title }: { title: string }) {
  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))}
        style={styles.back}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={8}
      >
        <Text style={styles.arrow}>‹</Text>
      </Pressable>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <View style={styles.spacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  back: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    borderRadius: radius.pill,
    backgroundColor: colors.cream,
    borderWidth: 2,
    borderColor: colors.creamBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: { fontFamily: fonts.bold, fontSize: 32, color: colors.forest, marginTop: -4 },
  title: { flex: 1, textAlign: 'center', fontFamily: fonts.bold, fontSize: 28, color: colors.forest },
  spacer: { width: MIN_TOUCH },
});
