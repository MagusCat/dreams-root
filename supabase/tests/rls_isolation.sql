-- F1 · Definition of done: two anonymous users isolated from each other.
-- Verifies neither reads nor writes the other's data, that the CPT only enters
-- through the RPC, and that participant only allows updating the status column.
--
-- Requires a Supabase-provisioned database (auth schema, anon/authenticated roles,
-- auth.uid() function). Run:
--   psql "$DATABASE_URL" -f supabase/tests/rls_isolation.sql
-- Everything runs in a transaction that ROLLS BACK: it leaves no data.

\set ON_ERROR_STOP on
begin;

-- Two identities are simulated by swapping the JWT 'sub' claim.
\set uid_a '11111111-1111-1111-1111-111111111111'
\set uid_b '22222222-2222-2222-2222-222222222222'

set local role authenticated;

-- ── User A: creates participant, a scale response, and their CPT session via RPC ──
select set_config('request.jwt.claims',
  json_build_object('sub', :'uid_a', 'role', 'authenticated')::text, true);

insert into participant (consent_accepted) values (true);  -- id = auth.uid() by default

insert into scale_response (fk_participant, instrument, n_item, value)
  values ((select auth.uid()), 'MAAS', 1, 4);

select public.save_cpt(jsonb_build_object(
  'parameters', jsonb_build_object('version','test','total_trials', 2, 'seed', 42),
  'started_at', '2026-09-24T12:00:00Z',
  'finished_at', '2026-09-24T12:10:00Z',
  'focus_losses', 0, 'fullscreen_exits', 0,
  'practice_attempts', 1, 'practice_hits_pct', 90,
  'trials', jsonb_build_array(
    jsonb_build_object('n_trial',1,'block',0,'is_practice',true,'letter','X',
      'planned_onset_ms',0,'actual_onset_ms',1.2,'rt_ms',350),
    jsonb_build_object('n_trial',2,'block',0,'is_practice',true,'letter','A',
      'planned_onset_ms',920,'actual_onset_ms',921.1,'rt_ms',null)
  )
));

do $$ begin
  assert (select count(*) from participant)    = 1, 'A should see their participant';
  assert (select count(*) from scale_response) = 1, 'A should see their scale_response';
  assert (select count(*) from cpt_session)    = 1, 'A should see their cpt_session';
  assert (select count(*) from cpt_trial)      = 2, 'A should see their 2 trials';
end $$;

-- A cannot insert directly into cpt_session (only the RPC can): privilege revoked.
do $$ begin
  begin
    insert into cpt_session (fk_participant, parameters, started_at, finished_at,
      focus_losses, fullscreen_exits, practice_attempts, practice_hits_pct)
      values ((select auth.uid()), '{}'::jsonb, now(), now() + interval '1 min', 0, 0, 1, 90);
    raise exception 'FAIL: A inserted directly into cpt_session';
  exception when insufficient_privilege then null;
  end;
end $$;

-- ── User B: sees none of A's data ──
select set_config('request.jwt.claims',
  json_build_object('sub', :'uid_b', 'role', 'authenticated')::text, true);

do $$ begin
  assert (select count(*) from participant)    = 0, 'B must NOT see A''s participant';
  assert (select count(*) from scale_response) = 0, 'B must NOT see A''s scale_response';
  assert (select count(*) from cpt_session)    = 0, 'B must NOT see A''s session';
  assert (select count(*) from cpt_trial)      = 0, 'B must NOT see A''s trials';
end $$;

-- B cannot write on A's behalf (with check).
do $$ begin
  begin
    insert into scale_response (fk_participant, instrument, n_item, value)
      values ('11111111-1111-1111-1111-111111111111'::uuid, 'MAAS', 2, 5);
    raise exception 'FAIL: B inserted with A''s fk';
  exception when insufficient_privilege then null;
  end;
end $$;

-- ── Back to A: can only update the status column ──
select set_config('request.jwt.claims',
  json_build_object('sub', :'uid_a', 'role', 'authenticated')::text, true);

update participant set status = 'completed' where id_participant = (select auth.uid());
do $$ begin
  assert (select status from participant) = 'completed', 'A should be able to set status=completed';
end $$;

do $$ begin
  begin
    update participant set browser = 'hacked'
      where id_participant = (select auth.uid());
    raise exception 'FAIL: A updated a forbidden column';
  exception when insufficient_privilege then null;
  end;
end $$;

rollback;

\echo 'OK — RLS & RPC: participant isolation verified.'
