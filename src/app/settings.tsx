import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { ChalkButton } from '@/components/ChalkButton';
import { Dialog } from '@/components/Dialog';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { colors, fonts, MIN_TOUCH, radius } from '@/constants/theme';
import { useSettings } from '@/hooks/useSettings';
import { useStats } from '@/hooks/useStats';
import { sound } from '@/services/sound';
import type { Settings } from '@/services/storage';

function ToggleRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.desc}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        trackColor={{ true: colors.forest, false: colors.gridLineStrong }}
        thumbColor={value ? colors.cream : '#fff'}
      />
    </View>
  );
}

const MOTION_OPTIONS: { id: Settings['reduceMotion']; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'on', label: 'Reduced' },
  { id: 'off', label: 'Full' },
];

const CASE_OPTIONS: { id: Settings['letterCase']; label: string; a11y: string }[] = [
  { id: 'upper', label: 'ABC', a11y: 'Uppercase' },
  { id: 'lower', label: 'abc', a11y: 'Lowercase' },
];

export default function SettingsScreen() {
  const { settings, update, reduceMotion } = useSettings();
  const { reset } = useStats();
  const [confirming, setConfirming] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  return (
    <Screen scroll style={styles.content}>
      <ScreenHeader title="Settings" />
      <View style={styles.card}>
        <ToggleRow
          label="Sound effects"
          description="Chalk, success, error and win/loss sounds."
          value={settings.soundEnabled}
          onChange={(v) => {
            update({ soundEnabled: v });
            if (v) {
              sound.setEnabled(true);
              sound.play('success');
            }
          }}
        />
        <ToggleRow
          label="Vibration"
          description="Haptic feedback on taps, moves and errors."
          value={settings.hapticsEnabled}
          onChange={(v) => update({ hapticsEnabled: v })}
        />
        <ToggleRow
          label="Round countdown"
          description="Show a 3-2-1 countdown before each round."
          value={settings.countdownEnabled}
          onChange={(v) => update({ countdownEnabled: v })}
        />
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>Letter case</Text>
            <Text style={styles.desc}>Show letters as capitals or small letters. You can also switch during a game.</Text>
            <View style={styles.segment} accessibilityRole="radiogroup">
              {CASE_OPTIONS.map((o) => {
                const active = settings.letterCase === o.id;
                return (
                  <Pressable
                    key={o.id}
                    onPress={() => update({ letterCase: o.id })}
                    style={[styles.segmentItem, active && styles.segmentActive]}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: active }}
                    accessibilityLabel={`Letter case: ${o.a11y}`}
                  >
                    <Text style={[styles.segmentText, styles.caseText, active && styles.segmentTextActive]}>{o.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
        <View style={[styles.row, styles.lastRow]}>
          <View style={styles.rowText}>
            <Text style={styles.label}>Motion</Text>
            <Text style={styles.desc}>Reduce animations. “System” follows your device setting.</Text>
            <View style={styles.segment} accessibilityRole="radiogroup">
              {MOTION_OPTIONS.map((o) => {
                const active = settings.reduceMotion === o.id;
                return (
                  <Pressable
                    key={o.id}
                    onPress={() => update({ reduceMotion: o.id })}
                    style={[styles.segmentItem, active && styles.segmentActive]}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: active }}
                    accessibilityLabel={`Motion: ${o.label}`}
                  >
                    <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{o.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </View>

      <Text style={styles.note}>Background music is not included in this version.</Text>

      <ChalkButton
        label={resetDone ? 'Statistics reset' : 'Reset statistics'}
        variant="danger"
        onPress={() => setConfirming(true)}
        style={styles.reset}
      />

      <Dialog
        visible={confirming}
        title="Reset statistics?"
        message="This permanently deletes your scores, streaks, game history and word history."
        tone="lose"
        onRequestClose={() => setConfirming(false)}
        reduceMotion={reduceMotion}
      >
        <ChalkButton
          label="Yes, reset everything"
          variant="danger"
          onPress={async () => {
            await reset();
            setConfirming(false);
            setResetDone(true);
          }}
        />
        <ChalkButton label="Cancel" variant="secondary" onPress={() => setConfirming(false)} />
      </Dialog>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { maxWidth: 560, width: '100%', alignSelf: 'center' },
  card: {
    backgroundColor: colors.cream,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.creamBorder,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: MIN_TOUCH + 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.creamBorder,
  },
  lastRow: { borderBottomWidth: 0 },
  rowText: { flex: 1 },
  label: { fontFamily: fonts.semibold, fontSize: 18, color: colors.ink },
  desc: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, marginTop: 2 },
  segment: { flexDirection: 'row', marginTop: 10, gap: 8 },
  segmentItem: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.creamBorder,
    backgroundColor: '#fff',
  },
  segmentActive: { backgroundColor: colors.forest, borderColor: colors.forestDark },
  segmentText: { fontFamily: fonts.medium, fontSize: 15, color: colors.ink },
  segmentTextActive: { color: colors.chalk },
  caseText: { fontFamily: fonts.hand, fontSize: 20 },
  note: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, marginTop: 12, textAlign: 'center' },
  reset: { marginTop: 24 },
});
