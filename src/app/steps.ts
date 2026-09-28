// Full flow order. No routing, so steps can't be skipped via the URL.
export const STEPS = [
  'welcome',
  'consent',
  'intake',
  'maas',
  'pps',
  'digital',
  'ai',
  'cpt',
  'recall',
  'contact',
  'closing',
] as const

export type Step = (typeof STEPS)[number]

// Steps shown/counted in the progress bar (welcome/consent/intake excluded).
export const PROGRESS_STEPS: readonly Step[] = ['maas', 'pps', 'digital', 'ai', 'cpt', 'recall', 'contact']

// Form steps the user can walk back through. welcome/consent are one-time gates,
// so intake — the first form step — has no "back". Single source of truth for
// back navigation.
export const FORM_STEPS: readonly Step[] = ['intake', 'maas', 'pps', 'digital', 'ai', 'cpt', 'recall', 'contact']

export function prevStep(step: Step): Step | undefined {
  const i = FORM_STEPS.indexOf(step)
  return i > 0 ? FORM_STEPS[i - 1] : undefined
}

export function nextStep(step: Step): Step | undefined {
  const i = FORM_STEPS.indexOf(step)
  return i >= 0 && i < FORM_STEPS.length - 1 ? FORM_STEPS[i + 1] : undefined
}

export const CONSENT_VERSION = '2026-09-25'
