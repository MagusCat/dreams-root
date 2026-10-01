import { test } from 'node:test'
import assert from 'node:assert/strict'
import flow from '../../content/flow.json' with { type: 'json' }
import { applyModeLock, assignResponses, classifyTrial, frameStats, practiceResult, scoreRun } from './score.ts'
import type { CptParams } from './types.ts'
import type { Run } from './sequence.ts'

const p = flow.cpt.params as CptParams // anticipation 100, window 850, SOA 920

test('classification by first response, exact bounds included', () => {
  assert.equal(classifyTrial(true, null, p), 'omission')
  assert.equal(classifyTrial(false, null, p), 'correct_rejection')
  assert.equal(classifyTrial(true, 99.9, p), 'anticipation')
  assert.equal(classifyTrial(false, 99.9, p), 'anticipation')
  assert.equal(classifyTrial(true, 100, p), 'hit')
  assert.equal(classifyTrial(true, 850, p), 'hit')
  assert.equal(classifyTrial(true, 850.1, p), 'late')
  assert.equal(classifyTrial(false, 100, p), 'commission')
  assert.equal(classifyTrial(false, 850, p), 'commission')
  assert.equal(classifyTrial(false, 900, p), 'late')
})

test('a response goes to the latest stimulus whose onset is strictly before it', () => {
  const out = assignResponses(
    [0, 920, null, 2760],
    [
      { ts: -5, input: 'touch' }, // before any stimulus → dropped
      { ts: 920, input: 'touch' }, // same instant as onset 1 → still trial 0
      { ts: 1000, input: 'touch' },
      { ts: 1900, input: 'touch' }, // trial 2 skipped → trial 1
    ],
  )
  assert.deepEqual(out[0], [{ t: 920, input: 'touch' }])
  assert.deepEqual(out[1], [{ t: 80, input: 'touch' }, { t: 980, input: 'touch' }])
  assert.deepEqual(out[2], [])
  assert.deepEqual(out[3], [])
})

const run: Run = { letters: ['X', 'A', 'X', 'B', 'X'], blocks: [0, 0, 0, 0, 0], onsets: [0, 920, 1840, 2760, 3680] }
const cap = (events: { ts: number; input: 'keyboard' | 'touch' }[]) => ({
  onsets: [0, 920, null, 2760, 3680],
  offsets: [690, 1610, null, 3450, 4370],
  events,
})

test('scoreRun: hit, commission, not presented, late, multiple responses', () => {
  const { trials } = scoreRun(
    run,
    cap([
      { ts: 300, input: 'keyboard' }, // trial 0 hit
      { ts: 400, input: 'keyboard' }, // trial 0 extra
      { ts: 500, input: 'keyboard' }, // trial 0 extra
      { ts: 1300, input: 'keyboard' }, // trial 1 (A) → commission
      { ts: 3680 + 860, input: 'keyboard' }, // trial 4 → late
    ]),
    p,
    { isPractice: false, firstNTrial: 10, blockBase: 0, lock: null },
  )
  assert.deepEqual(
    trials.map((t) => t.classification),
    ['hit', 'commission', 'not_presented', 'correct_rejection', 'late'],
  )
  assert.equal(trials[0].rt_ms, 300)
  assert.equal(trials[0].responses.length, 3) // 2 additional responses kept raw
  assert.equal(trials[4].rt_ms, 860)
  assert.equal(trials[2].actual_onset_ms, null)
  assert.equal(trials[0].n_trial, 10)
})

test('mode lock: other-input responses are ignored and counted', () => {
  const events = [
    { ts: 300, input: 'touch' as const },
    { ts: 350, input: 'keyboard' as const },
    { ts: 1300, input: 'touch' as const },
  ]
  assert.deepEqual(applyModeLock(events, 'keyboard'), { kept: [events[1]], ignored: 2 })
  assert.deepEqual(applyModeLock(events, null), { kept: events, ignored: 0 })

  const { trials, ignored } = scoreRun(run, cap(events), p, { isPractice: false, firstNTrial: 1, blockBase: 0, lock: 'keyboard' })
  assert.equal(ignored, 2)
  assert.equal(trials[0].rt_ms, 350)
  assert.equal(trials[1].classification, 'correct_rejection') // touch at 1300 ignored
})

test('practice pass needs enough hits and few commissions', () => {
  const t = (letter: string, classification: 'hit' | 'omission' | 'commission' | 'correct_rejection') =>
    ({ letter, classification }) as Parameters<typeof practiceResult>[0][number]
  const four = (k: 'hit' | 'omission') => [t('X', 'hit'), t('X', 'hit'), t('X', 'hit'), t('X', k)]
  assert.equal(practiceResult([...four('hit'), t('A', 'correct_rejection')], p).pass, true)
  assert.equal(practiceResult([...four('omission'), t('A', 'correct_rejection')], p).pass, true) // 75 % exactly
  assert.equal(practiceResult([t('X', 'hit'), t('X', 'omission'), t('A', 'correct_rejection')], p).pass, false)
  assert.equal(practiceResult([...four('hit'), t('A', 'commission'), t('B', 'correct_rejection')], p).pass, false) // 50 % FA
})

test('frame stats: median and % of frames over 2× median', () => {
  assert.equal(frameStats([]), null)
  assert.deepEqual(frameStats([16, 17, 16, 50, 17]), { median: 17, longPct: 20 })
})
