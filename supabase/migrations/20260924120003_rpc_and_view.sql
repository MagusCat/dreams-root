-- save_cpt RPC + analysis view.

-- Inserts the CPT session and all its trials in one atomic transaction.
-- SECURITY DEFINER with a fixed search_path; checks auth.uid() inside and
-- validates the batch is complete. Input shape is documented in supabase/README.md.
create function public.save_cpt(data jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid      uuid := auth.uid();
  v_total    int  := (data -> 'parameters' ->> 'total_trials')::int;
  v_received int  := jsonb_array_length(data -> 'trials');
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

  if v_total is null or v_total <= 0 then
    raise exception 'parameters.total_trials missing or invalid' using errcode = '22023';
  end if;

  if v_received <> v_total then
    raise exception 'incomplete batch: % trials received, % expected', v_received, v_total
      using errcode = '22023';
  end if;

  insert into public.cpt_session (
    fk_participant, parameters, started_at, finished_at,
    focus_losses, fullscreen_exits, practice_attempts, practice_hits_pct
  ) values (
    v_uid,
    data -> 'parameters',
    (data ->> 'started_at')::timestamptz,
    (data ->> 'finished_at')::timestamptz,
    (data ->> 'focus_losses')::smallint,
    (data ->> 'fullscreen_exits')::smallint,
    (data ->> 'practice_attempts')::smallint,
    (data ->> 'practice_hits_pct')::numeric
  );

  insert into public.cpt_trial (
    fk_participant, n_trial, block, is_practice, letter,
    planned_onset_ms, actual_onset_ms, rt_ms
  )
  select
    v_uid, t.n_trial, t.block, t.is_practice, t.letter,
    t.planned_onset_ms, t.actual_onset_ms, t.rt_ms
  from jsonb_to_recordset(data -> 'trials') as t(
    n_trial int, block smallint, is_practice boolean, letter text,
    planned_onset_ms double precision, actual_onset_ms double precision,
    rt_ms double precision
  );
end $$;

revoke execute on function public.save_cpt(jsonb) from public, anon;
grant  execute on function public.save_cpt(jsonb) to authenticated;

-- v_analysis_dataset: one row per COMPLETED participant (inner joins exclude
-- anyone missing a section). CPT trial-level metrics are computed in Python.
-- Scales are exposed as raw sum/mean (items NOT reversed) — apply reverse-scoring
-- in analysis per each manual (MAAS: Soler et al. 2012; PPS: Guilera et al. 2024).
create view v_analysis_dataset
with (security_invoker = true) as
select
  p.id_participant,
  p.created_at,

  dev.name as main_device,
  pa.name  as physical_activity,
  ph.hours_short_videos,
  ph.hours_long_videos,
  ph.hours_audio_podcast,
  ph.hours_reading,
  ph.hours_study_daily,
  ph.hours_sleep_avg,
  ph.constant_scroll,
  ph.academic_multitask,
  ph.uses_ai,
  ph.ai_relationship,
  ph.ai_liking,
  md.welcome_emoji,
  md.emoji_answer,
  md.wants_results,
  (ph.hours_short_videos + ph.hours_long_videos + ph.hours_audio_podcast) as hours_multimedia,
  (ph.hours_short_videos + ph.hours_long_videos + ph.hours_audio_podcast)
    / nullif(ph.hours_short_videos + ph.hours_long_videos + ph.hours_audio_podcast + ph.hours_reading, 0)
    as multimedia_ratio,

  (select array_agg(cf.name order by cf.name)
     from content_preference cp
     join content_format cf on cf.id_format = cp.fk_format
    where cp.fk_participant = p.id_participant) as preferred_formats,

  (select sum(value)   from scale_response r where r.fk_participant = p.id_participant and r.instrument = 'MAAS') as maas_sum,
  (select avg(value)   from scale_response r where r.fk_participant = p.id_participant and r.instrument = 'MAAS') as maas_mean,
  (select count(*)     from scale_response r where r.fk_participant = p.id_participant and r.instrument = 'MAAS') as maas_n_items,
  (select sum(value)   from scale_response r where r.fk_participant = p.id_participant and r.instrument = 'PPS')  as pps_sum,
  (select avg(value)   from scale_response r where r.fk_participant = p.id_participant and r.instrument = 'PPS')  as pps_mean,
  (select count(*)     from scale_response r where r.fk_participant = p.id_participant and r.instrument = 'PPS')  as pps_n_items,

  ad.age,
  ad.sex,
  uc.name  as university_center,
  mj.name  as major,
  ka.name  as knowledge_area,
  sm.name  as study_modality,
  ad.academic_year,
  ad.general_average,
  ad.failed_classes_semester,

  cs.parameters as cpt_parameters,
  cs.started_at   as cpt_started_at,
  cs.finished_at  as cpt_finished_at,
  cs.focus_losses,
  cs.fullscreen_exits,
  cs.practice_attempts,
  cs.practice_hits_pct
from participant p
join personal_habits   ph  on ph.fk_participant  = p.id_participant
join academic_data     ad  on ad.fk_participant  = p.id_participant
join meta_data         md  on md.fk_participant  = p.id_participant
join cpt_session       cs  on cs.fk_participant  = p.id_participant
join device            dev on dev.id_device      = ph.fk_main_device
join physical_activity pa  on pa.id_activity     = ph.fk_physical_activity
join university_center  uc on uc.id_center       = ad.fk_center
join major             mj  on mj.id_major        = ad.fk_major
join knowledge_area    ka  on ka.id_area         = mj.fk_area
join study_modality    sm  on sm.id_modality     = ad.fk_modality
where p.status = 'completed';

revoke all on v_analysis_dataset from anon, authenticated;
