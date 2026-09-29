import { flow } from '../content'
import { supabase } from './supabase/client'
import type { CptPayload } from './cpt/types'

// Visible dev helpers; VITE_DEV_TOOLS=false turns them off in a dev build.
export const DEV_TOOLS = import.meta.env.DEV && import.meta.env.VITE_DEV_TOOLS !== 'false'

const CPT_DRAFT = 'dreams:draft:cpt'
const STEP = 'dreams:step'

// Minimal VALID CPT payload (1 trial) so a skipped test still passes the save_cpt RPC.
function placeholderCpt(): CptPayload {
  const p = flow.cpt.params
  return {
    parameters: {
      version: p.version,
      isi_ms: p.isiMs,
      window_ms: p.windowMs,
      exposure_ms: p.exposureMs,
      seed: p.seed,
      target_letter: p.targetLetter,
      target_ratio: p.targetRatio,
      n_blocks: p.nBlocks,
      total_trials: 1,
    },
    started_at: new Date(Date.now() - 1000).toISOString(),
    finished_at: new Date().toISOString(),
    focus_losses: 0,
    fullscreen_exits: 0,
    practice_attempts: 1,
    practice_hits_pct: 0,
    trials: [
      { n_trial: 1, block: 0, is_practice: false, letter: p.targetLetter, planned_onset_ms: 0, actual_onset_ms: 0, rt_ms: null },
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

type DreamsDevConsole = {
  skipCpt: () => void
  restart: () => void
  checkConnection: () => Promise<boolean>
}

// Hidden console-only helpers (no UI), available in any build: window.dreamsDev
// with skipCpt(), restart() and checkConnection().
export function installDevConsole(): void {
  if (typeof window === 'undefined') return
  const api: DreamsDevConsole = {
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
