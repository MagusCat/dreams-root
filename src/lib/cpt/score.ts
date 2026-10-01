import type { Classification, CptParams, InputKind, RawResponse, RecordedTrial } from './types'
import type { Run } from './sequence'

// Response as captured by the engine: ts = ms since the run's start (t0).
export type InputEvent = { ts: number; input: InputKind }

// Classification from the FIRST response (t = ms since onset). Both bounds of
// [anticipationMs, windowMs] count as valid.
export function classifyTrial(
  isTarget: boolean,
  firstT: number | null,
  p: Pick<CptParams, 'anticipationMs' | 'windowMs'>,
): Classification {
  if (firstT == null) return isTarget ? 'omission' : 'correct_rejection'
  if (firstT < p.anticipationMs) return 'anticipation'
  if (firstT <= p.windowMs) return isTarget ? 'hit' : 'commission'
  return 'late'
}

// Input-mode lock: once fixed, responses from any other input are ignored and counted.
export function applyModeLock(
  events: InputEvent[],
  lock: InputKind | null,
): { kept: InputEvent[]; ignored: number } {
  if (!lock) return { kept: events, ignored: 0 }
  const kept = events.filter((e) => e.input === lock)
  return { kept, ignored: events.length - kept.length }
}

// Each response goes to the latest stimulus whose actual onset is before it.
// Responses before the first onset have no stimulus and are dropped.
export function assignResponses(onsets: (number | null)[], events: InputEvent[]): RawResponse[][] {
  const out: RawResponse[][] = onsets.map(() => [])
  for (const e of [...events].sort((a, b) => a.ts - b.ts)) {
    for (let i = onsets.length - 1; i >= 0; i--) {
      const on = onsets[i]
      if (on != null && on < e.ts) {
        out[i].push({ t: e.ts - on, input: e.input })
        break
      }
    }
  }
  return out
}

export type RunCapture = {
  onsets: (number | null)[]
  offsets: (number | null)[]
  events: InputEvent[]
}

export function scoreRun(
  run: Run,
  cap: RunCapture,
  p: CptParams,
  opts: { isPractice: boolean; firstNTrial: number; blockBase: number; lock: InputKind | null },
): { trials: RecordedTrial[]; ignored: number } {
  const { kept, ignored } = applyModeLock(cap.events, opts.lock)
  const responses = assignResponses(cap.onsets, kept)
  const trials = run.letters.map((letter, i): RecordedTrial => {
    const presented = cap.onsets[i] != null
    const first = responses[i][0]?.t ?? null
    return {
      n_trial: opts.firstNTrial + i,
      block: opts.blockBase + run.blocks[i],
      is_practice: opts.isPractice,
      letter,
      planned_onset_ms: run.onsets[i],
      actual_onset_ms: cap.onsets[i],
      actual_offset_ms: cap.offsets[i],
      rt_ms: first,
      classification: presented ? classifyTrial(letter === p.targetLetter, first, p) : 'not_presented',
      responses: responses[i],
    }
  })
  return { trials, ignored }
}

// Practice pass: hits ≥ passPct % of targets AND commissions ≤ maxFalseAlarmPct %
// of non-targets (skipped trials are left out of both denominators).
export function practiceResult(trials: RecordedTrial[], p: CptParams) {
  const shown = trials.filter((t) => t.classification !== 'not_presented')
  const targets = shown.filter((t) => t.letter === p.targetLetter)
  const others = shown.filter((t) => t.letter !== p.targetLetter)
  const pct = (n: number, d: number) => (d ? Math.round((n / d) * 1000) / 10 : 0)
  const hitPct = pct(targets.filter((t) => t.classification === 'hit').length, targets.length)
  const faPct = pct(others.filter((t) => t.classification === 'commission').length, others.length)
  return { hitPct, faPct, pass: hitPct >= p.passPct && faPct <= p.maxFalseAlarmPct }
}

// Median frame interval and % of frames longer than 2× that median.
export function frameStats(deltas: number[]): { median: number; longPct: number } | null {
  if (deltas.length === 0) return null
  const s = [...deltas].sort((a, b) => a - b)
  const m = s.length >> 1
  const median = s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
  const long = deltas.filter((d) => d > 2 * median).length
  return { median, longPct: Math.round((long / deltas.length) * 1000) / 10 }
}
