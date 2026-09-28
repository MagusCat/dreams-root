import Layout from '../components/Layout'
import { Button } from '../components/Button'
import { useSession } from '../hooks/useSession'
import { useLocalState } from '../hooks/useLocalState'
import { flow } from '../content'
import { prevStep } from '../app/steps'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Optional last step: opt in to receive the study results by email. Stored in
// the local draft (dreams:draft:contact) and written to participant at finalize.
export default function Contact() {
  const { goTo } = useSession()
  const back = prevStep('contact')
  const c = flow.contact
  const [form, setForm] = useLocalState<{ wants_results?: boolean; email?: string }>(
    'dreams:draft:contact',
    {},
  )

  const wants = form.wants_results === true
  const email = form.email ?? ''
  const emailValid = EMAIL_RE.test(email.trim())
  // Opted in → require a valid email; otherwise they can finish freely.
  const canFinish = !wants || emailValid

  return (
    <Layout
      step="contact"
      onBack={back ? () => goTo(back) : undefined}
      footer={
        <Button disabled={!canFinish} onClick={() => goTo('closing')}>
          {wants ? c.cta : c.skipCta}
        </Button>
      }
    >
      <div className="animate-enter space-y-5">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{c.title}</h1>
          <p className="text-sm leading-relaxed text-slate-600">{c.intro}</p>
        </div>

        <label
          className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-all duration-200 select-none ${
            wants
              ? 'border-violet-400 bg-violet-50/80'
              : 'border-slate-200 bg-white hover:border-violet-300'
          }`}
        >
          <input
            type="checkbox"
            checked={wants}
            onChange={(e) => setForm((p) => ({ ...p, wants_results: e.target.checked }))}
            className="mt-0.5 h-4 w-4 rounded-md border-slate-300 text-violet-600 accent-violet-600 focus:ring-violet-400"
          />
          <span className="text-sm font-medium leading-normal text-slate-800">{c.checkbox}</span>
        </label>

        {wants && (
          <div className="animate-enter space-y-2">
            <label htmlFor="contact-email" className="block text-sm font-semibold text-slate-800">
              {c.emailLabel}
            </label>
            <input
              id="contact-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder={c.emailPlaceholder}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 outline-none transition-all duration-200 ease-out placeholder:text-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-400/15"
            />
            {email.trim() !== '' && !emailValid && (
              <p className="text-xs font-medium text-red-500">Ingresa un correo válido.</p>
            )}
            <p className="text-xs leading-relaxed text-slate-500">{c.note}</p>
          </div>
        )}
      </div>
    </Layout>
  )
}
