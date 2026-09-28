import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Layout from '../components/Layout'
import { Button } from '../components/Button'
import { useSession } from '../hooks/useSession'
import { flow } from '../content'
import { nextStep } from '../app/steps'
import { buildSequence, type Block } from '../lib/cpt/sequence'
import { runBlock, targetHitPct, falseAlarmPct } from '../lib/cpt/engine'
import type { CptPayload, RecordedTrial, CptLiveEvent } from '../lib/cpt/types'
import { DEV_TOOLS } from '../lib/devTools'

type Phase = 'intro' | 'countdown' | 'block' | 'practice_feedback' | 'interrupted' | 'done'

// Continuous Performance Test (X-CPT): respond only to the target letter. The
// per-frame stimulus/timing runs in lib/cpt/engine (vanilla, no React renders);
// this component owns the layout and the phase flow only.
export default function Cpt() {
  const { goTo } = useSession()
  const c = flow.cpt
  const p = c.params
  const { practice, blocks } = useMemo(() => buildSequence(p), [p])
  const progressTotal = p.nBlocks * p.trialsPerBlock

  const [phase, setPhase] = useState<Phase>('intro')
  const [mode, setMode] = useState<'practice' | 'main'>('practice')
  const [label, setLabel] = useState('')
  const [timeLeft, setTimeLeft] = useState('')
  const [count, setCount] = useState(3)
  // Completed real progress (0–100). React owns it at block boundaries; the engine
  // fills it imperatively DURING a block (no re-render then, so they don't fight).
  const [progressPct, setProgressPct] = useState(0)
  const [feedback, setFeedback] = useState<{
    hitPct: number
    faPct: number
    pass: boolean
    reason: 'low_hits' | 'high_fa' | null
  } | null>(null)

  const hostRef = useRef<HTMLDivElement>(null)
  const letterRef = useRef<HTMLSpanElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const tapRef = useRef<HTMLDivElement>(null)
  const feedbackRef = useRef<HTMLDivElement>(null)

  // phaseRef mirrors phase for the (stable) visibility handler and timers.
  const phaseRef = useRef(phase)
  phaseRef.current = phase
  const ctrlRef = useRef<AbortController | null>(null)

  // Corrective feedback DURING PRACTICE ONLY (would bias the real measure).
  const fbTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const flashFeedback = (text: string, tone: 'good' | 'bad' | 'warn') => {
    const el = feedbackRef.current
    if (!el) return
    el.textContent = text
    el.style.color = tone === 'good' ? '#6ee7b7' : tone === 'bad' ? '#fca5a5' : '#fcd34d'
    el.style.opacity = '1'
    clearTimeout(fbTimer.current)
    fbTimer.current = setTimeout(() => {
      if (feedbackRef.current) feedbackRef.current.style.opacity = '0'
    }, 700)
  }

  // Dev-only live HUD: updated by DOM (no React re-render), never shown to real
  // participants (would bias the measure).
  const hudRef = useRef<HTMLPreElement>(null)
  const tally = useRef({ hits: 0, commissions: 0, omissions: 0, block: 0, nTrial: 0, letter: '', rt: null as number | null })
  const renderHud = () => {
    const el = hudRef.current
    if (!el) return
    const t = tally.current
    el.textContent =
      `bloque ${t.block}  ensayo ${t.nTrial}\n` +
      `letra ${t.letter || '–'}  TR ${t.rt != null ? Math.round(t.rt) + 'ms' : '–'}\n` +
      `aciertos ${t.hits}  comisiones ${t.commissions}  omisiones ${t.omissions}`
  }
  const onLive = (ev: CptLiveEvent) => {
    // Teach the rule during practice with immediate, low-key feedback.
    if (pending.current?.isPractice) {
      if (ev.kind === 'hit') flashFeedback('¡Bien!', 'good')
      else if (ev.kind === 'commission') flashFeedback(`Esa no era la ${p.targetLetter}`, 'bad')
      else if (ev.kind === 'omission') flashFeedback(`Se te pasó una ${p.targetLetter}`, 'warn')
    }
    if (!DEV_TOOLS) return
    const t = tally.current
    if (ev.kind === 'onset') Object.assign(t, { block: ev.block, nTrial: ev.n_trial, letter: ev.letter, rt: null })
    else if (ev.kind === 'hit') { t.hits++; t.rt = ev.rt_ms ?? null }
    else if (ev.kind === 'commission') { t.commissions++; t.rt = ev.rt_ms ?? null }
    else t.omissions++
    renderHud()
  }

  // Mutable run state (no re-render): filled by the engine and the phase flow.
  const trials = useRef<RecordedTrial[]>([])
  const nTrial = useRef(1)
  const blockNo = useRef(0)
  const mainIdx = useRef(0)
  const attempts = useRef(0)
  const lastPct = useRef(0)
  const startedAt = useRef(0)
  const counters = useRef({ focus_losses: 0, fullscreen_exits: 0 })
  const pending = useRef<{ block: Block; isPractice: boolean; base: number } | null>(null)
  const [runId, setRunId] = useState(0)
  const [startToken, setStartToken] = useState(0)

  // Validity guards: count tab-switches and fullscreen exits during the test.
  // Losing focus mid-block corrupts that block's timing (rAF freezes when hidden),
  // so we abort it and let the participant redo it instead of keeping bad data.
  const onVisibility = useRef(() => {
    if (!document.hidden) return
    counters.current.focus_losses++
    if (phaseRef.current === 'block' || phaseRef.current === 'countdown') {
      ctrlRef.current?.abort()
      setPhase('interrupted')
    }
  })
  const onFullscreen = useRef(() => {
    if (!document.fullscreenElement) counters.current.fullscreen_exits++
  })

  function attachGuards() {
    document.addEventListener('visibilitychange', onVisibility.current)
    document.addEventListener('fullscreenchange', onFullscreen.current)
  }
  function detachGuards() {
    document.removeEventListener('visibilitychange', onVisibility.current)
    document.removeEventListener('fullscreenchange', onFullscreen.current)
  }
  useEffect(() => detachGuards, [])

  function queue(block: Block, isPractice: boolean, base: number, countdown = true) {
    pending.current = { block, isPractice, base }
    setMode(isPractice ? 'practice' : 'main')
    if (countdown) {
      setCount(3)
      setPhase('countdown')
      setStartToken((n) => n + 1)
    } else {
      // Continuous test: roll straight into the next block, no pause/countdown.
      setPhase('block')
      setRunId((n) => n + 1)
    }
  }

  // 3-2-1 countdown, then hand off to the block (its DOM mounts on phase 'block').
  useEffect(() => {
    if (startToken === 0) return
    const timers = [
      setTimeout(() => setCount(2), 800),
      setTimeout(() => setCount(1), 1600),
      setTimeout(() => {
        // Skip if the countdown was interrupted (focus lost) meanwhile.
        if (phaseRef.current !== 'countdown') return
        setPhase('block')
        setRunId((n) => n + 1)
      }, 2400),
    ]
    return () => timers.forEach(clearTimeout)
  }, [startToken])

  // Runs the pending block once its DOM (letter + progress bar) is mounted.
  useEffect(() => {
    if (runId === 0 || !pending.current) return
    const job = pending.current
    const refs = {
      host: hostRef.current!,
      letterEl: letterRef.current!,
      progressEl: progressRef.current!,
      tapEl: tapRef.current ?? undefined,
    }
    const ctrl = new AbortController()
    ctrlRef.current = ctrl

    void runBlock({
      refs,
      letters: job.block.letters,
      onsets: job.block.onsets,
      timing: { exposureMs: p.exposureMs, windowMs: p.windowMs },
      block: blockNo.current++,
      isPractice: job.isPractice,
      startNTrial: nTrial.current,
      progressBase: job.base,
      progressTotal,
      signal: ctrl.signal,
      target: p.targetLetter,
      onLive, // always: drives practice feedback (+ HUD in dev)
    }).then((tr) => {
      if (ctrl.signal.aborted) return // interrupted block: discard, don't record
      trials.current.push(...tr)
      nTrial.current += tr.length
      if (job.isPractice) {
        const hitPct = targetHitPct(tr, p.targetLetter)
        const faPct = falseAlarmPct(tr, p.targetLetter)
        lastPct.current = hitPct
        const reason = hitPct < p.passPct ? 'low_hits' : faPct > p.maxFalseAlarmPct ? 'high_fa' : null
        setFeedback({ hitPct, faPct, pass: reason === null, reason })
        setPhase('practice_feedback')
      } else {
        setProgressPct(((job.base + tr.length) / progressTotal) * 100)
        mainIdx.current++
        if (mainIdx.current >= p.nBlocks) finish()
        else advanceBlock() // continuous: straight into the next block
      }
    })
    return () => ctrl.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId])

  // Estimated time left across the remaining real blocks (mean ISI × trials left).
  function estimateTimeLeft(completedBlocks: number): string {
    const trialsLeft = (p.nBlocks - completedBlocks) * p.trialsPerBlock
    const min = Math.max(1, Math.round((trialsLeft * p.isiMs) / 60000))
    return `≈ ${min} min`
  }

  function start() {
    void document.documentElement.requestFullscreen?.().catch(() => {})
    attachGuards()
    startedAt.current = Date.now()
    attempts.current = 1
    tally.current = { hits: 0, commissions: 0, omissions: 0, block: 0, nTrial: 0, letter: '', rt: null }
    setLabel(c.practiceLabel)
    queue(practice, true, 0)
  }

  function retryPractice() {
    attempts.current = 2
    setLabel(c.practiceLabel)
    queue(practice, true, 0)
  }

  function startMain() {
    mainIdx.current = 0
    setProgressPct(0)
    setLabel('')
    setTimeLeft(estimateTimeLeft(0))
    queue(blocks[0], false, 0) // one countdown at the very start
  }

  // Continuous: next block with no break and no countdown.
  function advanceBlock() {
    const i = mainIdx.current
    setTimeLeft(estimateTimeLeft(i))
    queue(blocks[i], false, i * p.trialsPerBlock, false)
  }

  // Redo the block that was interrupted (its data was discarded). Keeps the
  // countdown so the participant can get ready again.
  function redo() {
    const job = pending.current
    if (job) queue(job.block, job.isPractice, job.base)
  }

  // User-facing stop: abort the running block and land on the interrupted screen,
  // where the participant chooses to retry or continue.
  function stopTest() {
    ctrlRef.current?.abort()
    setPhase('interrupted')
  }

  // Leave the CPT for the next step without recording it (dev skip + "continue").
  function skip() {
    ctrlRef.current?.abort()
    detachGuards()
    if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => {})
    const next = nextStep('cpt')
    if (next) goTo(next)
  }

  function finish() {
    detachGuards()
    if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => {})
    const payload: CptPayload = {
      parameters: {
        version: p.version,
        isi_ms: p.isiMs,
        window_ms: p.windowMs,
        exposure_ms: p.exposureMs,
        seed: p.seed,
        target_letter: p.targetLetter,
        target_ratio: p.targetRatio,
        n_blocks: p.nBlocks,
        total_trials: trials.current.length,
      },
      started_at: new Date(startedAt.current).toISOString(),
      finished_at: new Date().toISOString(),
      focus_losses: counters.current.focus_losses,
      fullscreen_exits: counters.current.fullscreen_exits,
      practice_attempts: attempts.current,
      practice_hits_pct: lastPct.current,
      trials: trials.current,
    }
    try {
      localStorage.setItem('dreams:draft:cpt', JSON.stringify(payload))
    } catch {
      /* ignore */
    }
    setPhase('done')
  }

  if (phase === 'intro') {
    return (
      <Layout step="cpt" footer={<Button onClick={start}>{c.startCta}</Button>}>
        <div className="animate-enter space-y-5">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{c.title}</h1>
            <p className="text-sm leading-relaxed text-slate-600">{c.intro}</p>
          </div>
          <ul className="space-y-2.5">
            {c.instructions.map((line, i) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed text-slate-700">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium leading-relaxed text-amber-800">
            {c.warning}
          </p>
          {DEV_TOOLS && (
            <button
              type="button"
              onClick={skip}
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
    const next = nextStep('cpt')
    return (
      <Layout step="cpt" footer={<Button onClick={() => next && goTo(next)}>{c.doneCta}</Button>}>
        <div className="animate-enter flex h-full flex-col items-center justify-center space-y-3 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{c.doneTitle}</h1>
          <p className="max-w-sm text-sm leading-relaxed text-slate-600">{c.doneText}</p>
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
    >
      <div className="px-5 pt-5 sm:px-8">
        <div className="flex items-center justify-between gap-3 text-xs font-medium text-white/55">
          <span>{label}</span>
          <div className="flex items-center gap-3">
            <span>{mode === 'main' ? timeLeft : `Responde solo a la «${p.targetLetter}»`}</span>
            {(phase === 'block' || phase === 'countdown') && (
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  stopTest()
                }}
                className="rounded-lg border border-white/20 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-white/70 transition-colors hover:bg-white/15 hover:text-white"
              >
                Detener
              </button>
            )}
          </div>
        </div>
        {/* Real test: progress across all blocks (how much is left). Practice has
            its own short label, no bar, so 0% doesn't look stuck. */}
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            ref={progressRef}
            className={`h-full rounded-full bg-violet-400 transition-[width] duration-200 ease-out ${
              mode === 'practice' ? 'animate-pulse' : ''
            }`}
            style={{ width: mode === 'main' ? `${progressPct}%` : '20%' }}
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

      {phase === 'block' && (
        <>
          <div className="relative flex flex-1 items-center justify-center">
            {/* Fixation cross behind the letter: keeps gaze centered during the
                blank gap (letter is hidden then, revealing the cross). */}
            <span className="absolute text-5xl font-light text-white/25 select-none">+</span>
            <span
              ref={letterRef}
              className="relative text-[26vh] font-bold leading-none sm:text-[30vh]"
              style={{ visibility: 'hidden' }}
            />
            {/* Practice-only corrective feedback (top, out of the way of the letter). */}
            <div
              ref={feedbackRef}
              className="absolute top-6 text-base font-semibold transition-opacity duration-200"
              style={{ opacity: 0 }}
            />
          </div>
          <p className="pb-8 text-center text-sm text-white/45">{c.responseHint}</p>
          {/* Tap acknowledgement: an inset ring flashed by the engine on every response. */}
          <div
            ref={tapRef}
            className="pointer-events-none absolute inset-0"
            style={{ opacity: 0, boxShadow: 'inset 0 0 0 6px rgba(167,139,250,0.7)' }}
          />
        </>
      )}

      {DEV_TOOLS && (
        <>
          <pre
            ref={hudRef}
            className="pointer-events-none absolute bottom-4 left-4 z-50 rounded-lg bg-black/55 px-3 py-2 font-mono text-[11px] leading-tight text-emerald-300"
          />
          <button
            type="button"
            onClick={skip}
            className="absolute top-4 right-4 z-50 rounded-lg bg-black/50 px-2.5 py-1 text-[11px] font-medium text-white/80 hover:bg-black/70"
          >
            Omitir (dev)
          </button>
        </>
      )}

      {phase === 'practice_feedback' && feedback && (
        <Overlay
          title={feedback.pass ? '¡Bien hecho!' : 'Casi listo'}
          body={
            feedback.pass
              ? `Detectaste el ${feedback.hitPct}% de las «${p.targetLetter}» sin equivocarte con las demás. Ahora empieza la prueba real.`
              : `${
                  feedback.reason === 'high_fa'
                    ? `Respondiste a demasiadas letras que no eran «${p.targetLetter}» (${feedback.faPct}%). Responde solo cuando aparezca la ${p.targetLetter}.`
                    : `Solo detectaste el ${feedback.hitPct}% de las «${p.targetLetter}». Responde en cuanto veas la ${p.targetLetter}.`
                } ${attempts.current < 2 ? 'Practica una vez más o continúa.' : 'Empecemos la prueba real.'}`
          }
          actions={
            feedback.pass || attempts.current >= 2 ? (
              <Button onClick={startMain}>Comenzar la prueba</Button>
            ) : (
              <div className="flex w-full flex-col gap-2">
                <Button onClick={retryPractice}>Practicar de nuevo</Button>
                <button
                  type="button"
                  onClick={startMain}
                  className="text-sm font-medium text-white/60 hover:text-white"
                >
                  Continuar de todos modos
                </button>
              </div>
            )
          }
        />
      )}

      {phase === 'interrupted' && (
        <Overlay
          title="Prueba detenida"
          body="Este bloque no cuenta. Puedes reintentarlo desde aquí o continuar sin repetirlo."
          actions={
            <div className="flex w-full flex-col gap-2">
              <Button onClick={redo}>Reintentar</Button>
              <button
                type="button"
                onClick={skip}
                className="text-sm font-medium text-white/60 hover:text-white"
              >
                Continuar sin repetir
              </button>
            </div>
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
