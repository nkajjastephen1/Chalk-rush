import { memo } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { colors, fonts, MIN_TOUCH, radius } from '@/constants/theme';
import { useSettings } from '@/hooks/useSettings';
import { formatLetters } from '@/utils/word';

const ROWS = ['abcdefg', 'hijklmn', 'opqrstu', 'vwxyz'];

export type KeyStatus = 'normal' | 'original' | 'chosen' | 'hint';

interface KeyProps {
  letter: string;
  status: KeyStatus;
  disabled: boolean;
  size: number;
  onPress: (letter: string) => void;
}

const Key = memo(function Key({ letter, status, disabled, size, onPress }: KeyProps) {
  const { letterCase } = useSettings().settings;
  const unavailable = disabled || status === 'original';
  return (
    <Pressable
      onPress={() => onPress(letter)}
      disabled={unavailable}
      accessibilityRole="button"
      accessibilityLabel={`Letter ${letter.toUpperCase()}`}
      accessibilityHint={status === 'original' ? 'This is the letter being replaced' : undefined}
      accessibilityState={{ disabled: unavailable, selected: status === 'chosen' }}
      style={({ pressed }) => [
        styles.key,
        { width: size, height: Math.max(MIN_TOUCH, size * 1.05) },
        status === 'chosen' && styles.chosen,
        status === 'hint' && styles.hint,
        pressed && !unavailable && styles.pressed,
      ]}
    >
      <Text
        allowFontScaling={false}
        style={[
          styles.letter,
          { fontSize: size * 0.78 },
          disabled && styles.dim,
          status === 'chosen' && { color: colors.blue },
        ]}
      >
        {formatLetters(letter, letterCase)}
      </Text>
      {status === 'original' ? <View pointerEvents="none" style={styles.strike} /> : null}
    </Pressable>
  );
});

interface Props {
  disabled: boolean;
  /** Letter being replaced at the selected position (shown struck through). */
  originalLetter: string | null;
  chosenLetter: string | null;
  hintLetter: string | null;
  onLetter: (letter: string) => void;
}

function AlphabetGridBase({ disabled, originalLetter, chosenLetter, hintLetter, onLetter }: Props) {
  const { width } = useWindowDimensions();
  const size = Math.min(60, Math.floor((Math.min(width, 520) - 24) / 7));
  const statusOf = (l: string): KeyStatus =>
    l === originalLetter ? 'original' : l === chosenLetter ? 'chosen' : l === hintLetter ? 'hint' : 'normal';
  return (
    <View style={styles.grid} accessibilityLabel="Alphabet">
      {ROWS.map((row) => (
        <View key={row} style={styles.row}>
          {row.split('').map((l) => (
            <Key key={l} letter={l} status={statusOf(l)} disabled={disabled} size={size} onPress={onLetter} />
          ))}
        </View>
      ))}
    </View>
  );
}

export const AlphabetGrid = memo(AlphabetGridBase);

const styles = StyleSheet.create({
  grid: { alignItems: 'center', gap: 2 },
  row: { flexDirection: 'row', justifyContent: 'center' },
  key: { alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
  letter: { fontFamily: fonts.hand, color: colors.ink, includeFontPadding: false },
  dim: { color: '#9AA0A6' },
  chosen: { backgroundColor: colors.blueSoft, borderWidth: 2, borderColor: colors.blue },
  hint: { backgroundColor: colors.goldSoft, borderWidth: 2, borderColor: colors.gold, borderStyle: 'dashed' },
  pressed: { backgroundColor: 'rgba(30,63,174,0.12)' },
  strike: {
    position: 'absolute',
    width: '62%',
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.ink,
    transform: [{ rotate: '-18deg' }],
  },
});
