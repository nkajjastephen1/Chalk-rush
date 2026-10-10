export const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';

/** Lowercases, trims and strips internal whitespace. Does not remove other characters. */
export function normalizeWord(input: string): string {
  return input.normalize('NFKC').trim().replace(/\s+/g, '').toLowerCase();
}

export function isAlphabetic(word: string): boolean {
  return /^[a-z]+$/.test(word);
}

/** Indices at which two equal-length words differ. Returns null if lengths differ. */
export function diffPositions(a: string, b: string): number[] | null {
  if (a.length !== b.length) return null;
  const out: number[] = [];
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) out.push(i);
  }
  return out;
}

export function differsByOneLetter(a: string, b: string): boolean {
  const d = diffPositions(a, b);
  return d !== null && d.length === 1;
}

export function replaceAt(word: string, index: number, letter: string): string {
  if (index < 0 || index >= word.length) throw new RangeError(`index ${index} out of range`);
  return word.slice(0, index) + letter + word.slice(index + 1);
}

/** Every string obtained by replacing exactly one letter of `word` with another a–z letter. */
export function oneLetterVariants(word: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < word.length; i++) {
    const original = word[i];
    const prefix = word.slice(0, i);
    const suffix = word.slice(i + 1);
    for (const ch of ALPHABET) {
      if (ch !== original) out.push(prefix + ch + suffix);
    }
  }
  return out;
}
