-- RLS on every table. A participant inserts and reads only their own rows;
-- no UPDATE/DELETE (except participant.status). Catalogs are SELECT-only.
-- CPT rows are inserted only through the save_cpt RPC (migration 3).

-- Catalogs: SELECT for everyone.
do $$
declare t text;
begin
  foreach t in array array[
    'knowledge_area','major','university_center','study_modality',
    'content_format','device','physical_activity'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy %I on %I for select to anon, authenticated using (true)',
      t || '_select', t);
  end loop;
end $$;

-- participant
alter table participant enable row level security;

create policy participant_insert on participant
  for insert to authenticated
  with check (id_participant = (select auth.uid()));

create policy participant_select on participant
  for select to authenticated
  using (id_participant = (select auth.uid()));

-- Only the status column may be updated (RLS can't filter by column).
revoke update on participant from anon, authenticated;
grant  update (status) on participant to authenticated;

create policy participant_update_status on participant
  for update to authenticated
  using      (id_participant = (select auth.uid()))
  with check (id_participant = (select auth.uid()));

-- Answer / bridge tables: INSERT + SELECT own only.
do $$
declare t text;
begin
  foreach t in array array[
    'personal_habits','content_preference','scale_response','academic_data','meta_data'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy %I on %I for insert to authenticated
         with check (fk_participant = (select auth.uid()))',
      t || '_insert', t);
    execute format(
      'create policy %I on %I for select to authenticated
         using (fk_participant = (select auth.uid()))',
      t || '_select', t);
  end loop;
end $$;

-- CPT: read-only for the participant; INSERT is done by the save_cpt RPC.
alter table cpt_session enable row level security;
revoke insert, update, delete on cpt_session from anon, authenticated;

create policy cpt_session_select on cpt_session
  for select to authenticated
  using (fk_participant = (select auth.uid()));

alter table cpt_trial enable row level security;
revoke insert, update, delete on cpt_trial from anon, authenticated;

create policy cpt_trial_select on cpt_trial
  for select to authenticated
  using (fk_participant = (select auth.uid()));
