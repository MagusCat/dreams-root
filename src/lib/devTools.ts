import { flow } from '../content'
import { supabase } from './supabase/client'
import { fetchCatalog } from './supabase/catalogs'
import { getEmojiChallenge } from './emoji'
import { computeFingerprint } from './fingerprint'
import { acceptConsentLocal, saveFingerprintLocal } from './localStore'
import { STEPS, type Step } from '../app/steps'
import type { Field } from '../content/schema'
import type { CptPayload } from './cpt/types'

// Visible dev helpers; VITE_DEV_TOOLS=false turns them off in a dev build.
export const DEV_TOOLS = import.meta.env.DEV && import.meta.env.VITE_DEV_TOOLS !== 'false'

const CPT_DRAFT = 'dreams:draft:cpt'
const STEP = 'dreams:step'

// Minimal VALID CPT payload (1 trial) so a skipped test still passes the save_cpt RPC.
function placeholderCpt(): CptPayload {
  const p = flow.cpt.params
  return {
    parameters: { ...p, seed: 0, total_trials: 1 },
    started_at: new Date(Date.now() - 1000).toISOString(),
    finished_at: new Date().toISOString(),
    focus_losses: 0,
    fullscreen_exits: 0,
    orientation_changes: 0,
    practice_attempts: 1,
    practice_hits_pct: 0,
    test_attempts: 1,
    input_mode: null,
    fullscreen_available: false,
    other_mode_responses: 0,
    frame_median_ms: null,
    long_frame_pct: null,
    flags: [],
    trials: [
      {
        n_trial: 1,
        block: 0,
        is_practice: false,
        letter: p.targetLetter,
        planned_onset_ms: 0,
        actual_onset_ms: 0,
        actual_offset_ms: p.exposureMs,
        rt_ms: null,
        classification: 'omission',
        responses: [],
      },
    ],
  }
}

// Never overwrite a real completed CPT; only fill a placeholder when none exists.
export function markCptDoneIfMissing(): void {
  try {
    if (!localStorage.getItem(CPT_DRAFT)) {
      localStorage.setItem(CPT_DRAFT, JSON.stringify(placeholderCpt()))
    }
  } catch {
    /* ignore */
  }
}

// Valid sample answer per field (first option / mid-range / first catalog row).
async function sampleValue(f: Field): Promise<unknown> {
  switch (f.type) {
    case 'number': {
      const mid = (f.min + f.max) / 2
      return f.integer ? Math.round(mid) : mid
    }
    case 'conditional':
      return 1
    case 'single':
      return f.options[0].value
    case 'multi':
      return f.options.slice(0, f.min ?? 1).map((o) => o.value)
    case 'catalog': {
      const [first] = await fetchCatalog(f.catalog)
      if (!first) throw new Error(`Catalog "${f.catalog}" is empty`)
      return f.multiple ? [first.id] : first.id
    }
  }
}

// Fills every questionnaire draft with valid answers, then jumps to `to`.
async function templateAnswer(to: Step = 'cpt'): Promise<void> {
  if (!STEPS.includes(to)) throw new Error(`Unknown step "${to}". Use one of: ${STEPS.join(', ')}`)
  const q = flow.questionnaires
  const drafts: Record<string, unknown> = { recall: getEmojiChallenge().shown, contact: {} }
  for (const step of ['intake', 'digital', 'ai'] as const) {
    const values: Record<string, unknown> = {}
    for (const f of q[step].fields) values[f.key] = await sampleValue(f)
    drafts[step] = values
  }
  for (const which of ['maas', 'pps'] as const) {
    const { min, max } = q[which].scale
    drafts[`${which}:${q[which].items.length}`] = q[which].items.map(
      () => min + Math.floor(Math.random() * (max - min + 1)),
    )
  }
  acceptConsentLocal()
  saveFingerprintLocal(await computeFingerprint())
  for (const [k, v] of Object.entries(drafts)) localStorage.setItem(`dreams:draft:${k}`, JSON.stringify(v))
  if (STEPS.indexOf(to) > STEPS.indexOf('cpt')) markCptDoneIfMissing()
  localStorage.setItem(STEP, to)
  location.reload()
}

type DreamsDevConsole = {
  templateAnswer: (to?: Step) => Promise<void>
  skipCpt: () => void
  restart: () => void
  checkConnection: () => Promise<boolean>
}

// Hidden console-only helpers (no UI), available in any build: window.dreamsDev
// with templateAnswer(to?), skipCpt(), restart() and checkConnection().
export function installDevConsole(): void {
  if (typeof window === 'undefined') return
  const api: DreamsDevConsole = {
    templateAnswer,
    skipCpt() {
      markCptDoneIfMissing()
      try {
        localStorage.setItem(STEP, 'recall')
      } catch {
        /* ignore */
      }
      location.reload()
    },
    restart() {
      void supabase.auth.signOut().finally(() => {
        try {
          Object.keys(localStorage)
            .filter((k) => k.startsWith('dreams:'))
            .forEach((k) => localStorage.removeItem(k))
        } catch {
          /* ignore */
        }
        location.reload()
      })
    },
    async checkConnection() {
      const url = import.meta.env.VITE_SUPABASE_URL
      const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY
      if (!url || !key) {
        console.error('❌ Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY')
        return false
      }
      const t0 = performance.now()
      try {
        const { error } = await supabase.from('device').select('id_device').limit(1)
        const ms = Math.round(performance.now() - t0)
        if (error) {
          console.error(`❌ Supabase responded with an error (${ms} ms):`, error.message)
          return false
        }
        console.log(`✅ Supabase connection OK (${ms} ms)`)
        return true
      } catch (e) {
        console.error('❌ Could not reach Supabase:', e)
        return false
      }
    },
  }
  ;(window as unknown as { dreamsDev: DreamsDevConsole }).dreamsDev = api
}
