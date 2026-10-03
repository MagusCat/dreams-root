import { supabase } from './supabase/client'
import { readOrigin } from './fingerprint'
import { getFingerprintLocal, type LocalAnswers } from './localStore'
import type { CptPayload } from './cpt/types'
import { VARIANT, OTHER_CENTER_ID } from '../content'

type Values = Record<string, unknown>

// Responses are immutable by design (RLS allows INSERT + SELECT only, no
// UPDATE/DELETE). So each save is insert-once: if the section already has rows,
// going back and re-submitting is a no-op (the first answers stand) instead of
// a duplicate-key error.

async function alreadySaved(
  table: 'academic_data' | 'personal_habits',
  uid: string,
): Promise<boolean> {
  const { data } = await supabase.from(table).select('fk_participant').eq('fk_participant', uid).maybeSingle()
  return !!data
}

export async function saveScale(
  uid: string,
  instrument: 'MAAS' | 'PPS',
  values: number[],
): Promise<void> {
  const { data: existing } = await supabase
    .from('scale_response')
    .select('n_item')
    .eq('fk_participant', uid)
    .eq('instrument', instrument)
    .limit(1)
  if (existing && existing.length > 0) return

  const rows = values.map((value, i) => ({ fk_participant: uid, instrument, n_item: i + 1, value }))
  const { error } = await supabase.from('scale_response').insert(rows)
  if (error) throw error
}

async function saveBridge(
  uid: string,
  table: 'content_preference' | 'ai_purpose_pref' | 'ai_tool_use',
  fkColumn: string,
  ids: unknown,
): Promise<void> {
  if (!Array.isArray(ids) || ids.length === 0) return
  const rows = (ids as number[]).map((id) => ({ fk_participant: uid, [fkColumn]: id }))
  const { error } = await supabase.from(table).insert(rows)
  if (error) throw error
}

export async function saveHabits(uid: string, values: Values): Promise<void> {
  if (await alreadySaved('personal_habits', uid)) return

  const { content_formats, ai_purposes, ai_tools, ...columns } = values
  const { error } = await supabase.from('personal_habits').insert({ fk_participant: uid, ...columns })
  if (error) throw error

  await saveBridge(uid, 'content_preference', 'fk_format', content_formats)
  await saveBridge(uid, 'ai_purpose_pref', 'fk_purpose', ai_purposes)
  await saveBridge(uid, 'ai_tool_use', 'fk_tool', ai_tools)
}

export async function saveAcademic(uid: string, values: Values): Promise<void> {
  if (await alreadySaved('academic_data', uid)) return

  const { error } = await supabase.from('academic_data').insert({ fk_participant: uid, ...values })
  if (error) throw error
}

export async function saveCpt(uid: string, payload: CptPayload): Promise<void> {
  const { data: existing } = await supabase
    .from('cpt_session')
    .select('fk_participant')
    .eq('fk_participant', uid)
    .maybeSingle()
  if (existing) return

  const { error } = await supabase.rpc('save_cpt', { data: payload })
  // The RPC raises P0001 ("session already recorded") on a race; treat as done.
  if (error && error.code !== 'P0001') throw error
}

export async function markCompleted(uid: string): Promise<void> {
  const { error } = await supabase.from('participant').update({ status: 'completed' }).eq('id_participant', uid)
  if (error) throw error
}

async function ensureAnonUid(): Promise<string> {
  const { data: existing } = await supabase.auth.getSession()
  const uid = existing.session?.user.id
  if (uid) return uid
  const { data, error } = await supabase.auth.signInAnonymously()
  if (error || !data.user) throw error ?? new Error('Anonymous user was not created')
  return data.user.id
}

export async function startParticipant(): Promise<string> {
  const uid = await ensureAnonUid()
  const { data } = await supabase
    .from('participant')
    .select('id_participant')
    .eq('id_participant', uid)
    .maybeSingle()
  if (data) return uid

  const { error } = await supabase.from('participant').insert({
    consent_accepted: true,
    status: 'in_progress',
    screen_width: window.screen.width,
    screen_height: window.screen.height,
    browser: navigator.userAgent,
    // Variant B is tagged in origin (no extra column): "b" or "b:<origin>".
    origin: VARIANT === 'b' ? ['b', readOrigin()].filter(Boolean).join(':').slice(0, 64) : readOrigin(),
    device_fingerprint: getFingerprintLocal(),
  })
  if (error) throw error
  return uid
}

async function saveMeta(uid: string, answers: LocalAnswers): Promise<void> {
  const { data } = await supabase
    .from('meta_data')
    .select('fk_participant')
    .eq('fk_participant', uid)
    .maybeSingle()
  if (data) return

  const wantsResults = answers.contact.wants_results === true
  const email = wantsResults ? (answers.contact.email ?? '').trim().toLowerCase() || null : null

  const { error } = await supabase.from('meta_data').insert({
    fk_participant: uid,
    welcome_emoji: answers.emoji.welcome_emoji ?? null,
    emoji_answer: answers.emoji.emoji_answer ?? null,
    wants_results: wantsResults,
    email,
  })
  if (error) throw error
}

// Single batch save at the very end of the flow — the ONLY DB write. Everything
// else is kept in localStorage until here. Idempotent: reuses the existing anon
// session and every step guards on insert-once, so a retry after a partial
// failure completes without duplicating rows.
// ponytail: sequential idempotent inserts; move to a transactional RPC
// submit_survey(jsonb) if strict atomicity is ever required.
export async function finalizeSubmission(answers: LocalAnswers): Promise<void> {
  const uid = await startParticipant()

  if (answers.cpt) await saveCpt(uid, answers.cpt)
  const { fk_physical_activity, ...academic } = answers.intake
  await saveAcademic(uid, VARIANT === 'b' ? { ...academic, fk_center: OTHER_CENTER_ID } : academic)
  await saveScale(uid, 'MAAS', answers.maas)
  await saveScale(uid, 'PPS', answers.pps)
  await saveHabits(uid, { fk_physical_activity, ...answers.digital, ...answers.ai })
  await saveMeta(uid, answers)
  await markCompleted(uid)
}
