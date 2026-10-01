import type { CptParams } from './types'

// Deterministic PRNG: the per-session seed is stored, so any run can be rebuilt.
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function newSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0]
}

const AZ = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

// One continuous schedule. onsets are planned ms from the run's start:
// i × (exposure + blank) ± jitter. block = index of the block each trial is in.
export type Run = { letters: string[]; blocks: number[]; onsets: number[] }

function shuffle<T>(a: T[], rnd: () => number): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function makeRun(rnd: () => number, nBlocks: number, p: CptParams): Run {
  const pool = AZ.filter((l) => l !== p.targetLetter)
  const soa = p.exposureMs + p.blankMs
  const run: Run = { letters: [], blocks: [], onsets: [] }
  for (let b = 0; b < nBlocks; b++) {
    const isTarget = shuffle(
      Array.from({ length: p.trialsPerBlock }, (_, i) => i < p.targetsPerBlock),
      rnd,
    )
    for (const t of isTarget) {
      const i = run.letters.length
      run.letters.push(t ? p.targetLetter : pool[Math.floor(rnd() * pool.length)])
      run.blocks.push(b)
      run.onsets.push(i * soa + (p.jitterMs > 0 ? (rnd() * 2 - 1) * p.jitterMs : 0))
    }
  }
  return run
}

// Pure: same seed + params → same sequence. Practice is drawn first, then test.
export function generateSequence(seed: number, p: CptParams): { practice: Run; test: Run } {
  const rnd = mulberry32(seed)
  const practice = makeRun(rnd, p.practiceBlocks, p)
  const test = makeRun(rnd, p.nBlocks, p)
  return { practice, test }
}

export function estimatedMinutes(p: CptParams): number {
  const trials = (p.practiceBlocks + p.nBlocks) * p.trialsPerBlock
  return Math.ceil((trials * (p.exposureMs + p.blankMs)) / 60000)
}
