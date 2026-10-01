import { useEffect, useRef } from 'react'
import { useSession } from '../hooks/useSession'
import { supabase } from '../lib/supabase/client'
import Background from '../components/Background'
import Splash from '../screens/Splash'
import Welcome from '../screens/Welcome'
import Consent from '../screens/Consent'
import FormSection from '../screens/FormSection'
import Recall from '../screens/Recall'
import Contact from '../screens/Contact'
import Closing from '../screens/Closing'
import Finished from '../screens/Finished'
import MyAnswers from '../screens/MyAnswers'
import ScaleStep from '../screens/ScaleStep'
import Cpt from '../screens/Cpt'
import { DEV_TOOLS } from '../lib/devTools'
import { STEPS, type Step } from './steps'
import type { CurrentStep } from './session-context'

function renderStep(step: CurrentStep) {
  switch (step) {
    case 'welcome':
      return <Welcome />
    case 'consent':
      return <Consent />
    case 'intake':
      return <FormSection step="intake" />
    case 'maas':
      return <ScaleStep which="maas" />
    case 'pps':
      return <ScaleStep which="pps" />
    case 'digital':
      return <FormSection step="digital" />
    case 'ai':
      return <FormSection step="ai" />
    case 'cpt':
      return <Cpt />
    case 'recall':
      return <Recall />
    case 'contact':
      return <Contact />
    case 'closing':
      return <Closing />
    case 'already_done':
      return <Finished note="Ya completaste esta encuesta en este dispositivo." />
    case 'my_answers':
      return <MyAnswers />
    default:
      return null
  }
}

export default function App() {
  const { loading, step } = useSession()
  const entered = useRef(false)
  useEffect(() => {
    if (!loading) entered.current = true
  }, [loading])
  const anim = loading ? '' : entered.current ? 'anim-page' : 'anim-rise'

  const stepIdx = STEPS.indexOf(step as Step)
  const level = stepIdx >= 0 ? stepIdx / (STEPS.length - 1) : 1

  return (
    <div
      className="relative flex min-h-dvh items-center justify-center p-0 sm:p-6"
      style={{
        background:
          'linear-gradient(160deg, var(--sky-top) 0%, var(--sky-mid) 45%, var(--sky-bot) 100%)',
      }}
    >
      <Background level={level} paused={step === 'cpt'} />
      <div
        key={loading ? 'loading' : step}
        className={`${anim} flex w-full max-w-xl justify-center lg:max-w-2xl`}
      >
        {loading ? <Splash /> : renderStep(step)}
      </div>
      {DEV_TOOLS && <DevReset />}
    </div>
  )
}

function DevReset() {
  async function reset() {
    await supabase.auth.signOut()
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('dreams:'))
        .forEach((k) => localStorage.removeItem(k))
    } catch {
      /* ignore */
    }
    location.reload()
  }
  return (
    <button
      type="button"
      onClick={reset}
      className="fixed bottom-3 right-3 z-50 rounded-lg bg-black/40 px-2.5 py-1 text-[11px] font-medium text-white/80 backdrop-blur-sm hover:bg-black/60"
    >
      Reiniciar (dev)
    </button>
  )
}
