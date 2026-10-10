import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

const SOURCES = {
  tap: require('@/assets/sounds/tap.wav'),
  chalk: require('@/assets/sounds/chalk.wav'),
  success: require('@/assets/sounds/success.wav'),
  error: require('@/assets/sounds/error.wav'),
  win: require('@/assets/sounds/win.wav'),
  lose: require('@/assets/sounds/lose.wav'),
} as const;

export type SoundName = keyof typeof SOURCES;

const players = new Map<SoundName, AudioPlayer>();
let enabled = true;
let initialized = false;

function init() {
  if (initialized) return;
  initialized = true;
  // Respect the device's silent switch and mix with any music the user is playing.
  setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
}

function playerFor(name: SoundName): AudioPlayer | null {
  let player = players.get(name);
  if (!player) {
    try {
      player = createAudioPlayer(SOURCES[name]);
      player.volume = 0.7;
      players.set(name, player);
    } catch (err) {
      console.warn('[sound] could not create player', name, err);
      return null;
    }
  }
  return player;
}

export const sound = {
  setEnabled(value: boolean) {
    enabled = value;
  },
  /** Creates players up front so the first effect plays without delay. */
  preload() {
    init();
    for (const name of Object.keys(SOURCES) as SoundName[]) playerFor(name);
  },
  play(name: SoundName) {
    if (!enabled) return;
    init();
    const player = playerFor(name);
    if (!player) return;
    try {
      player.seekTo(0);
      player.play();
    } catch (err) {
      console.warn('[sound] playback failed', name, err);
    }
  },
};
