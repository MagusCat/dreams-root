import type { CptParams } from '../../content/schema'

export type { CptParams }

export type InputKind = 'keyboard' | 'touch' | 'mouse' | 'pen'

export type Classification =
  | 'hit'
  | 'omission'
  | 'commission'
  | 'correct_rejection'
  | 'anticipation'
  | 'late'
  | 'not_presented'

export type CptFlag = 'interruptions_exceeded' | 'low_frame_rate' | 'practice_failed' | 'session_reloaded'

// Raw response, t = ms since the trial's actual onset. Kept for every response
// so trials can be re-scored with another window later.
export type RawResponse = { t: number; input: InputKind }

// One scheduled letter. Onset/offset ms are relative to the run's start (t0).
// actual_* are null when the trial fell inside an interruption and was skipped.
// is_target, late RT and extra responses are derived from letter/responses.
export type RecordedTrial = {
  n_trial: number
  block: number
  is_practice: boolean
  letter: string
  planned_onset_ms: number
  actual_onset_ms: number | null
  actual_offset_ms: number | null
  rt_ms: number | null // first response, whatever its classification
  classification: Classification
  responses: RawResponse[]
}

// Exact payload the save_cpt RPC expects (data jsonb). parameters.total_trials
// MUST equal trials.length (0 only with the session_reloaded flag).
export type CptPayload = {
  parameters: CptParams & { seed: number; total_trials: number }
  started_at: string
  finished_at: string
  focus_losses: number
  fullscreen_exits: number
  orientation_changes: number
  practice_attempts: number
  practice_hits_pct: number
  test_attempts: number
  input_mode: InputKind | null
  fullscreen_available: boolean
  other_mode_responses: number
  frame_median_ms: number | null
  long_frame_pct: number | null
  flags: CptFlag[]
  trials: RecordedTrial[]
}
