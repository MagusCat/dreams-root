import { createContext } from 'react'
import type { Step } from './steps'

// States outside the linear flow: 'already_done' (this device already completed
// the survey → finalization screen) and 'my_answers' (read-only summary).
export type CurrentStep = Step | 'already_done' | 'my_answers'

export type SessionValue = {
  loading: boolean
  step: CurrentStep
  uid: string | null
  resumeStep: Step | null
  goTo: (s: CurrentStep) => void
  acceptConsent: () => Promise<void>
  startNew: () => void
}

export const SessionContext = createContext<SessionValue | null>(null)
