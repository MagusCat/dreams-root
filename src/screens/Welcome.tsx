import { useState } from 'react'
import Layout from '../components/Layout'
import { Button } from '../components/Button'
import { useSession } from '../hooks/useSession'
import { flow } from '../content'
import { getEmojiChallenge } from '../lib/emoji'

function InfoList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h2 className="text-xs font-bold uppercase tracking-wider text-violet-700">{title}</h2>
      <ul className="mt-2.5 space-y-2">
        {items.map((t, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
            <svg
              className="mt-0.5 h-4 w-4 shrink-0 stroke-violet-500"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            <span className="leading-relaxed">{t}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function Welcome() {
  const { goTo, resumeStep, startNew } = useSession()
  const c = flow.welcome
  const [showImg, setShowImg] = useState(true)
  const emoji = getEmojiChallenge().shown

  return (
    <Layout
      footer={
        resumeStep ? (
          <div className="space-y-2">
            <Button onClick={() => goTo(resumeStep)}>Continuar donde lo dejaste</Button>
            <button
              type="button"
              onClick={startNew}
              className="w-full rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              Empezar de nuevo
            </button>
          </div>
        ) : (
          <Button onClick={() => goTo('consent')}>{c.cta}</Button>
        )
      }
    >
      <div className="animate-enter space-y-5">
        {c.image && showImg && (
          <img
            src={c.image}
            width={160}
            height={160}
            alt=""
            onError={() => setShowImg(false)}
            className="h-40 w-full rounded-2xl object-contain"
          />
        )}

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{c.title}</h1>
          <p className="text-sm leading-relaxed text-slate-600 sm:text-base">{c.intro}</p>
        </div>

        <p className="rounded-2xl border border-slate-200/80 p-3 text-sm leading-relaxed text-slate-700">
          {c.context}
        </p>

        <InfoList title="Objetivos del equipo" items={c.objectives} />
        <InfoList title="Indicaciones" items={c.instructions} />

        <div className="pt-2 text-center text-5xl leading-none">{emoji}</div>
      </div>
    </Layout>
  )
}
