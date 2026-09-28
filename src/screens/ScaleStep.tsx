import { useState } from 'react'
import Layout from '../components/Layout'
import { Button } from '../components/Button'
import LikertScale from '../components/LikertScale'
import { flow } from '../content'
import { useSession } from '../hooks/useSession'
import { useLocalState } from '../hooks/useLocalState'
import { prevStep, nextStep } from '../app/steps'

// Likert questionnaire (MAAS or PPS): an intro screen followed by the slider items.
export default function ScaleStep({ which }: { which: 'maas' | 'pps' }) {
  const content = flow.questionnaires[which]
  const { goTo } = useSession()
  const back = prevStep(which)
  const next = nextStep(which)
  const [phase, setPhase] = useState<'intro' | 'items'>('intro')
  // Draft key includes item count so a content change discards a stale draft.
  // Answers stay local until the final batch save.
  const [answers, setAnswers] = useLocalState<(number | null)[]>(
    `dreams:draft:${which}:${content.items.length}`,
    () => content.items.map(() => null),
  )

  const setAt = (i: number, v: number) =>
    setAnswers((prev) => {
      const copy = [...prev]
      copy[i] = v
      return copy
    })

  const answeredCount = answers.filter((a) => typeof a === 'number').length
  const totalItems = content.items.length
  const complete = answeredCount === totalItems

  if (phase === 'intro') {
    return (
      <Layout
        step={which}
        onBack={back ? () => goTo(back) : undefined}
        footer={<Button onClick={() => setPhase('items')}>Comenzar</Button>}
      >
        <div key="intro" className="animate-enter space-y-4">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {content.title}
          </h1>
          <p className="text-sm font-medium leading-relaxed text-slate-700">{content.purpose}</p>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-violet-700">
              Cómo responder
            </h2>
            <ul className="mt-3 space-y-2.5">
              {content.instructions.map((t, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[11px] font-bold text-violet-700">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout
      step={which}
      onBack={() => setPhase('intro')}
      footer={
        <Button disabled={!complete} onClick={() => next && goTo(next)}>
          {content.cta}
        </Button>
      }
    >
      <div key="items" className="animate-enter">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700">
              Escala {content.instrument}
            </span>
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                complete ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {answeredCount} de {totalItems} respondidas
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {content.title}
          </h1>
          {content.intro && (
            <p className="text-sm font-normal text-slate-600 leading-relaxed">{content.intro}</p>
          )}
        </div>

        <ol className="stagger-in mt-6 space-y-4">
          {content.items.map((text, i) => (
            <li key={i}>
              <LikertScale
                index={i + 1}
                text={text}
                scale={content.scale}
                value={answers[i] ?? undefined}
                onChange={(v) => setAt(i, v)}
              />
            </li>
          ))}
        </ol>
      </div>
    </Layout>
  )
}
