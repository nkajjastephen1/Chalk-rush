import { useEffect } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { colors, fonts, radius, softShadow } from '@/constants/theme';

import { LetterTile, type TileStatus } from './LetterTile';

interface Props {
  word: string;
  selectedIndex: number | null;
  replacement: string | null;
  /** Position changed by the most recent move (highlighted in blue). */
  lastChangedIndex: number | null;
  hintIndex: number | null;
  interactive: boolean;
  reduceMotion: boolean;
  /** Change these keys to trigger the shake / celebrate animations. */
  shakeKey: number;
  celebrateKey: number;
  caption: string;
  onTilePress: (index: number) => void;
}

export function WordBoard({
  word,
  selectedIndex,
  replacement,
  lastChangedIndex,
  hintIndex,
  interactive,
  reduceMotion,
  shakeKey,
  celebrateKey,
  caption,
  onTilePress,
}: Props) {
  const { width } = useWindowDimensions();
  const panelWidth = Math.min(width - 32, 520);
  const tileSize = Math.min(72, Math.floor((panelWidth - 40 - (word.length - 1) * 8) / word.length));

  const shakeX = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (!shakeKey || reduceMotion) return;
    shakeX.set(withSequence(
      withTiming(-12, { duration: 50 }),
      withTiming(12, { duration: 70 }),
      withTiming(-8, { duration: 60 }),
      withTiming(8, { duration: 60 }),
      withTiming(0, { duration: 50 }),
    ));
  }, [shakeKey, reduceMotion, shakeX]);

  useEffect(() => {
    if (!celebrateKey || reduceMotion) return;
    scale.set(withSequence(withTiming(1.07, { duration: 140 }), withSpring(1, { damping: 8, stiffness: 180 })));
  }, [celebrateKey, reduceMotion, scale]);

  const animated = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.get() }, { scale: scale.get() }],
  }));

  return (
    <Animated.View style={[styles.panel, { width: panelWidth }, softShadow(5), animated]}>
      <View style={styles.row} accessibilityRole="none">
        {word.split('').map((ch, i) => {
          const isSelected = i === selectedIndex;
          const letter = isSelected ? replacement : ch;
          let status: TileStatus = 'idle';
          if (isSelected) status = replacement ? 'filled' : 'selected';
          else if (i === hintIndex) status = 'hint';
          else if (i === lastChangedIndex) status = 'changed';
          const label = isSelected
            ? replacement
              ? `Letter ${i + 1}, replaced with ${replacement.toUpperCase()}. Tap to cancel.`
              : `Letter ${i + 1}, empty slot. Choose a letter below.`
            : `Letter ${i + 1}, ${ch.toUpperCase()}. Tap to replace.`;
          return (
            <LetterTile
              key={i}
              index={i}
              letter={letter}
              status={status}
              size={tileSize}
              disabled={!interactive}
              reduceMotion={reduceMotion}
              onPress={onTilePress}
              accessibilityLabel={label}
            />
          );
        })}
      </View>
      <Text style={styles.caption} numberOfLines={1}>
        {caption}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: {
    alignSelf: 'center',
    backgroundColor: colors.cream,
    borderColor: colors.creamBorder,
    borderWidth: 3,
    borderRadius: radius.xl,
    paddingTop: 18,
    paddingBottom: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  row: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  caption: { marginTop: 6, fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
});
