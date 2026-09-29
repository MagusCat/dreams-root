
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
  maxFalseAlarmPct: number
  jitterMs: number
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
