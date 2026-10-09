# Chalk Rush

An offline, single-player word-ladder duel for Android and iOS, built with Expo (SDK 57), React Native, TypeScript and Expo Router.

You and the computer take turns changing **exactly one letter** of the current word to make a new English word of the same length:

```
CAT → COT → DOT → DOG → LOG → LAG
```

A word can't be reused within a round. Whoever is to move and can't make a new word loses the round. Win the most of 3 rounds to win the game.

## Running the app

Prerequisites: Node 20+ and npm. For Android, either Android Studio with an emulator (AVD) or a physical phone.

```bash
npm install
npx expo start            # starts Metro; press "a" to open on a running Android emulator
```

**Physical Android phone (quickest):** install **Expo Go** from the Play Store, make sure the phone and computer are on the same Wi-Fi network, run `npx expo start`, and scan the QR code with Expo Go. All native modules used (audio, haptics, async-storage, reanimated, fonts) are included in Expo Go.

**Android emulator:** start an AVD from Android Studio's Device Manager (or `emulator -avd <name>`), then run `npm run android`.

**Development build / USB device:** `npx expo run:android` builds and installs a native debug build (requires the Android SDK and USB debugging enabled on the phone).

**Installable APK:** `npx eas-cli@latest build -p android --profile preview` (requires a free Expo account; configure `eas.json` first with `npx eas-cli@latest build:configure`).

## Quality checks

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # expo lint
npm test            # jest (unit + component tests)
npm run simulate    # optional: AI self-play benchmark (slow, ~1–2 min)
```

## Gameplay features

- Tap-to-replace input: tap a letter, which lifts out and leaves an empty slot. Then tap a letter on the alphabet grid. You can change your choice, Cancel to restore the word, and Submit. No keyboard is needed.
- Validation: dictionary membership, same length, exactly one changed letter, no reuse within a round, and normalization of case, whitespace and unsupported characters. Invalid attempts are explained and never cost points.
- Computer opponent with four honest difficulty levels (see below). The search runs in small time slices so the UI never freezes.
- Each game is 3 rounds. The starting player alternates each round, and each round has a move cap; reaching the cap is a draw.
- Hints: the gold "?" button reveals a real, unused move computed from the current game state. The hint count depends on difficulty.
- Scoring: +10 per valid word, +5 for a word you've never played in a previous game, and +5 for a less common word. Round and game win bonuses scale with difficulty. All values live in `src/features/game/scoring.ts`. An optional time bonus exists but is off by default.
- Persistence (AsyncStorage): settings, selected difficulty, best scores per difficulty, wins, losses and draws, streaks, longest word, recent games, and word history (for the new-word bonus).
- Polish: graph-paper theme, a countdown before each round, pause/resume (Android back button and app backgrounding also pause the game), animations, synthesized sound effects, haptics, and a reduced-motion setting. Sound, vibration and motion can each be toggled.
- Accessibility: every control has an accessibility label, touch targets are at least 48 dp, and turn and feedback messages are announced as live regions.

## Difficulty levels

| Level | Words | Computer vocabulary | Strategy |
|---|---|---|---|
| Simple | 3 letters | common words only | random familiar word, no lookahead |
| Medium | 4 letters | common + standard | 1-move lookahead: takes immediate wins, avoids moves that let you trap it |
| Hard | 4–5 letters | all words | 4-ply minimax with alpha-beta pruning |
| Advanced | 5 letters | all words | iterative-deepening alpha-beta (up to 14 plies, 2 s / 250k-node budget) |

Hard and Advanced use an explicit **opponent model**: they plan as if you know common and standard words, so positions where your only escapes are rare words count as traps. The engine still accepts every dictionary word from you, and a hint can reveal those rare escapes.

`npm run simulate` plays each level against a scripted opponent that knows common and standard words and looks one move ahead. Results from one run (12 rounds per level):

| Level | Computer wins | Opponent wins | Draws | Computer think time (max) |
|---|---|---|---|---|
| Simple | 0 | 3 | 9 | <1 ms |
| Medium | 0 | 1 | 11 | 5 ms |
| Hard | 4 | 0 | 8 | 43 ms |
| Advanced | 11 | 0 | 1 | 1.2 s |

## Dictionary

- Source: **SCOWL** (Spell Checker Oriented Word Lists) 2020.12.07 by Kevin Atkinson, <http://wordlist.aspell.net/>.
- Licence: a permissive MIT-like licence that allows redistribution with the copyright notice. The notice is in `src/data/dictionary/LICENSE-SCOWL.txt` and is also shown on the in-app About screen.
- Contents: 21,281 lowercase words of 3–6 letters (English, American and British spellings; no proper nouns, abbreviations or contractions). A small blocklist (`scripts/blocklist.txt`) removes slurs and strong profanity.
- Tiers, based on SCOWL size level: tier 1 is common (sizes 10–35, 11,197 words), tier 2 is standard (40–50), and tier 3 is rare (55–70).
- Rebuilding or expanding the dictionary: download a SCOWL release, then run `npm run build:dictionary -- <scowl>/final`. To add longer words, change `MIN_LEN`/`MAX_LEN` in `scripts/build-dictionary.mjs`. To add another language or a vocabulary pack, build a new `Dictionary` from tiered word lists. The engine and AI only depend on the `Dictionary` class.

## Project structure

```
src/
  app/                    Expo Router screens
    _layout.tsx           fonts, providers, stack navigator
    index.tsx             animated splash (warms dictionary + sounds)
    home.tsx  difficulty.tsx  game.tsx  result.tsx
    stats.tsx  settings.tsx  how-to-play.tsx  about.tsx
  components/             reusable UI (Screen, GraphPaper, ChalkButton, Dialog, ChalkLogo, ...)
    game/                 LetterTile, WordBoard, AlphabetGrid, TopBar, TurnIndicator, MoveChain, Countdown
  features/
    game/                 engine.ts (pure reducer), validation.ts, scoring.ts, hints.ts, computerTurn.ts
    ai/                   computer.ts (strategies), search.ts (negamax/alpha-beta), scheduler.ts (time slicing)
    stats/                stats.ts (pure statistics updates)
  data/
    dictionary/           Dictionary class + generated words.en.ts + SCOWL licence
    difficulty.ts         all per-level tuning
    startWords.ts         playable starting-word selection
  services/               storage.ts (AsyncStorage), sound.ts (expo-audio), haptics.ts
  hooks/                  useGame, useSettings, useStats, useStableCallback
  types/                  shared game types
  utils/                  word helpers, seeded RNG
  testing/                small hand-built word graphs for tests
  __tests__/              unit + component tests
scripts/                  build-dictionary.mjs, generate-sounds.mjs, blocklist.txt
assets/sounds/            synthesized WAV effects (generated by scripts/generate-sounds.mjs)
```

### Engine design

`src/features/game/engine.ts` is a deterministic reducer with explicit phases: `ready`, `player_turn`, `computer_turn`, `paused`, `round_over` and `finished`. Every phase change increments a `turnToken`. The computer's move is computed asynchronously and dispatched with the token it started from. The reducer ignores any computer move whose token is stale, so a pause, restart, new game or finished game can never be corrupted by a late move. Submissions outside the player's turn are also ignored, which prevents double submission.

The player's in-progress letter selection is UI state tied to the current turn token, so it clears itself when the turn changes.
