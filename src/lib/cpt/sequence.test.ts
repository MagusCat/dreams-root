import { test } from 'node:test'
import assert from 'node:assert/strict'
import flow from '../../content/flow.json' with { type: 'json' }
import { generateSequence, estimatedMinutes } from './sequence.ts'
import type { CptParams } from './types.ts'

const p = flow.cpt.params as CptParams

test('same seed → same sequence; another seed → different', () => {
  assert.deepEqual(generateSequence(42, p), generateSequence(42, p))
  assert.notDeepEqual(generateSequence(42, p).test.letters, generateSequence(43, p).test.letters)
})

test('every block has exactly targetsPerBlock X and only A–Z letters', () => {
  for (const seed of [1, 42, 123456789, 4294967295]) {
    const { practice, test: run } = generateSequence(seed, p)
    for (const [r, nBlocks] of [[practice, p.practiceBlocks], [run, p.nBlocks]] as const) {
      assert.equal(r.letters.length, nBlocks * p.trialsPerBlock)
      for (let b = 0; b < nBlocks; b++) {
        const letters = r.letters.filter((_, i) => r.blocks[i] === b)
        assert.equal(letters.length, p.trialsPerBlock)
        assert.equal(letters.filter((l) => l === p.targetLetter).length, p.targetsPerBlock)
      }
      assert.ok(r.letters.every((l) => /^[A-Z]$/.test(l)))
    }
  }
})

test('onsets follow the absolute calendar i × (exposure + blank) ± jitter', () => {
  const soa = p.exposureMs + p.blankMs
  generateSequence(7, p).test.onsets.forEach((o, i) => assert.equal(o, i * soa))
  const jittered = { ...p, jitterMs: 20 }
  generateSequence(7, jittered).test.onsets.forEach((o, i) => assert.ok(Math.abs(o - i * soa) <= 20))
})

test('duration is computed from params, rounded up', () => {
  // (2 + 10) × 31 trials × 920 ms = 342 240 ms = 5.7 min → 6
  assert.equal(estimatedMinutes(p), 6)
})
