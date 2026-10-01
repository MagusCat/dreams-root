-- CPT v1.2 (cpt-x-1.2). Additive only: every new column is nullable and no
-- existing row is rewritten, so v1.0 sessions stay valid as they are.
-- Device, user agent and screen size are NOT repeated here: they already live in
-- participant (browser, screen_width/height) and personal_habits (fk_main_device).
-- Version and seed go inside cpt_session.parameters (jsonb, full params).

alter table cpt_session
  add column input_mode           text     check (input_mode in ('keyboard', 'touch', 'mouse', 'pen')),
  add column fullscreen_available boolean,
  add column orientation_changes  smallint check (orientation_changes >= 0),
  add column other_mode_responses smallint check (other_mode_responses >= 0),
  add column frame_median_ms      real     check (frame_median_ms >= 0),
  add column long_frame_pct       real     check (long_frame_pct between 0 and 100),
  add column test_attempts        smallint check (test_attempts >= 1),
  add column flags                text[]   check (flags <@ array[
    'interruptions_exceeded', 'low_frame_rate', 'practice_failed', 'session_reloaded'
  ]);

-- actual_onset_ms is null for a trial skipped during an interruption.
-- responses = raw [{t, input}] (t = ms since onset) so trials can be re-scored.
alter table cpt_trial
  alter column actual_onset_ms drop not null,
  add column actual_offset_ms double precision,
  add column classification   text check (classification in (
    'hit', 'omission', 'commission', 'correct_rejection', 'anticipation', 'late', 'not_presented'
  )),
  add column responses        jsonb check (jsonb_typeof(responses) = 'array');

-- Same signature; new keys are optional, so the v1.0 payload still works.
-- 0 trials is accepted only for a session flagged session_reloaded.
create or replace function public.save_cpt(data jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid      uuid   := auth.uid();
  v_total    int    := (data -> 'parameters' ->> 'total_trials')::int;
  v_received int    := jsonb_array_length(data -> 'trials');
  v_flags    text[] := case when jsonb_typeof(data -> 'flags') = 'array'
                          then array(select jsonb_array_elements_text(data -> 'flags')) end;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if not exists (select 1 from public.participant where id_participant = v_uid) then
    raise exception 'participant does not exist' using errcode = 'P0002';
  end if;

  if exists (select 1 from public.cpt_session where fk_participant = v_uid) then
    raise exception 'session already recorded' using errcode = 'P0001';
  end if;

  if v_total is null or v_total < 0
     or (v_total = 0 and not coalesce('session_reloaded' = any (v_flags), false)) then
    raise exception 'parameters.total_trials missing or invalid' using errcode = '22023';
  end if;

  if v_received <> v_total then
    raise exception 'incomplete batch: % trials received, % expected', v_received, v_total
      using errcode = '22023';
  end if;

  insert into public.cpt_session (
    fk_participant, parameters, started_at, finished_at,
    focus_losses, fullscreen_exits, practice_attempts, practice_hits_pct,
    input_mode, fullscreen_available, orientation_changes, other_mode_responses,
    frame_median_ms, long_frame_pct, test_attempts, flags
  ) values (
    v_uid,
    data -> 'parameters',
    (data ->> 'started_at')::timestamptz,
    (data ->> 'finished_at')::timestamptz,
    (data ->> 'focus_losses')::smallint,
    (data ->> 'fullscreen_exits')::smallint,
    (data ->> 'practice_attempts')::smallint,
    (data ->> 'practice_hits_pct')::numeric,
    data ->> 'input_mode',
    (data ->> 'fullscreen_available')::boolean,
    (data ->> 'orientation_changes')::smallint,
    (data ->> 'other_mode_responses')::smallint,
    (data ->> 'frame_median_ms')::real,
    (data ->> 'long_frame_pct')::real,
    (data ->> 'test_attempts')::smallint,
    v_flags
  );

  insert into public.cpt_trial (
    fk_participant, n_trial, block, is_practice, letter,
    planned_onset_ms, actual_onset_ms, rt_ms,
    actual_offset_ms, classification, responses
  )
  select
    v_uid, t.n_trial, t.block, t.is_practice, t.letter,
    t.planned_onset_ms, t.actual_onset_ms, t.rt_ms,
    t.actual_offset_ms, t.classification, t.responses
  from jsonb_to_recordset(data -> 'trials') as t(
    n_trial int, block smallint, is_practice boolean, letter text,
    planned_onset_ms double precision, actual_onset_ms double precision,
    rt_ms double precision, actual_offset_ms double precision,
    classification text, responses jsonb
  );
end $$;

revoke execute on function public.save_cpt(jsonb) from public, anon;
grant  execute on function public.save_cpt(jsonb) to authenticated;
