import Layout from '../components/Layout'
import { Button } from '../components/Button'
import { useSession } from '../hooks/useSession'
import { useLocalState } from '../hooks/useLocalState'
import { getEmojiChallenge } from '../lib/emoji'
import { prevStep, nextStep } from '../app/steps'
import { flow } from '../content'

export default function Recall() {
  const { goTo } = useSession()
  const c = flow.recall
  const { options } = getEmojiChallenge()
  const [answer, setAnswer] = useLocalState<string>('dreams:draft:recall', '')

  const back = prevStep('recall')
  const next = nextStep('recall')

  return (
    <Layout
      step="recall"
      onBack={back ? () => goTo(back) : undefined}
      footer={
        <Button disabled={!answer} onClick={() => next && goTo(next)}>
          {c.cta}
        </Button>
      }
    >
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{c.title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{c.intro}</p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        {options.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => setAnswer(e)}
            className={`grid h-24 place-items-center rounded-2xl border text-5xl transition ${
              answer === e
                ? 'border-violet-500 bg-violet-50 shadow-sm'
                : 'border-slate-200 bg-white hover:border-violet-300'
            }`}
          >
            {e}
          </button>
        ))}
      </div>
    </Layout>
  )
}
