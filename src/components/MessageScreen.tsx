import type { ReactNode } from 'react'
import Layout from './Layout'
import type { Step } from '../app/steps'

export default function MessageScreen({
  step,
  eyebrow,
  title,
  intro,
  bullets,
  onBack,
  footer,
  children,
}: {
  step?: Step
  eyebrow?: string
  title: string
  intro?: string
  bullets?: string[]
  onBack?: () => void
  footer?: ReactNode
  children?: ReactNode
}) {
  return (
    <Layout step={step} onBack={onBack} footer={footer}>
      <div className="space-y-3">
        {eyebrow && (
          <span className="inline-block rounded-full bg-violet-100/90 px-3 py-1 text-xs font-bold uppercase tracking-wider text-violet-700">
            {eyebrow}
          </span>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {title}
        </h1>
        {intro && (
          <p className="text-sm font-normal leading-relaxed text-slate-600 sm:text-base">
            {intro}
          </p>
        )}
      </div>

      {bullets && (
        <div className="mt-6 space-y-2.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Requisitos antes de iniciar:
          </p>
          <div className="grid gap-2.5">
            {bullets.map((b, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/70 p-3.5 shadow-xs transition-all hover:border-violet-200 hover:bg-white"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                  <svg className="h-4 w-4 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <span className="text-xs font-medium text-slate-700 sm:text-sm">{b}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {children}
    </Layout>
  )
}

