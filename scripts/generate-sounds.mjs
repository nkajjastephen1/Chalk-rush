#!/usr/bin/env node
/**
 * Synthesizes the game's sound effects as small mono WAV files in assets/sounds/.
 * All audio is generated procedurally here, so there are no third-party rights involved.
 *
 * Usage: node scripts/generate-sounds.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RATE = 22050;
const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, '..', 'assets', 'sounds');
fs.mkdirSync(outDir, { recursive: true });

let seed = 1234567;
const rand = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
};

function envelope(t, dur, attack = 0.005, release = 0.08) {
  if (t < attack) return t / attack;
  if (t > dur - release) return Math.max(0, (dur - t) / release);
  return 1;
}

function tone(freq, dur, { volume = 0.35, type = 'sine', release = 0.08 } = {}) {
  const n = Math.floor(dur * RATE);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const phase = 2 * Math.PI * freq * t;
    let s = Math.sin(phase);
    if (type === 'triangle') s = (2 / Math.PI) * Math.asin(Math.sin(phase));
    if (type === 'soft') s = Math.sin(phase) * 0.8 + Math.sin(phase * 2) * 0.2;
    out[i] = s * volume * envelope(t, dur, 0.005, release);
  }
  return out;
}

function concat(...parts) {
  const len = parts.reduce((a, p) => a + p.length, 0);
  const out = new Float32Array(len);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

function silence(dur) {
  return new Float32Array(Math.floor(dur * RATE));
}

function chalk(dur = 0.22) {
  // Band-limited noise with a scratchy amplitude modulation.
  const n = Math.floor(dur * RATE);
  const out = new Float32Array(n);
  let lp = 0;
  let prev = 0;
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const white = rand() * 2 - 1;
    lp += 0.35 * (white - lp);
    const hp = lp - prev;
    prev = lp;
    const scratch = 0.55 + 0.45 * Math.sin(2 * Math.PI * 38 * t + Math.sin(2 * Math.PI * 7 * t));
    out[i] = hp * 0.9 * scratch * envelope(t, dur, 0.01, 0.07);
  }
  return out;
}

function writeWav(name, samples) {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    data.writeInt16LE(Math.round(v * 32767), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  fs.writeFileSync(path.join(outDir, name), Buffer.concat([header, data]));
}

writeWav('tap.wav', tone(880, 0.05, { volume: 0.18, release: 0.03 }));
writeWav('chalk.wav', chalk());
writeWav(
  'success.wav',
  concat(tone(660, 0.08, { type: 'soft', volume: 0.25 }), tone(990, 0.14, { type: 'soft', volume: 0.25 })),
);
writeWav(
  'error.wav',
  concat(
    tone(220, 0.09, { type: 'triangle', volume: 0.22, release: 0.04 }),
    silence(0.03),
    tone(196, 0.12, { type: 'triangle', volume: 0.2 }),
  ),
);
writeWav(
  'win.wav',
  concat(
    tone(523, 0.11, { type: 'soft' }),
    tone(659, 0.11, { type: 'soft' }),
    tone(784, 0.11, { type: 'soft' }),
    tone(1047, 0.35, { type: 'soft', release: 0.2 }),
  ),
);
writeWav(
  'lose.wav',
  concat(
    tone(392, 0.16, { type: 'triangle', volume: 0.25 }),
    tone(330, 0.16, { type: 'triangle', volume: 0.25 }),
    tone(262, 0.4, { type: 'triangle', volume: 0.25, release: 0.25 }),
  ),
);
console.log(`Sounds written to ${outDir}`);
