import type { CptParams } from './types'

// Deterministic letter sequence from a seed, so a run is reproducible and the
// seed can be stored with the data. mulberry32: tiny, good enough for stimuli.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// A–Z with visually ambiguous letters dropped (I/O/Q vs 1/0) plus the target.
const LETTERS = 'ABCDEFGHJKLMNPRSTUVWYZ'.split('')

// One block: n letters with ~ratio targets, no two targets adjacent and no letter
// repeated back-to-back (both best-effort under the count constraint).
function makeBlock(rnd: () => number, n: number, target: string, ratio: number): string[] {
  const pool = LETTERS.filter((l) => l !== target)
  const nTargets = Math.min(n, Math.max(1, Math.round(n * ratio)))

  const isTarget = new Array<boolean>(n).fill(false)
  let placed = 0
  for (let guard = 0; placed < nTargets && guard < n * 50; guard++) {
    const i = Math.floor(rnd() * n)
    if (isTarget[i] || isTarget[i - 1] || isTarget[i + 1]) continue
    isTarget[i] = true
    placed++
  }
  // Relax adjacency if the count could not be met (small/dense blocks).
  for (let i = 0; placed < nTargets && i < n; i++) {
    if (!isTarget[i]) {
      isTarget[i] = true
      placed++
    }
  }

  const letters: string[] = []
  let prev = ''
  for (let i = 0; i < n; i++) {
    if (isTarget[i]) {
      letters.push(target)
      prev = target
      continue
    }
    let l = pool[Math.floor(rnd() * pool.length)]
    if (l === prev) l = pool[(pool.indexOf(l) + 1) % pool.length]
    letters.push(l)
    prev = l
  }
  return letters
}

// Cumulative onset schedule with jitter: onset[i] = onset[i-1] + isiMs ± jitter.
// A variable ISI stops the participant entraining to a fixed rhythm (which would
// let them anticipate letters and hide attention lapses). Mean stays isiMs.
function makeOnsets(rnd: () => number, n: number, isiMs: number, jitterMs: number): number[] {
  const onsets = [0]
  for (let i = 1; i < n; i++) {
    const jit = jitterMs > 0 ? (rnd() * 2 - 1) * jitterMs : 0
    onsets.push(onsets[i - 1] + isiMs + jit)
  }
  return onsets
}

export type Block = { letters: string[]; onsets: number[] }

function makeFullBlock(rnd: () => number, n: number, p: CptParams): Block {
  return {
    letters: makeBlock(rnd, n, p.targetLetter, p.targetRatio),
    onsets: makeOnsets(rnd, n, p.isiMs, p.jitterMs),
  }
}

export function buildSequence(p: CptParams): { practice: Block; blocks: Block[] } {
  const rnd = mulberry32(p.seed)
  const practice = makeFullBlock(rnd, p.practiceTrials, p)
  const blocks = Array.from({ length: p.nBlocks }, () => makeFullBlock(rnd, p.trialsPerBlock, p))
  return { practice, blocks }
}
