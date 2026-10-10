import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

let enabled = true;
const supported = Platform.OS === 'ios' || Platform.OS === 'android';

const safe = (fn: () => Promise<void>) => {
  if (!enabled || !supported) return;
  fn().catch(() => {});
};

export const haptics = {
  setEnabled(value: boolean) {
    enabled = value;
  },
  select: () => safe(() => Haptics.selectionAsync()),
  light: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  success: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  error: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
  warning: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};
