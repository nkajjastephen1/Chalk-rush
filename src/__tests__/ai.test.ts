import { Dictionary, getEnglishDictionary } from '@/data/dictionary';
import { DIFFICULTIES, DIFFICULTY_ORDER } from '@/data/difficulty';
import { pickStartWord } from '@/data/startWords';
import { chooseComputerMove } from '@/features/ai/computer';
import { CancelledError, runCooperatively, runToCompletion } from '@/features/ai/scheduler';
import { searchBestMove, WIN } from '@/features/ai/search';
import { validateMove } from '@/features/game/validation';
import type { Difficulty } from '@/types/game';
import { createRng } from '@/utils/random';

import { tieredTrapDictionary, trapDictionary } from '@/testing/dictionaries';

const en = getEnglishDictionary();

function pick(difficulty: Difficulty, dictionary = trapDictionary(), seed = 1, currentWord = 'cat', usedWords = ['cat']) {
  return runToCompletion(
    chooseComputerMove({
      dictionary,
      currentWord,
      usedWords,
      config: DIFFICULTIES[difficulty],
      movesLeft: 20,
      rng: createRng(seed),
    }),
  );
}

describe('computer move legality (real dictionary)', () => {
  it.each(DIFFICULTY_ORDER)('%s always plays legal words within its vocabulary', (difficulty) => {
    const config = { ...DIFFICULTIES[difficulty], searchTimeMs: Math.min(DIFFICULTIES[difficulty].searchTimeMs, 250) };
    const rng = createRng(7);
    for (let game = 0; game < 3; game++) {
      const start = pickStartWord(en, config, rng);
      const used = [start];
      let current = start;
      for (let turn = 0; turn < 3; turn++) {
        const move = runToCompletion(
          chooseComputerMove({ dictionary: en, currentWord: current, usedWords: used, config, movesLeft: 10, rng }),
        );
        if (move === null) break;
        expect(validateMove(en, current, move, used).ok).toBe(true);
        expect(en.tierOf(move)!).toBeLessThanOrEqual(config.aiVocabularyMaxTier);
        used.push(move);
        current = move;
      }
    }
  }, 30_000);
});

describe('no available moves', () => {
  it.each(DIFFICULTY_ORDER)('%s returns null when stuck', (difficulty) => {
    expect(pick(difficulty, trapDictionary(), 1, 'ham', ['cat', 'hat', 'ham'])).toBeNull();
  });
});

describe('difficulty-specific move selection', () => {
  const seeds = Array.from({ length: 30 }, (_, i) => i + 1);

  it('Simple picks randomly, sometimes walking into the losing branch', () => {
    const picks = new Set(seeds.map((s) => pick('simple', trapDictionary(), s)));
    expect(picks).toEqual(new Set(['cot', 'hat']));
  });

  it('Simple only knows common words', () => {
    // In this graph the only escape from cat besides hat is the tier-2 word cot.
    const picks = new Set(seeds.map((s) => pick('simple', tieredTrapDictionary(), s)));
    expect(picks).toEqual(new Set(['hat']));
  });

  it('Medium avoids a move that lets the opponent trap it', () => {
    for (const s of seeds) expect(pick('medium', trapDictionary(), s)).toBe('cot');
  });

  it('Medium takes an immediate win', () => {
    // From cog the computer can play bog (player stuck) or cod (player still has god).
    for (const s of seeds) expect(pick('medium', trapDictionary(), s, 'cog', ['cat', 'cot', 'cog'])).toBe('bog');
  });

  it.each(['hard', 'advanced'] as const)('%s finds the 3-ply forced win', (difficulty) => {
    for (const s of seeds.slice(0, 10)) expect(pick(difficulty, trapDictionary(), s)).toBe('cot');
  });

  it('search proves the forced win score', () => {
    const result = runToCompletion(
      searchBestMove({
        dictionary: trapDictionary(),
        word: 'cat',
        used: new Set(['cat']),
        aiMaxTier: 3,
        movesLeft: 20,
        maxDepth: 6,
        nodeBudget: 10000,
        timeBudgetMs: 10000,
        rng: createRng(1),
      }),
    );
    expect(result.move).toBe('cot');
    expect(result.score).toBe(WIN - 3);
  });

  it('Hard/Advanced opponent model treats rare-word-only escapes as traps', () => {
    // cat → cot leaves only the rare word "cod" (a dead end); cat → hat lets the player answer "ham".
    const dictionary = Dictionary.fromTieredLists({ 1: 'cat hat ham cot', 3: 'cod' });
    const base = {
      dictionary,
      word: 'cat',
      used: new Set(['cat']),
      aiMaxTier: 3 as const,
      movesLeft: 20,
      maxDepth: 6,
      nodeBudget: 10000,
      timeBudgetMs: 10000,
      rng: createRng(1),
    };
    const modelled = runToCompletion(searchBestMove({ ...base, opponentMaxTier: 2 }));
    expect(modelled).toMatchObject({ move: 'cot', score: WIN - 1 });
    // Assuming the player knows every word, both moves lose.
    const omniscient = runToCompletion(searchBestMove({ ...base, opponentMaxTier: 3 }));
    expect(omniscient.score).toBeLessThan(-WIN + 1000);
  });

  it('search treats the move cap as a draw', () => {
    const result = runToCompletion(
      searchBestMove({
        dictionary: trapDictionary(),
        word: 'cat',
        used: new Set(['cat']),
        aiMaxTier: 3,
        movesLeft: 1,
        maxDepth: 6,
        nodeBudget: 10000,
        timeBudgetMs: 10000,
        rng: createRng(1),
      }),
    );
    expect(result.score).toBe(0);
  });

  it('advanced search respects its node budget on the real dictionary', () => {
    const config = DIFFICULTIES.advanced;
    const start = pickStartWord(en, config, createRng(3));
    const result = runToCompletion(
      searchBestMove({
        dictionary: en,
        word: start,
        used: new Set([start]),
        aiMaxTier: 3,
        movesLeft: 24,
        maxDepth: config.searchDepth,
        nodeBudget: 5000,
        timeBudgetMs: 60_000,
        rng: createRng(3),
      }),
    );
    expect(result.move).not.toBeNull();
    expect(result.nodes).toBeLessThanOrEqual(5000 + 64);
    expect(result.depthCompleted).toBeGreaterThanOrEqual(1);
  });

  it('deeper difficulties search deeper', () => {
    expect(DIFFICULTIES.advanced.searchDepth).toBeGreaterThan(DIFFICULTIES.hard.searchDepth);
    expect(DIFFICULTIES.hard.searchDepth).toBeGreaterThan(DIFFICULTIES.medium.searchDepth);
  });
});

describe('cooperative scheduler', () => {
  it('runs a task in slices and resolves', async () => {
    function* task() {
      let n = 0;
      for (let i = 0; i < 1000; i++) {
        n += i;
        yield;
      }
      return n;
    }
    await expect(runCooperatively(task(), { sliceMs: 1 })).resolves.toBe(499500);
  });

  it('rejects with CancelledError when cancelled', async () => {
    function* forever(): Generator<void, number, void> {
      for (;;) yield;
    }
    const cancel = { cancelled: false };
    const p = runCooperatively(forever(), { sliceMs: 1, cancel });
    cancel.cancelled = true;
    await expect(p).rejects.toBeInstanceOf(CancelledError);
  });
});
