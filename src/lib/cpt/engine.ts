import type { CptParams, InputKind } from './types'
import type { InputEvent, RunCapture } from './score'

export type RunResult = RunCapture & { frames: number[] }

// Runs one continuous schedule outside React: letters are shown/hidden on the DOM
// via refs, on an absolute calendar (onset i = t0 + onsets[i]) checked every rAF
// frame, so lateness never accumulates. No network use here.
export function runSchedule(opts: {
  host: HTMLElement
  letterEl: HTMLElement
  tapEl?: HTMLElement
  letters: string[]
  onsets: number[]
  p: CptParams
  signal?: AbortSignal
  onProgress?: (done: number) => void
  onResponse?: (trial: number, t: number) => void
}): Promise<RunResult> {
  const { host, letterEl, tapEl, letters, onsets, p, signal, onProgress, onResponse } = opts
  const n = letters.length
  const soa = p.exposureMs + p.blankMs
  const keyOk = p.allowedInputs.includes('keyboard')
  const tapOk = p.allowedInputs.includes('touch')

  return new Promise((resolve) => {
    const on: (number | null)[] = new Array(n).fill(null)
    const off: (number | null)[] = new Array(n).fill(null)
    const events: InputEvent[] = []
    const frames: number[] = []
    let t0 = -1
    let last = 0
    let next = 0
    let shown = -1
    let raf = 0

    // event.timeStamp shares performance.now()'s clock, so RT = timeStamp − onset.
    const record = (ts: number, input: InputKind) => {
      if (t0 < 0) return
      const rel = ts - t0
      events.push({ ts: rel, input })
      tapEl?.animate?.([{ opacity: 0.65 }, { opacity: 0 }], { duration: 280, easing: 'ease-out' })
      for (let i = next - 1; i >= 0; i--) {
        const o = on[i]
        if (o != null && o < rel) return onResponse?.(i, rel - o)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== p.responseKey) return
      e.preventDefault() // no page scroll, also on auto-repeat
      if (e.repeat || !keyOk) return
      record(e.timeStamp, 'keyboard')
    }
    const onPointer = (e: PointerEvent) => {
      if ((e.target as Element | null)?.closest?.('button')) return // dev skip button
      e.preventDefault()
      if (!tapOk) return
      record(e.timeStamp, (e.pointerType || 'touch') as InputKind)
    }
    const noMenu = (e: Event) => e.preventDefault()

    const hide = (el: number) => {
      if (shown < 0 || off[shown] != null) return
      off[shown] = el
      letterEl.style.visibility = 'hidden'
    }
    const endTrial = (el: number) => {
      if (shown < 0) return
      hide(el)
      shown = -1
    }

    const cleanup = () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('keydown', onKey)
      host.removeEventListener('pointerdown', onPointer)
      host.removeEventListener('contextmenu', noMenu)
      signal?.removeEventListener('abort', onAbort)
      letterEl.style.visibility = 'hidden'
    }
    const done = () => {
      cleanup()
      resolve({ onsets: on, offsets: off, events, frames })
    }
    const onAbort = () => done()

    const frame = (now: number) => {
      if (t0 < 0) t0 = now
      // ponytail: a gap ≥ 1 s is a hidden tab (rAF paused), not a frame; skipping it keeps the median honest.
      else if (now - last < 1000) frames.push(now - last)
      last = now
      const el = now - t0

      while (next < n && el >= onsets[next]) {
        const i = next++
        endTrial(el)
        // Its whole exposure already passed (tab was hidden): skip, don't show late.
        if (el >= onsets[i] + p.exposureMs) continue
        on[i] = el
        shown = i
        letterEl.textContent = letters[i]
        letterEl.style.visibility = 'visible'
        onProgress?.(i + 1)
      }
      if (shown >= 0 && el >= (on[shown] as number) + p.exposureMs) hide(el)

      if (next >= n && el >= onsets[n - 1] + soa) {
        endTrial(el)
        onProgress?.(n)
        return done()
      }
      raf = requestAnimationFrame(frame)
    }

    if (signal?.aborted) return resolve({ onsets: on, offsets: off, events, frames })
    signal?.addEventListener('abort', onAbort)
    document.addEventListener('keydown', onKey)
    host.addEventListener('pointerdown', onPointer, { passive: false })
    host.addEventListener('contextmenu', noMenu)
    raf = requestAnimationFrame(frame)
  })
}
