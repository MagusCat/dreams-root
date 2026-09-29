-- v_survey_stats: one row with survey totals by status (team only).
create view v_survey_stats
with (security_invoker = true) as
select
  count(*)                                         as total,
  count(*) filter (where status = 'completed')     as completed,
  count(*) filter (where status = 'in_progress')   as incomplete,
  count(*) filter (where status = 'excluded')      as excluded,
  round(100.0 * count(*) filter (where status = 'completed') / nullif(count(*), 0), 1) as pct_completed,
  min(created_at)                                  as first_at,
  max(created_at)                                  as last_at
from participant;

revoke all on v_survey_stats from anon, authenticated;
