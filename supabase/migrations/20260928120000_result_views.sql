-- Team-only views (service_role): full answers per response + survey progress.
-- Human question text and scale labels live in flow.json, not the DB, so these
-- expose column keys, raw scale values, and catalog names.

-- v_responses_long: one row per individual answer, all participants.
-- Scalar columns are unpivoted with jsonb_each_text; catalog FKs and multi-answer
-- bridges are resolved to their names.
create view v_responses_long
with (security_invoker = true) as
  select p.id_participant, p.status, 'academic'::text as section,
         kv.key as question, kv.value as answer
    from participant p
    join academic_data ad on ad.fk_participant = p.id_participant
    cross join lateral jsonb_each_text(
      to_jsonb(ad) - 'fk_participant' - 'fk_center' - 'fk_major' - 'fk_modality') kv
  union all
  select p.id_participant, p.status, 'academic', 'university_center', uc.name
    from participant p
    join academic_data ad on ad.fk_participant = p.id_participant
    join university_center uc on uc.id_center = ad.fk_center
  union all
  select p.id_participant, p.status, 'academic', 'major', mj.name
    from participant p
    join academic_data ad on ad.fk_participant = p.id_participant
    join major mj on mj.id_major = ad.fk_major
  union all
  select p.id_participant, p.status, 'academic', 'study_modality', sm.name
    from participant p
    join academic_data ad on ad.fk_participant = p.id_participant
    join study_modality sm on sm.id_modality = ad.fk_modality
  union all
  select p.id_participant, p.status, 'habits',
         kv.key, kv.value
    from participant p
    join personal_habits ph on ph.fk_participant = p.id_participant
    cross join lateral jsonb_each_text(
      to_jsonb(ph) - 'fk_participant' - 'fk_main_device' - 'fk_physical_activity') kv
  union all
  select p.id_participant, p.status, 'habits', 'main_device', dev.name
    from participant p
    join personal_habits ph on ph.fk_participant = p.id_participant
    join device dev on dev.id_device = ph.fk_main_device
  union all
  select p.id_participant, p.status, 'habits', 'physical_activity', pa.name
    from participant p
    join personal_habits ph on ph.fk_participant = p.id_participant
    join physical_activity pa on pa.id_activity = ph.fk_physical_activity
  union all
  select cp.fk_participant, p.status, 'content_format', 'content_format', cf.name
    from content_preference cp
    join participant p on p.id_participant = cp.fk_participant
    join content_format cf on cf.id_format = cp.fk_format
  union all
  select app.fk_participant, p.status, 'ai_purpose', 'ai_purpose', ap.name
    from ai_purpose_pref app
    join participant p on p.id_participant = app.fk_participant
    join ai_purpose ap on ap.id_purpose = app.fk_purpose
  union all
  select atu.fk_participant, p.status, 'ai_tool', 'ai_tool', ait.name
    from ai_tool_use atu
    join participant p on p.id_participant = atu.fk_participant
    join ai_tool ait on ait.id_tool = atu.fk_tool
  union all
  select sr.fk_participant, p.status, sr.instrument::text,
         'item_' || lpad(sr.n_item::text, 2, '0'), sr.value::text
    from scale_response sr
    join participant p on p.id_participant = sr.fk_participant
  union all
  select p.id_participant, p.status, 'meta', kv.key, kv.value
    from participant p
    join meta_data md on md.fk_participant = p.id_participant
    cross join lateral jsonb_each_text(to_jsonb(md) - 'fk_participant') kv;

revoke all on v_responses_long from anon, authenticated;

-- v_progress: one row per participant, to track how far each survey got.
-- A section counts as done when its row(s) exist; scales need all their items.
create view v_progress
with (security_invoker = true) as
select
  p.id_participant,
  p.status,
  p.created_at,
  p.origin,
  (ad.fk_participant is not null) as has_academic,
  (ph.fk_participant is not null) as has_habits,
  coalesce(maas.n, 0) as maas_items,
  coalesce(pps.n, 0)  as pps_items,
  (cs.fk_participant is not null) as has_cpt,
  (md.fk_participant is not null) as has_meta,
  (
    (ad.fk_participant is not null)::int
    + (ph.fk_participant is not null)::int
    + (coalesce(maas.n, 0) = 15)::int
    + (coalesce(pps.n, 0) = 12)::int
    + (cs.fk_participant is not null)::int
    + (md.fk_participant is not null)::int
  ) as sections_done,
  round(100.0 * (
    (ad.fk_participant is not null)::int
    + (ph.fk_participant is not null)::int
    + (coalesce(maas.n, 0) = 15)::int
    + (coalesce(pps.n, 0) = 12)::int
    + (cs.fk_participant is not null)::int
    + (md.fk_participant is not null)::int
  ) / 6.0) as pct_complete
from participant p
left join academic_data   ad on ad.fk_participant = p.id_participant
left join personal_habits ph on ph.fk_participant = p.id_participant
left join cpt_session     cs on cs.fk_participant = p.id_participant
left join meta_data       md on md.fk_participant = p.id_participant
left join (select fk_participant, count(*) n from scale_response where instrument = 'MAAS' group by fk_participant) maas
  on maas.fk_participant = p.id_participant
left join (select fk_participant, count(*) n from scale_response where instrument = 'PPS' group by fk_participant) pps
  on pps.fk_participant = p.id_participant;

revoke all on v_progress from anon, authenticated;
