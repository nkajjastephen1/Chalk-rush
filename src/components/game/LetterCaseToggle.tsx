import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius } from '@/constants/theme';
import { useSettings } from '@/hooks/useSettings';
import { haptics } from '@/services/haptics';
import type { LetterCase } from '@/utils/word';

const OPTIONS: { id: LetterCase; label: string; a11y: string }[] = [
  { id: 'upper', label: 'ABC', a11y: 'Uppercase letters' },
  { id: 'lower', label: 'abc', a11y: 'Lowercase letters' },
];

/** Compact ABC / abc switch so the player can change letter case mid-game. */
export function LetterCaseToggle() {
  const { settings, update } = useSettings();
  return (
    <View style={styles.wrap} accessibilityRole="radiogroup" accessibilityLabel="Letter case">
      {OPTIONS.map((o) => {
        const active = settings.letterCase === o.id;
        return (
          <Pressable
            key={o.id}
            onPress={() => {
              if (active) return;
              haptics.select();
              update({ letterCase: o.id });
            }}
            hitSlop={6}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            accessibilityLabel={o.a11y}
            style={[styles.option, active && styles.active]}
          >
            <Text style={[styles.text, active && styles.textActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.creamBorder,
    backgroundColor: '#fff',
    padding: 2,
  },
  option: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, minWidth: 44, alignItems: 'center' },
  active: { backgroundColor: colors.forest },
  text: { fontFamily: fonts.hand, fontSize: 18, color: colors.inkSoft },
  textActive: { color: colors.chalk },
});
