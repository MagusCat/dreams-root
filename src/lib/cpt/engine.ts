import type { RecordedTrial, CptLiveEvent } from './types'

// Vanilla trial runner: one requestAnimationFrame loop driven by performance.now(),
// writing the stimulus letter and progress bar straight to the DOM. It runs OUTSIDE
// React on purpose — no state updates per frame, so React never re-renders mid-block
// and the timing stays as tight as the display allows. React only owns the layout.

export type BlockRefs = {
  host: HTMLElement // full-screen surface that receives taps
  letterEl: HTMLElement // stimulus letter target
  progressEl: HTMLElement // width 0–100% of the whole real test
  tapEl?: HTMLElement // flashed on every response, so a tap is visibly acknowledged
}

export type BlockTiming = { exposureMs: number; windowMs: number }

export function runBlock(opts: {
  refs: BlockRefs
  letters: string[]
  onsets: number[] // cumulative planned onset per trial (jittered, from sequence.ts)
  timing: BlockTiming
  block: number
  isPractice: boolean
  startNTrial: number
  progressBase: number // real trials completed before this block
  progressTotal: number // total real trials (practice excluded)
  signal?: AbortSignal
  target?: string // only for HUD classification (hit vs commission)
  onLive?: (ev: CptLiveEvent) => void // dev HUD stream; undefined in production
}): Promise<RecordedTrial[]> {
  const { refs, letters, onsets, timing, block, isPractice, startNTrial, progressBase, progressTotal, signal } = opts
  const { target, onLive } = opts
  const { exposureMs, windowMs } = timing

  return new Promise((resolve) => {
    const trials: RecordedTrial[] = letters.map((letter, i) => ({
      n_trial: startNTrial + i,
      block,
      is_practice: isPractice,
      letter,
      planned_onset_ms: onsets[i],
      actual_onset_ms: NaN,
      rt_ms: null,
    }))

    let t0 = 0
    let idx = -1
    let raf = 0

    const setProgress = (done: number) => {
      if (!isPractice && progressTotal > 0) {
        refs.progressEl.style.width = `${Math.min(100, (done / progressTotal) * 100)}%`
      }
    }

    // Flash the tap indicator (cosmetic; never affects recorded timing).
    const flashTap = () => {
      refs.tapEl?.animate?.([{ opacity: 0.65 }, { opacity: 0 }], { duration: 280, easing: 'ease-out' })
    }

    // ts comes from the event's own high-res timestamp (same clock as t0), which
    // removes the jitter of measuring inside the handler.
    const respond = (ts: number) => {
      const tr = trials[idx]
      if (!tr || Number.isNaN(tr.actual_onset_ms) || tr.rt_ms != null) return
      const rt = ts - t0 - tr.actual_onset_ms
      if (rt >= 0 && rt <= windowMs) {
        tr.rt_ms = rt // first valid response wins
        onLive?.({
          kind: target && tr.letter === target ? 'hit' : 'commission',
          n_trial: tr.n_trial,
          block,
          letter: tr.letter,
          rt_ms: rt,
        })
      }
    }

    // Emit an omission when we leave a missed target trial (its window is closed
    // by then, since windowMs < isiMs).
    const finalize = (i: number) => {
      const tr = trials[i]
      if (onLive && target && tr && tr.letter === target && tr.rt_ms == null) {
        onLive({ kind: 'omission', n_trial: tr.n_trial, block, letter: tr.letter })
      }
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault()
        flashTap()
        respond(e.timeStamp || performance.now())
      }
    }
    const onPointer = (e: Event) => {
      e.preventDefault()
      flashTap()
      respond(e.timeStamp || performance.now())
    }

    const cleanup = () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKey)
      refs.host.removeEventListener('pointerdown', onPointer)
      signal?.removeEventListener('abort', onAbort)
    }
    const onAbort = () => {
      cleanup()
      resolve(trials)
    }

    const frame = (now: number) => {
      if (t0 === 0) t0 = now
      const elapsed = now - t0
      // Advance to the next trial once its jittered planned onset is reached.
      // At most one step per frame — fine, since the min ISI is far above a frame.
      const next = idx + 1
      if (next < trials.length && elapsed >= onsets[next]) {
        if (idx >= 0) finalize(idx)
        idx = next
        trials[next].actual_onset_ms = elapsed
        refs.letterEl.textContent = trials[next].letter
        refs.letterEl.style.visibility = 'visible'
        setProgress(progressBase + next)
        onLive?.({ kind: 'onset', n_trial: trials[next].n_trial, block, letter: trials[next].letter })
      } else if (idx >= 0) {
        // Hide the letter after its exposure; the fixation cross behind it shows.
        const since = elapsed - trials[idx].actual_onset_ms
        if (since >= exposureMs) refs.letterEl.style.visibility = 'hidden'
      }

      // Done once the last trial's response window has closed.
      if (elapsed >= onsets[trials.length - 1] + windowMs) {
        if (idx >= 0) finalize(idx)
        refs.letterEl.style.visibility = 'hidden'
        setProgress(progressBase + trials.length)
        cleanup()
        resolve(trials)
        return
      }
      raf = requestAnimationFrame(frame)
    }

    if (signal?.aborted) return resolve(trials)
    signal?.addEventListener('abort', onAbort)
    window.addEventListener('keydown', onKey)
    refs.host.addEventListener('pointerdown', onPointer)
    raf = requestAnimationFrame(frame)
  })
}

// hits% on targets for a finished (practice) block.
export function targetHitPct(trials: RecordedTrial[], target: string): number {
  const targets = trials.filter((t) => t.letter === target)
  if (targets.length === 0) return 0
  const hits = targets.filter((t) => t.rt_ms != null).length
  return Math.round((hits / targets.length) * 1000) / 10
}

// false-alarm% = responses to non-target letters / non-targets. Catches someone
// tapping on everything (who would pass a hits-only gate).
export function falseAlarmPct(trials: RecordedTrial[], target: string): number {
  const nonTargets = trials.filter((t) => t.letter !== target)
  if (nonTargets.length === 0) return 0
  const fa = nonTargets.filter((t) => t.rt_ms != null).length
  return Math.round((fa / nonTargets.length) * 1000) / 10
}
