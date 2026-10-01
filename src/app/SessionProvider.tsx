import { useEffect, useState, useCallback, type ReactNode } from 'react'
import { computeFingerprint } from '../lib/fingerprint'
import {
  hasCompletedLocal,
  saveFingerprintLocal,
  getStepLocal,
  saveStepLocal,
  acceptConsentLocal,
  clearProgressLocal,
} from '../lib/localStore'
import { startParticipant } from '../lib/data'
import { SessionContext, type CurrentStep } from './session-context'
import { FORM_STEPS, type Step } from './steps'

export function SessionProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<CurrentStep>('welcome')
  const [resumeStep, setResumeStep] = useState<Step | null>(null)
  const [uid, setUid] = useState<string | null>(null)

  useEffect(() => {
    if (hasCompletedLocal()) {
      setStep('already_done')
    } else {
      const saved = getStepLocal()
      // 'closing' = the final save failed or was interrupted: resume straight into it.
      if (saved && (saved === 'closing' || (FORM_STEPS as readonly string[]).includes(saved))) {
        setResumeStep(saved as Step)
      }
    }
    const t = setTimeout(() => setLoading(false), 3000)
    return () => clearTimeout(t)
  }, [])

  const goTo = useCallback((s: CurrentStep) => {
    setStep(s)
    if (s !== 'already_done' && s !== 'my_answers') saveStepLocal(s)
  }, [])

  const acceptConsent = useCallback(async () => {
    acceptConsentLocal()
    const fingerprint = await computeFingerprint()
    saveFingerprintLocal(fingerprint)
    setUid(await startParticipant())
  }, [])

  const startNew = useCallback(() => {
    clearProgressLocal()
    setResumeStep(null)
    setStep('welcome')
  }, [])

  return (
    <SessionContext.Provider
      value={{ loading, step, uid, resumeStep, goTo, acceptConsent, startNew }}
    >
      {children}
    </SessionContext.Provider>
  )
}
