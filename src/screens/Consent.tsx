import { useState } from 'react'
import Layout from '../components/Layout'
import { Button } from '../components/Button'
import { useSession } from '../hooks/useSession'
import { flow } from '../content'

export default function Consent() {
  const { goTo, acceptConsent } = useSession()
  const [accepted, setAccepted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const c = flow.consent

  async function accept() {
    setSubmitting(true)
    setError(null)
    try {
      await acceptConsent()
      goTo('intake')
    } catch (e) {
      console.error(e)
      setError('No se pudo continuar. Inténtalo de nuevo.')
      setSubmitting(false)
    }
  }

  return (
    <Layout
      step="consent"
      onBack={() => goTo('welcome')}
      footer={
        <Button disabled={!accepted || submitting} onClick={accept}>
          {submitting ? 'Iniciando…' : c.cta}
        </Button>
      }
    >
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {c.title}
        </h1>
      </div>

      <div className="mt-5 space-y-3">
        {c.paragraphs.map((p, i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-200/80 bg-white/70 p-3.5 shadow-xs transition-all hover:border-violet-200 hover:bg-white"
          >
            <h2 className="text-xs font-bold uppercase tracking-wider text-violet-700">
              {p.label}
            </h2>
            <p className="mt-1 text-xs font-medium leading-relaxed text-slate-700 sm:text-sm">
              {p.text}
            </p>
          </div>
        ))}
      </div>

      <label className={`mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-all duration-200 select-none ${
        accepted
          ? 'border-violet-400 bg-violet-50/80 text-violet-950 shadow-sm'
          : 'border-slate-200 bg-white/80 text-slate-800 hover:border-violet-300 hover:bg-white'
      }`}>
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded-md border-slate-300 text-violet-600 focus:ring-violet-400 accent-violet-600"
        />
        <span className="text-xs font-medium leading-normal sm:text-sm">{c.checkbox}</span>
      </label>

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-600">
          {error}
        </div>
      )}
    </Layout>
  )
}

