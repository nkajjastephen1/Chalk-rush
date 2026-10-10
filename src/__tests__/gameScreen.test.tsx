import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import GameScreen from '@/app/game';
import { getEnglishDictionary } from '@/data/dictionary';
import { INVALID_MESSAGES } from '@/features/game/validation';
import { SettingsProvider } from '@/hooks/useSettings';
import { StatsProvider } from '@/hooks/useStats';
import { ALPHABET, replaceAt } from '@/utils/word';

jest.mock('@/services/sound', () => ({
  sound: { play: jest.fn(), setEnabled: jest.fn(), preload: jest.fn() },
}));
jest.mock('@/services/haptics', () => ({
  haptics: {
    setEnabled: jest.fn(),
    select: jest.fn(),
    light: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
  },
}));
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ difficulty: 'simple' }),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  useFocusEffect: (cb: () => void | (() => void)) => require('react').useEffect(cb, [cb]),
  router: { push: jest.fn(), replace: jest.fn(), dismissTo: jest.fn(), back: jest.fn(), canGoBack: () => true },
}));

const dictionary = getEnglishDictionary();
const TILE = /^Letter (\d), ([A-Z])\. Tap to replace\.$/;

function renderGame() {
  return render(
    <SettingsProvider>
      <StatsProvider>
        <GameScreen />
      </StatsProvider>
    </SettingsProvider>,
  );
}

function currentWord(): string {
  return screen
    .getAllByLabelText(TILE)
    .map((el) => TILE.exec(el.props.accessibilityLabel)![2].toLowerCase())
    .join('');
}

async function waitForPlayerTurn() {
  await waitFor(() => expect(screen.getByLabelText('Your turn')).toBeTruthy(), { timeout: 6000 });
}

/** Taps tile `index`, then the alphabet key for `letter`. */
function replaceLetter(index: number, letter: string) {
  const tile = screen.getAllByLabelText(TILE)[index];
  fireEvent.press(tile);
  fireEvent.press(screen.getByLabelText(`Letter ${letter.toUpperCase()}`));
}

describe('game screen interaction', () => {
  it('lifts a letter, inserts a replacement, and accepts a valid word', async () => {
    renderGame();
    await waitForPlayerTurn();
    const word = currentWord();
    const target = dictionary.neighbors(word)[0];
    const pos = [...word].findIndex((c, i) => c !== target[i]);

    fireEvent.press(screen.getAllByLabelText(TILE)[pos]);
    expect(screen.getByLabelText(`Letter ${pos + 1}, empty slot. Choose a letter below.`)).toBeTruthy();

    fireEvent.press(screen.getByLabelText(`Letter ${target[pos].toUpperCase()}`));
    expect(
      screen.getByLabelText(`Letter ${pos + 1}, replaced with ${target[pos].toUpperCase()}. Tap to cancel.`),
    ).toBeTruthy();

    fireEvent.press(screen.getByLabelText(`Submit ${target.toUpperCase()}`));
    expect(screen.getByText(new RegExp(`^${target.toUpperCase()}! \\+\\d+`))).toBeTruthy();
    expect(screen.getByLabelText('Computer thinking')).toBeTruthy();

    // The computer answers asynchronously and hands the turn back.
    await waitForPlayerTurn();
    expect(screen.getByText(/^Computer changed /)).toBeTruthy();
    expect(currentWord()).not.toBe(target);
  }, 20000);

  it('rejects an invalid word without changing the board, and Cancel restores the word', async () => {
    renderGame();
    await waitForPlayerTurn();
    const word = currentWord();
    const bad = [...ALPHABET].find((l) => l !== word[0] && !dictionary.has(replaceAt(word, 0, l)))!;

    replaceLetter(0, bad);
    fireEvent.press(screen.getByLabelText(`Submit ${replaceAt(word, 0, bad).toUpperCase()}`));
    expect(screen.getByText(INVALID_MESSAGES.not_a_word)).toBeTruthy();
    expect(screen.getByLabelText('Your score 0')).toBeTruthy();
    // Slot stays open for another try.
    expect(screen.getByLabelText('Letter 1, empty slot. Choose a letter below.')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Cancel'));
    expect(currentWord()).toBe(word);
  }, 20000);

  it('cannot pick the letter being replaced, and pausing stops play until resumed', async () => {
    renderGame();
    await waitForPlayerTurn();
    const word = currentWord();
    fireEvent.press(screen.getAllByLabelText(TILE)[1]);
    fireEvent.press(screen.getByLabelText(`Letter ${word[1].toUpperCase()}`));
    expect(screen.queryByLabelText(/^Submit [A-Z]+$/)).toBeNull();

    fireEvent.press(screen.getByLabelText('Pause game'));
    expect(screen.getByLabelText('Resume')).toBeTruthy();
    expect(screen.queryByLabelText('Your turn')).toBeNull();
    // Board is locked while paused.
    expect(screen.getAllByLabelText(TILE)[0].props.accessibilityState).toMatchObject({ disabled: true });
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Resume'));
    });
    await waitForPlayerTurn();
  }, 20000);
});
