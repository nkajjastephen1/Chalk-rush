import Constants from 'expo-constants';
import { StyleSheet, Text, View } from 'react-native';

import { ChalkLogo } from '@/components/ChalkLogo';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { colors, fonts, radius } from '@/constants/theme';
import { getEnglishDictionary } from '@/data/dictionary';

export default function About() {
  const wordCount = getEnglishDictionary().size.toLocaleString();
  return (
    <Screen scroll style={styles.content}>
      <ScreenHeader title="About" />
      <View style={styles.logo}>
        <ChalkLogo size="md" animated={false} />
      </View>
      <Text style={styles.text}>
        Chalk Rush is an offline word-ladder duel. You and the computer take turns changing one letter at a time.
        Version {Constants.expoConfig?.version ?? '1.0.0'}.
      </Text>

      <Text style={styles.section}>The computer opponent</Text>
      <Text style={styles.text}>
        Simple picks a random familiar word. Medium looks one full move ahead. Hard runs a 4-ply minimax search with
        alpha-beta pruning. Advanced uses iterative deepening within a time and node budget. Hard and Advanced plan as
        if you know common and standard words, so they try to leave you with only rare escapes. All searches run in
        small slices so the game never freezes.
      </Text>

      <Text style={styles.section}>Dictionary</Text>
      <View style={styles.card}>
        <Text style={styles.text}>
          {wordCount} English words (3–6 letters) from SCOWL (Spell Checker Oriented Word Lists), 2020.12.07, by Kevin
          Atkinson — http://wordlist.aspell.net/
        </Text>
        <Text style={styles.small}>
          Copyright 2000–2018 by Kevin Atkinson. Permission to use, copy, modify, distribute and sell these word lists,
          the associated scripts, the output created from the scripts, and its documentation for any purpose is hereby
          granted without fee, provided that the above copyright notice appears in all copies and that both that
          copyright notice and this permission notice appear in supporting documentation. Kevin Atkinson makes no
          representations about the suitability of this array for any purpose. It is provided “as is” without express
          or implied warranty. Full notice: src/data/dictionary/LICENSE-SCOWL.txt.
        </Text>
      </View>

      <Text style={styles.section}>Fonts & sounds</Text>
      <Text style={styles.text}>
        Fonts: Fredoka and Patrick Hand (SIL Open Font License). Sound effects are synthesized by the project’s own
        script and contain no third-party audio.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { maxWidth: 560, width: '100%', alignSelf: 'center', gap: 8 },
  logo: { alignItems: 'center', marginBottom: 8 },
  section: { fontFamily: fonts.semibold, fontSize: 20, color: colors.forest, marginTop: 14 },
  text: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 23, color: colors.inkSoft },
  small: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.muted, marginTop: 8 },
  card: {
    backgroundColor: colors.cream,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.creamBorder,
    padding: 14,
  },
});
