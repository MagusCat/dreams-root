import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Layout from '../components/Layout'
import { Button } from '../components/Button'
import { useSession } from '../hooks/useSession'
import { flow } from '../content'
import { nextStep, prevStep } from '../app/steps'
import { estimatedMinutes, generateSequence, newSeed, type Run } from '../lib/cpt/sequence'
import { runSchedule, type RunResult } from '../lib/cpt/engine'
import { classifyTrial, frameStats, practiceResult, scoreRun } from '../lib/cpt/score'
import type { CptFlag, CptParams, CptPayload, InputKind, RecordedTrial } from '../lib/cpt/types'
import { DEV_TOOLS, markCptDoneIfMissing } from '../lib/devTools'

type Phase = 'intro' | 'locked' | 'countdown' | 'running' | 'practice_feedback' | 'done'

const DRAFT_KEY = 'dreams:draft:cpt'
// Survives a reload, so a mid-test reload is detected and counted as a used attempt.
const RUN_KEY = 'dreams:cpt:run'

type RunState = {
  attempts: number
  active: boolean
  locked: boolean
  startedAt: number
  seed: number
  practiceAttempts: number
}

function readRun(): RunState {
  try {
    const raw = localStorage.getItem(RUN_KEY)
    if (raw) return JSON.parse(raw) as RunState
  } catch {
    /* ignore */
  }
  return { attempts: 0, active: false, locked: false, startedAt: 0, seed: 0, practiceAttempts: 0 }
}

function writeRun(r: RunState): void {
  try {
    localStorage.setItem(RUN_KEY, JSON.stringify(r))
  } catch {
    /* ignore */
  }
}

function writeDraft(payload: CptPayload): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(payload))
  } catch {
    /* ignore */
  }
}

function hasDraft(): boolean {
  try {
    return localStorage.getItem(DRAFT_KEY) != null
  } catch {
    return false
  }
}

// Last attempt was cut by a reload: an invalid, trial-less session so the
// participant can move on (the in-memory trials are gone).
function reloadedPayload(run: RunState, p: CptParams): CptPayload {
  return {
    parameters: { ...p, seed: run.seed, total_trials: 0 },
    started_at: new Date(run.startedAt).toISOString(),
    finished_at: new Date().toISOString(),
    focus_losses: 0,
    fullscreen_exits: 0,
    orientation_changes: 0,
    practice_attempts: Math.max(1, run.practiceAttempts),
    practice_hits_pct: 0,
    test_attempts: run.attempts,
    input_mode: null,
    fullscreen_available: false,
    other_mode_responses: 0,
    frame_median_ms: null,
    long_frame_pct: null,
    flags: ['session_reloaded'],
    trials: [],
  }
}

// Idempotent (StrictMode runs initializers twice): the lock is persisted first.
function initialState(p: CptParams) {
  const run = readRun()
  if (run.active && run.attempts >= p.maxTestAttempts) {
    writeDraft(reloadedPayload(run, p))
    writeRun({ ...run, active: false, locked: true })
    run.locked = true
  }
  return {
    locked: run.locked,
    alreadyDone: hasDraft(),
    interrupted: run.active,
    attemptsLeft: p.maxTestAttempts - run.attempts,
  }
}

type Session = {
  seed: number
  fsAvailable: boolean
  fsActive: boolean
  away: boolean
  focusLosses: number
  fullscreenExits: number
  orientationChanges: number
  practiceAttempts: number
  practiceTrials: RecordedTrial[]
  practiceHitsPct: number
  practiceFailed: boolean
  lock: InputKind | null
  nTrial: number
}

const freshSession = (seed: number): Session => ({
  seed,
  fsAvailable: false,
  fsActive: false,
  away: false,
  focusLosses: 0,
  fullscreenExits: 0,
  orientationChanges: 0,
  practiceAttempts: 1,
  practiceTrials: [],
  practiceHitsPct: 0,
  practiceFailed: false,
  lock: null,
  nTrial: 1,
})

export default function Cpt() {
  const { goTo } = useSession()
  const c = flow.cpt
  const p = c.params
  const X = p.targetLetter
  const [init] = useState(() => initialState(p))

  const [phase, setPhase] = useState<Phase>(init.locked ? 'locked' : 'intro')
  const [mode, setMode] = useState<'practice' | 'test'>('practice')
  const [count, setCount] = useState(3)
  const [feedback, setFeedback] = useState<{ hitPct: number; faPct: number; pass: boolean; last: boolean } | null>(null)
  const [devStats, setDevStats] = useState<string | null>(null)

  const hostRef = useRef<HTMLDivElement>(null)
  const letterRef = useRef<HTMLSpanElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const tapRef = useRef<HTMLDivElement>(null)
  const feedbackRef = useRef<HTMLDivElement>(null)

  const phaseRef = useRef(phase)
  phaseRef.current = phase
  const modeRef = useRef(mode)
  modeRef.current = mode
  const ctrlRef = useRef<AbortController | null>(null)
  const s = useRef<Session>(freshSession(0))
  const seq = useRef<{ practice: Run; test: Run } | null>(null)
  const [runId, setRunId] = useState(0)
  const [startToken, setStartToken] = useState(0)

  const goNext = () => {
    const n = nextStep('cpt')
    if (n) goTo(n)
  }

  // Practice-only feedback (the real test shows none: it would bias the measure).
  const fbTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const flash = (text: string) => {
    const el = feedbackRef.current
    if (!el) return
    el.textContent = text
    el.style.color = '#6ee7b7'
    el.style.opacity = '1'
    clearTimeout(fbTimer.current)
    fbTimer.current = setTimeout(() => {
      if (feedbackRef.current) feedbackRef.current.style.opacity = '0'
    }, 600)
  }

  // Interruptions: hidden tab / window blur (one per episode), fullscreen exit
  // (only if it was active) and orientation change. The test keeps its calendar.
  const detach = useRef<(() => void) | null>(null)
  function attachGuards() {
    const st = s.current
    const lose = () => {
      if (!st.away) {
        st.away = true
        st.focusLosses++
      }
    }
    const regain = () => {
      st.away = false
    }
    const onVis = () => (document.hidden ? lose() : regain())
    const onFs = () => {
      if (document.fullscreenElement) st.fsActive = true
      else if (st.fsActive) {
        st.fsActive = false
        st.fullscreenExits++
      }
    }
    const mq = window.matchMedia('(orientation: portrait)')
    const onOrient = () => {
      st.orientationChanges++
    }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('blur', lose)
    window.addEventListener('focus', regain)
    document.addEventListener('fullscreenchange', onFs)
    mq.addEventListener('change', onOrient)
    detach.current = () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('blur', lose)
      window.removeEventListener('focus', regain)
      document.removeEventListener('fullscreenchange', onFs)
      mq.removeEventListener('change', onOrient)
    }
  }
  function detachGuards() {
    detach.current?.()
    detach.current = null
  }
  useEffect(() => detachGuards, [])

  function leaveFullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => {})
  }

  function queue(kind: 'practice' | 'test') {
    setMode(kind)
    setCount(3)
    setPhase('countdown')
    setStartToken((n) => n + 1)
  }

  useEffect(() => {
    if (startToken === 0) return
    const timers = [
      setTimeout(() => setCount(2), 800),
      setTimeout(() => setCount(1), 1600),
      setTimeout(() => {
        if (phaseRef.current !== 'countdown') return
        setPhase('running')
        setRunId((n) => n + 1)
      }, 2400),
    ]
    return () => timers.forEach(clearTimeout)
  }, [startToken])

  useEffect(() => {
    if (runId === 0 || !seq.current) return
    const isPractice = modeRef.current === 'practice'
    const run = isPractice ? seq.current.practice : seq.current.test
    const ctrl = new AbortController()
    ctrlRef.current = ctrl
    const first = new Map<number, number>()

    void runSchedule({
      host: hostRef.current!,
      letterEl: letterRef.current!,
      tapEl: tapRef.current ?? undefined,
      letters: run.letters,
      onsets: run.onsets,
      p,
      signal: ctrl.signal,
      onProgress: isPractice
        ? undefined
        : (done) => {
            if (progressRef.current) progressRef.current.style.width = `${(done / run.letters.length) * 100}%`
          },
      onResponse: isPractice
        ? (i, t) => {
            if (first.has(i)) return
            first.set(i, t)
            if (classifyTrial(run.letters[i] === X, t, p) === 'hit') flash('Correcto')
          }
        : undefined,
    }).then((res) => {
      if (ctrl.signal.aborted) return
      if (isPractice) finishPractice(run, res)
      else finishTest(run, res)
    })
    return () => ctrl.abort()
  }, [runId])

  function start() {
    const seed = newSeed()
    writeRun({ ...readRun(), attempts: readRun().attempts + 1, active: true, startedAt: Date.now(), seed, practiceAttempts: 1 })
    s.current = freshSession(seed)
    seq.current = generateSequence(seed, p)
    attachGuards()
    // Needs this click as the user gesture. iPhone has no API: continue without it.
    const root = document.documentElement
    if (p.tryFullscreen && root.requestFullscreen) {
      root.requestFullscreen().then(() => (s.current.fsAvailable = true), () => {})
    }
    queue('practice')
  }

  function finishPractice(run: Run, res: RunResult) {
    const st = s.current
    // The input used for the first practice response is locked for the test.
    if (st.lock == null) st.lock = res.events[0]?.input ?? null
    const { trials } = scoreRun(run, res, p, {
      isPractice: true,
      firstNTrial: st.nTrial,
      blockBase: (st.practiceAttempts - 1) * p.practiceBlocks,
      lock: null,
    })
    st.nTrial += trials.length
    st.practiceTrials.push(...trials)
    const r = practiceResult(trials, p)
    st.practiceHitsPct = r.hitPct
    const last = st.practiceAttempts >= p.maxPracticeAttempts
    if (!r.pass && last) st.practiceFailed = true
    setFeedback({ ...r, last })
    setPhase('practice_feedback')
  }

  function retryPractice() {
    s.current.practiceAttempts++
    writeRun({ ...readRun(), practiceAttempts: s.current.practiceAttempts })
    queue('practice')
  }

  function finishTest(run: Run, res: RunResult) {
    const st = s.current
    const lock = st.lock ?? res.events[0]?.input ?? null
    const { trials, ignored } = scoreRun(run, res, p, { isPractice: false, firstNTrial: st.nTrial, blockBase: 0, lock })
    const frames = frameStats(res.frames)
    const flags: CptFlag[] = []
    if (st.focusLosses + st.fullscreenExits + st.orientationChanges > p.maxInterruptions) flags.push('interruptions_exceeded')
    if (frames && frames.median > 20) flags.push('low_frame_rate')
    if (st.practiceFailed) flags.push('practice_failed')
    const runState = readRun()
    const all = [...st.practiceTrials, ...trials]

    writeDraft({
      parameters: { ...p, seed: st.seed, total_trials: all.length },
      started_at: new Date(runState.startedAt).toISOString(),
      finished_at: new Date().toISOString(),
      focus_losses: st.focusLosses,
      fullscreen_exits: st.fullscreenExits,
      orientation_changes: st.orientationChanges,
      practice_attempts: st.practiceAttempts,
      practice_hits_pct: st.practiceHitsPct,
      test_attempts: runState.attempts,
      input_mode: lock,
      fullscreen_available: st.fsAvailable,
      other_mode_responses: ignored,
      frame_median_ms: frames ? Math.round(frames.median * 100) / 100 : null,
      long_frame_pct: frames?.longPct ?? null,
      flags,
      trials: all,
    })
    writeRun({ ...runState, active: false })
    detachGuards()
    leaveFullscreen()

    if (DEV_TOOLS) {
      const lags = trials
        .filter((t) => t.actual_onset_ms != null)
        .map((t) => (t.actual_onset_ms as number) - t.planned_onset_ms)
        .sort((a, b) => a - b)
      const med = lags.length ? lags[lags.length >> 1] : 0
      setDevStats(
        `frame median ${frames?.median.toFixed(2) ?? '–'} ms · long frames ${frames?.longPct ?? '–'}%\n` +
          `onset lag median ${med.toFixed(2)} ms · max ${(lags[lags.length - 1] ?? 0).toFixed(2)} ms\n` +
          `input ${lock ?? '–'} · other-mode ${ignored} · flags ${flags.join(', ') || '–'}`,
      )
    }
    setPhase('done')
  }

  function devSkip() {
    ctrlRef.current?.abort()
    markCptDoneIfMissing()
    writeRun({ ...readRun(), active: false })
    detachGuards()
    leaveFullscreen()
    goNext()
  }

  if (phase === 'locked') {
    return (
      <Layout step="cpt" footer={<Button onClick={goNext}>Continuar</Button>}>
        <div className="animate-enter space-y-3">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">La prueba ya no está disponible</h1>
          <p className="text-sm leading-relaxed text-slate-600">
            La prueba se interrumpió demasiadas veces y no se puede repetir. Continúa con el resto del cuestionario.
          </p>
        </div>
      </Layout>
    )
  }

  if (phase === 'intro') {
    const back = prevStep('cpt')
    const minutes = estimatedMinutes(p)
    return (
      <Layout
        step="cpt"
        onBack={back ? () => goTo(back) : undefined}
        footer={
          init.alreadyDone ? <Button onClick={goNext}>Continuar</Button> : <Button onClick={start}>{c.startCta}</Button>
        }
      >
        <div className="animate-enter space-y-5">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{c.title}</h1>
            <p className="text-sm leading-relaxed text-slate-600">{c.intro}</p>
          </div>
          <ul className="space-y-2.5">
            {c.instructions.map((line, i) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed text-slate-700">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
                <span>{line.replace('{minutos}', String(minutes))}</span>
              </li>
            ))}
          </ul>
          <p className="hidden rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-medium text-violet-800 pointer-coarse:landscape:block">
            Gira tu teléfono en posición vertical para hacer la prueba.
          </p>
          {init.interrupted && !init.alreadyDone && (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium leading-relaxed text-red-700">
              La prueba anterior se interrumpió.{' '}
              {init.attemptsLeft === 1 ? 'Te queda 1 intento.' : `Te quedan ${init.attemptsLeft} intentos.`}
            </p>
          )}
          {init.alreadyDone ? (
            <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium leading-relaxed text-emerald-800">
              Prueba completada
            </p>
          ) : (
            <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium leading-relaxed text-amber-800">
              {c.warning}
            </p>
          )}
          {DEV_TOOLS && !init.alreadyDone && (
            <button
              type="button"
              onClick={devSkip}
              className="text-xs font-medium text-slate-400 underline underline-offset-2 hover:text-slate-600"
            >
              Omitir el test (solo dev)
            </button>
          )}
        </div>
      </Layout>
    )
  }

  if (phase === 'done') {
    return (
      <Layout step="cpt" footer={<Button onClick={goNext}>{c.doneCta}</Button>}>
        <div className="animate-enter flex h-full flex-col items-center justify-center space-y-3 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{c.doneTitle}</h1>
          <p className="max-w-sm text-sm leading-relaxed text-slate-600">{c.doneText}</p>
          {devStats && (
            <pre className="whitespace-pre-wrap rounded-lg bg-slate-900 px-3 py-2 text-left font-mono text-[11px] text-emerald-300">
              {devStats}
            </pre>
          )}
        </div>
      </Layout>
    )
  }

  // Portaled to <body>: the flow wrapper keeps a residual transform (.anim-page),
  // which would otherwise make position:fixed anchor to the card, not the viewport.
  return createPortal(
    <div
      ref={hostRef}
      className="fixed inset-0 z-40 flex touch-none flex-col bg-[#0b1020] text-white select-none"
      style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
    >
      <div className="px-5 pt-5 sm:px-8">
        <div className="flex items-center justify-between gap-3 text-xs font-medium text-white/55">
          <span>{mode === 'practice' ? c.practiceLabel : ''}</span>
          <span>{mode === 'practice' ? `Responde solo a la «${X}»` : ''}</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            ref={progressRef}
            className={`h-full rounded-full bg-violet-400 transition-[width] duration-200 ease-out ${
              mode === 'practice' ? 'animate-pulse' : ''
            }`}
            style={{ width: mode === 'test' ? '0%' : '20%' }}
          />
        </div>
      </div>

      {phase === 'countdown' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <p className="text-sm text-white/60">{c.getReady}</p>
          <span key={count} className="animate-enter text-[22vh] font-bold leading-none text-violet-300">
            {count}
          </span>
          <p className="text-sm text-white/45">{c.responseHint}</p>
        </div>
      )}

      {phase === 'running' && (
        <>
          <div className="relative flex flex-1 items-center justify-center">
            <span className="absolute text-5xl font-light text-white/25">+</span>
            <span
              ref={letterRef}
              className="relative font-sans font-bold leading-none text-white"
              style={{ visibility: 'hidden', fontSize: `${p.letterSizeVmin}vmin` }}
            />
            <div
              ref={feedbackRef}
              className="absolute top-6 text-base font-semibold transition-opacity duration-200"
              style={{ opacity: 0 }}
            />
          </div>
          <p className="pb-8 text-center text-sm text-white/45">{c.responseHint}</p>
          <div
            ref={tapRef}
            className="pointer-events-none absolute inset-0"
            style={{ opacity: 0, boxShadow: 'inset 0 0 0 6px rgba(167,139,250,0.7)' }}
          />
        </>
      )}

      {DEV_TOOLS && (
        <button
          type="button"
          onClick={devSkip}
          className="absolute top-4 right-4 z-50 rounded-lg bg-black/50 px-2.5 py-1 text-[11px] font-medium text-white/80 hover:bg-black/70"
        >
          Omitir (dev)
        </button>
      )}

      {phase === 'practice_feedback' && feedback && (
        <Overlay
          title={feedback.pass ? '¡Bien hecho!' : 'Casi listo'}
          body={
            feedback.pass
              ? `Detectaste el ${feedback.hitPct}% de las «${X}». Ahora empieza la prueba real.`
              : `${
                  feedback.faPct > p.maxFalseAlarmPct
                    ? `Respondiste a demasiadas letras que no eran «${X}» (${feedback.faPct}%). Responde solo cuando aparezca la ${X}.`
                    : `Detectaste el ${feedback.hitPct}% de las «${X}». Responde en cuanto veas la ${X}.`
                } ${feedback.last ? 'Empecemos la prueba real.' : 'Practica una vez más.'}`
          }
          actions={
            feedback.pass || feedback.last ? (
              <Button onClick={() => queue('test')}>Comenzar la prueba</Button>
            ) : (
              <Button onClick={retryPractice}>Practicar de nuevo</Button>
            )
          }
        />
      )}
    </div>,
    document.body,
  )
}

function Overlay({ title, body, actions }: { title: string; body: string; actions: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
      <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      <p className="max-w-sm text-sm leading-relaxed text-white/70">{body}</p>
      <div className="mt-2 w-full max-w-xs">{actions}</div>
    </div>
  )
}
