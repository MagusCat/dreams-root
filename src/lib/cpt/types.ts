// Shared CPT types. The DB shape (parameters/trials) mirrors the save_cpt RPC
// and the cpt_session/cpt_trial tables (supabase/migrations).

export type CptParams = {
  version: string
  seed: number
  targetLetter: string
  targetRatio: number
  exposureMs: number
  isiMs: number
  windowMs: number
  nBlocks: number
  trialsPerBlock: number
  practiceTrials: number
  passPct: number
  maxFalseAlarmPct: number // practice fails if the participant taps on too many non-targets
  jitterMs: number // ISI is isiMs ± up to jitterMs (uniform); 0 = fixed rhythm
}

// One presented letter. is_target (letter === target) and responded (rt_ms != null)
// are derived downstream in analysis, not stored as columns.
export type RecordedTrial = {
  n_trial: number
  block: number
  is_practice: boolean
  letter: string
  planned_onset_ms: number
  actual_onset_ms: number
  rt_ms: number | null
}

// Live event stream for the dev-only HUD (never affects the recorded data).
export type CptLiveEvent = {
  kind: 'onset' | 'hit' | 'commission' | 'omission'
  n_trial: number
  block: number
  letter: string
  rt_ms?: number
}

// Exact payload the save_cpt RPC expects (data jsonb). total_trials MUST equal
// trials.length or the RPC rejects the batch.
export type CptPayload = {
  parameters: {
    version: string
    isi_ms: number
    window_ms: number
    exposure_ms: number
    seed: number
    target_letter: string
    target_ratio: number
    n_blocks: number
    total_trials: number
  }
  started_at: string
  finished_at: string
  focus_losses: number
  fullscreen_exits: number
  practice_attempts: number
  practice_hits_pct: number
  trials: RecordedTrial[]
}
