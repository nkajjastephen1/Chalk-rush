import type { ReactNode } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import { colors, fonts, radius, softShadow } from '@/constants/theme';

interface Props {
  visible: boolean;
  title: string;
  message?: string;
  children?: ReactNode;
  onRequestClose?: () => void;
  reduceMotion?: boolean;
  tone?: 'default' | 'win' | 'lose' | 'draw';
}

const TONE_COLOR = { default: colors.forest, win: colors.green, lose: colors.red, draw: colors.gold };

/** Cream card modal used for pause, round results and confirmations. */
export function Dialog({ visible, title, message, children, onRequestClose, reduceMotion, tone = 'default' }: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onRequestClose}
    >
      <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(160)} style={styles.backdrop}>
        <Animated.View
          entering={reduceMotion ? undefined : ZoomIn.springify().damping(16)}
          style={[styles.card, softShadow(10)]}
          accessibilityViewIsModal
        >
          <View style={[styles.stripe, { backgroundColor: TONE_COLOR[tone] }]} />
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <View style={styles.body}>{children}</View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.cream,
    borderRadius: radius.xl,
    borderWidth: 3,
    borderColor: colors.creamBorder,
    paddingHorizontal: 22,
    paddingBottom: 22,
    paddingTop: 26,
    overflow: 'hidden',
  },
  stripe: { position: 'absolute', top: 0, left: 0, right: 0, height: 8 },
  title: { fontFamily: fonts.bold, fontSize: 28, color: colors.ink, textAlign: 'center' },
  message: {
    fontFamily: fonts.regular,
    fontSize: 17,
    color: colors.inkSoft,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 23,
  },
  body: { marginTop: 18, gap: 10 },
});
