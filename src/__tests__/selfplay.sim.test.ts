/**
 * Opt-in benchmark (excluded from `npm test`): `npm run simulate`.
 * Plays each difficulty against a scripted "human" proxy and prints win/draw rates and think times.
 */
import { getEnglishDictionary } from '@/data/dictionary';
import { DIFFICULTIES, DIFFICULTY_ORDER } from '@/data/difficulty';
import { pickStartWord } from '@/data/startWords';
import { chooseComputerMove } from '@/features/ai/computer';
import { runToCompletion } from '@/features/ai/scheduler';
import type { Difficulty, WordTier } from '@/types/game';
import { createRng } from '@/utils/random';

const en = getEnglishDictionary();
const ROUNDS = 12;

function simulate(difficulty: Difficulty, humanKnows: WordTier): string {
  const cpu = DIFFICULTIES[difficulty];
  // Proxy for a decent human: one-move lookahead, vocabulary limited to `humanKnows`.
  const human = { ...DIFFICULTIES.medium, aiVocabularyMaxTier: humanKnows };
  const rng = createRng(99);
  const tally = { cpu: 0, human: 0, draw: 0 };
  let totalMoves = 0;
  let maxThink = 0;
  let sumThink = 0;
  let thinks = 0;

  for (let r = 0; r < ROUNDS; r++) {
    const start = pickStartWord(en, cpu, rng);
    const used = [start];
    let word = start;
    let humanTurn = r % 2 === 0;
    let result: keyof typeof tally = 'draw';
    for (let m = 0; m < cpu.maxMovesPerRound; m++) {
      const t0 = Date.now();
      const move = runToCompletion(
        chooseComputerMove({
          dictionary: en,
          currentWord: word,
          usedWords: used,
          config: humanTurn ? human : cpu,
          movesLeft: cpu.maxMovesPerRound - m,
          rng,
        }),
      );
      if (!humanTurn) {
        const dt = Date.now() - t0;
        maxThink = Math.max(maxThink, dt);
        sumThink += dt;
        thinks++;
      }
      if (!move) {
        result = humanTurn ? 'cpu' : 'human';
        break;
      }
      used.push(move);
      word = move;
      totalMoves++;
      humanTurn = !humanTurn;
    }
    tally[result]++;
  }
  return `${difficulty.padEnd(9)} cpu ${tally.cpu} / human ${tally.human} / draw ${tally.draw}  avg moves ${(
    totalMoves / ROUNDS
  ).toFixed(1)}  think avg ${Math.round(sumThink / Math.max(1, thinks))}ms max ${maxThink}ms`;
}

it('self-play summary', () => {
  const lines: string[] = [];
  for (const knows of [2, 3] as const) {
    lines.push(`--- human proxy knows tiers <= ${knows}`);
    for (const d of DIFFICULTY_ORDER) lines.push(simulate(d, knows));
  }
  console.log(lines.join('\n'));
}, 900_000);
