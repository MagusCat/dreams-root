import { flow } from '../content'
import type { Summary } from './summary'
import type { CptPayload } from './cpt/types'

// Soft device-level gate in localStorage (clearing storage bypasses it).
const COMPLETED = 'dreams:completed'
const FINGERPRINT = 'dreams:fingerprint'
const STEP = 'dreams:step'
const CONSENT = 'dreams:consent'
const SUMMARY = 'dreams:summary'

export function saveFingerprintLocal(fp: string | null): void {
  if (!fp) return
  try {
    localStorage.setItem(FINGERPRINT, fp)
  } catch {
    /* ignore */
  }
}

export function getFingerprintLocal(): string | null {
  try {
    return localStorage.getItem(FINGERPRINT)
  } catch {
    return null
  }
}

export function markCompletedLocal(): void {
  try {
    localStorage.setItem(COMPLETED, '1')
  } catch {
    /* ignore */
  }
}

export function hasCompletedLocal(): boolean {
  try {
    return localStorage.getItem(COMPLETED) === '1'
  } catch {
    return false
  }
}

export function saveStepLocal(step: string): void {
  try {
    localStorage.setItem(STEP, step)
  } catch {
    /* ignore */
  }
}

export function getStepLocal(): string | null {
  try {
    return localStorage.getItem(STEP)
  } catch {
    return null
  }
}

export function acceptConsentLocal(): void {
  try {
    localStorage.setItem(CONSENT, '1')
  } catch {
    /* ignore */
  }
}

export function hasConsentLocal(): boolean {
  try {
    return localStorage.getItem(CONSENT) === '1'
  } catch {
    return false
  }
}

// Wipe in-progress data (drafts, step pointer, consent, fingerprint) but keep
// the "completed" gate and the submitted-answers summary. Used by "Empezar de
// nuevo" and after a successful finalize.
export function clearProgressLocal(): void {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('dreams:') && k !== COMPLETED && k !== SUMMARY)
      .forEach((k) => localStorage.removeItem(k))
  } catch {
    /* ignore */
  }
}

// Read-only snapshot of the submitted answers, shown in "ver mis respuestas".
export function saveSummaryLocal(summary: Summary): void {
  try {
    localStorage.setItem(SUMMARY, JSON.stringify(summary))
  } catch {
    /* ignore */
  }
}

export function getSummaryLocal(): Summary | null {
  try {
    const raw = localStorage.getItem(SUMMARY)
    return raw ? (JSON.parse(raw) as Summary) : null
  } catch {
    return null
  }
}

function readDraft<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw != null ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export type LocalAnswers = {
  intake: Record<string, unknown>
  maas: number[]
  pps: number[]
  digital: Record<string, unknown>
  ai: Record<string, unknown>
  cpt: CptPayload | null
  emoji: { welcome_emoji?: string; emoji_answer?: string }
  contact: { email?: string; wants_results?: boolean }
}

// Assemble the full payload from the per-step drafts for the final batch save.
// Draft keys mirror the ones written by useLocalState in each screen.
export function collectAnswersLocal(): LocalAnswers {
  const maasKey = `dreams:draft:maas:${flow.questionnaires.maas.items.length}`
  const ppsKey = `dreams:draft:pps:${flow.questionnaires.pps.items.length}`
  return {
    intake: readDraft<Record<string, unknown>>('dreams:draft:intake') ?? {},
    maas: (readDraft<(number | null)[]>(maasKey) ?? []).filter((v): v is number => typeof v === 'number'),
    pps: (readDraft<(number | null)[]>(ppsKey) ?? []).filter((v): v is number => typeof v === 'number'),
    digital: readDraft<Record<string, unknown>>('dreams:draft:digital') ?? {},
    ai: readDraft<Record<string, unknown>>('dreams:draft:ai') ?? {},
    cpt: readDraft<CptPayload>('dreams:draft:cpt'),
    emoji: {
      welcome_emoji: readDraft<{ shown: string }>('dreams:emoji')?.shown,
      emoji_answer: readDraft<string>('dreams:draft:recall') ?? undefined,
    },
    contact: readDraft<{ email?: string; wants_results?: boolean }>('dreams:draft:contact') ?? {},
  }
}
