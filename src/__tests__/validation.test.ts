import { Dictionary, getEnglishDictionary } from '@/data/dictionary';
import { computeHint } from '@/features/game/hints';
import { hasLegalMove, legalMoves, validateMove } from '@/features/game/validation';
import { differsByOneLetter, normalizeWord, oneLetterVariants } from '@/utils/word';

import { trapDictionary } from '@/testing/dictionaries';

const en = getEnglishDictionary();

describe('bundled English dictionary', () => {
  it('loads a substantial vocabulary with tiers', () => {
    expect(en.size).toBeGreaterThan(15000);
    expect(en.tierOf('cat')).toBe(1);
    expect(en.has('dog')).toBe(true);
    expect(en.has('xqz')).toBe(false);
  });

  it('builds the one-letter word graph', () => {
    const n = en.neighbors('cat');
    expect(n).toEqual(expect.arrayContaining(['cot', 'bat', 'cut', 'car']));
    expect(n.every((w) => differsByOneLetter('cat', w))).toBe(true);
    expect(n).not.toContain('cat');
  });

  it('excludes blocklisted words', () => {
    expect(en.has('shit')).toBe(false);
  });
});

describe('validateMove', () => {
  const used = ['cat'];

  it('accepts a valid single-letter change', () => {
    expect(validateMove(en, 'cat', 'cot', used)).toEqual({ ok: true, word: 'cot', position: 1 });
  });

  it('rejects words that are not in the dictionary', () => {
    expect(validateMove(en, 'cat', 'cxt', used)).toEqual({ ok: false, reason: 'not_a_word' });
  });

  it('rejects changing more than one letter', () => {
    expect(validateMove(en, 'cat', 'dog', used)).toEqual({ ok: false, reason: 'multiple_changes' });
  });

  it('rejects an unchanged word', () => {
    expect(validateMove(en, 'cat', 'cat', used)).toEqual({ ok: false, reason: 'unchanged' });
  });

  it('rejects words already used this round', () => {
    expect(validateMove(en, 'cot', 'cat', ['cat', 'cot'])).toEqual({ ok: false, reason: 'already_used' });
    expect(validateMove(en, 'cot', 'cat', new Set(['cat', 'cot']))).toEqual({
      ok: false,
      reason: 'already_used',
    });
  });

  it('rejects a different length', () => {
    expect(validateMove(en, 'cat', 'cats', used)).toEqual({ ok: false, reason: 'wrong_length' });
  });

  it('normalizes case and surrounding whitespace', () => {
    expect(validateMove(en, 'CAT', '  CoT ', used)).toEqual({ ok: true, word: 'cot', position: 1 });
    expect(normalizeWord(' D O G ')).toBe('dog');
  });

  it('handles punctuation and unsupported characters safely', () => {
    expect(validateMove(en, 'cat', 'c@t', used)).toEqual({ ok: false, reason: 'invalid_characters' });
    expect(validateMove(en, 'cat', 'cät', used)).toEqual({ ok: false, reason: 'invalid_characters' });
    expect(validateMove(en, 'cat', '', used)).toEqual({ ok: false, reason: 'empty' });
  });
});

describe('legal move generation', () => {
  it('lists every unused neighbour', () => {
    const d = trapDictionary();
    expect(legalMoves(d, 'cat', ['cat']).sort()).toEqual(['cot', 'hat']);
    expect(legalMoves(d, 'cat', ['cat', 'hat'])).toEqual(['cot']);
  });

  it('respects a tier limit', () => {
    const d = Dictionary.fromTieredLists({ 1: 'cat', 2: 'cot', 3: 'cut' });
    expect(legalMoves(d, 'cat', ['cat'], 1)).toEqual([]);
    expect(legalMoves(d, 'cat', ['cat'], 2)).toEqual(['cot']);
    expect(legalMoves(d, 'cat', ['cat']).sort()).toEqual(['cot', 'cut']);
  });

  it('detects when no legal move remains', () => {
    const d = trapDictionary();
    expect(hasLegalMove(d, 'ham', ['cat', 'hat', 'ham'])).toBe(false);
    expect(hasLegalMove(d, 'hat', ['cat', 'hat'])).toBe(true);
  });

  it('generates 25 variants per letter', () => {
    expect(oneLetterVariants('cat')).toHaveLength(75);
  });
});

describe('hints', () => {
  it('suggests a legal, unused word', () => {
    const hint = computeHint(en, 'cat', ['cat'])!;
    expect(hint).not.toBeNull();
    expect(en.has(hint.word)).toBe(true);
    expect(differsByOneLetter('cat', hint.word)).toBe(true);
    expect(hint.word[hint.position]).toBe(hint.letter);
    expect('cat'[hint.position]).toBe(hint.fromLetter);
  });

  it('prefers a move that leaves the opponent stuck', () => {
    // From cog: bog leaves no reply, cod still allows god.
    const d = trapDictionary();
    expect(computeHint(d, 'cog', ['cat', 'cot', 'cog'])!.word).toBe('bog');
  });

  it('never suggests a used word and returns null when stuck', () => {
    const d = trapDictionary();
    const hint = computeHint(d, 'cat', ['cat', 'hat'])!;
    expect(hint.word).toBe('cot');
    expect(computeHint(d, 'ham', ['cat', 'hat', 'ham'])).toBeNull();
  });
});
