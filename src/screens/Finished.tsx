import { useState } from 'react'
import { flow } from '../content'
import { useSession } from '../hooks/useSession'
import { getSummaryLocal } from '../lib/localStore'

export default function Finished({ note }: { note?: string }) {
  const { goTo } = useSession()
  const c = flow.closing
  const [mark, setMark] = useState<'cat' | 'check'>(() => (Math.random() < 0.5 ? 'cat' : 'check'))
  const hasSummary = getSummaryLocal() != null

  return (
    <div className="animate-enter flex flex-col items-center justify-center gap-6 px-6 text-center">
      {mark === 'cat' ? (
        <img
          src="/cat.png"
          alt="Gatito feliz"
          onError={() => setMark('check')}
          className="animate-cat h-44 w-44 object-contain drop-shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
        />
      ) : (
        <svg
          className="animate-cat h-24 w-24 text-white/90"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      )}

      <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)] sm:text-4xl">
        {c.title}
      </h1>
      <p className="max-w-md text-sm leading-relaxed text-white/80 sm:text-base">{c.text}</p>
      {note && <p className="text-xs text-white/60">{note}</p>}

      {hasSummary && (
        <button
          type="button"
          onClick={() => goTo('my_answers')}
          className="rounded-xl border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50"
        >
          Ver mis respuestas
        </button>
      )}
    </div>
  )
}
