import Layout from '../components/Layout'
import { useSession } from '../hooks/useSession'
import { getSummaryLocal } from '../lib/localStore'

export default function MyAnswers() {
  const { goTo } = useSession()
  const summary = getSummaryLocal()

  return (
    <Layout onBack={() => goTo('already_done')}>
      <div className="animate-enter space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Mis respuestas</h1>
          <p className="text-sm text-slate-600">Un resumen de lo que enviaste, guardado en este dispositivo.</p>
        </div>

        {!summary || summary.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            No hay respuestas guardadas en este dispositivo.
          </p>
        ) : (
          summary.map((section) => (
            <div key={section.title}>
              <h2 className="text-xs font-bold uppercase tracking-wider text-violet-700">{section.title}</h2>
              <dl className="mt-2 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200">
                {section.rows.map((r, i) => (
                  <div key={i} className="flex justify-between gap-4 px-4 py-2.5 text-sm">
                    <dt className="text-slate-500">{r.label}</dt>
                    <dd className="max-w-[55%] text-right font-medium text-slate-800">{r.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))
        )}
      </div>
    </Layout>
  )
}
