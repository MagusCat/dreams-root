import { createContext } from 'react'
import type { Step } from './steps'

// States outside the linear flow: 'already_done' (this device already completed
// the survey → finalization screen) and 'my_answers' (read-only summary).
export type CurrentStep = Step | 'already_done' | 'my_answers'

export type SessionValue = {
  loading: boolean
  step: CurrentStep
  uid: string | null
  // Set when a returning device has an in-progress (uncompleted) session.
  resumeStep: Step | null
  goTo: (s: CurrentStep) => void
  // Records consent locally (no DB write; everything is saved at the end).
  acceptConsent: () => Promise<void>
  // Discards local progress and returns to a fresh welcome.
  startNew: () => void
}

export const SessionContext = createContext<SessionValue | null>(null)
