import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { colors, fonts, MIN_TOUCH, radius, softShadow } from '@/constants/theme';
import { haptics } from '@/services/haptics';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  icon?: ReactNode;
  size?: 'md' | 'lg' | 'sm';
  style?: ViewStyle;
  /** Defaults to `label`. */
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

const PALETTE: Record<Variant, { bg: string; fg: string; border: string }> = {
  primary: { bg: colors.forest, fg: colors.chalk, border: colors.forestDark },
  secondary: { bg: colors.cream, fg: colors.ink, border: colors.creamBorder },
  ghost: { bg: 'rgba(255,255,255,0.85)', fg: colors.forest, border: colors.gridLineStrong },
  danger: { bg: colors.red, fg: '#fff', border: '#8E2A20' },
  gold: { bg: colors.gold, fg: colors.ink, border: '#B88412' },
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function ChalkButton({
  label,
  onPress,
  variant = 'primary',
  disabled,
  icon,
  size = 'md',
  style,
  accessibilityLabel,
  accessibilityHint,
}: Props) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  const p = PALETTE[variant];
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPressIn={() => {
        scale.set(withSpring(0.96, { damping: 20, stiffness: 400 }));
      }}
      onPressOut={() => {
        scale.set(withSpring(1, { damping: 14, stiffness: 300 }));
      }}
      onPress={() => {
        haptics.select();
        onPress();
      }}
      style={[
        styles.base,
        size === 'lg' && styles.lg,
        size === 'sm' && styles.sm,
        { backgroundColor: p.bg, borderColor: p.border },
        variant !== 'ghost' && softShadow(3),
        disabled && styles.disabled,
        animated,
        style,
      ]}
    >
      <View style={styles.row}>
        {icon}
        <Text
          style={[styles.label, size === 'lg' && styles.labelLg, size === 'sm' && styles.labelSm, { color: p.fg }]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: MIN_TOUCH,
    paddingHorizontal: 20,
    borderRadius: radius.lg,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lg: { minHeight: 62, borderRadius: radius.xl, paddingHorizontal: 28 },
  sm: { minHeight: 40, paddingHorizontal: 14, borderRadius: radius.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontFamily: fonts.semibold, fontSize: 18 },
  labelLg: { fontSize: 24 },
  labelSm: { fontSize: 15 },
  disabled: { opacity: 0.45 },
});
