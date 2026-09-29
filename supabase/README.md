# Database

Stores the study answers **anonymously**: each participant signs in as an anonymous
user and can only read and write their own rows (RLS). Identifiers in English.

What it stores: academic data, digital and study habits, AI use, the MAAS and PPS
scales (item by item) and the attention test (CPT). Catalogs (majors, devices,
formats, AI tools, etc.) are loaded from `seed.sql`.

## Apply

**Local (Docker):**

```bash
supabase start
supabase db reset        # recreates the database and loads the seed
```

**Remote (Supabase Cloud):**

```bash
supabase link --project-ref <YOUR_PROJECT_REF>
supabase db push                             # applies migrations
psql "$DATABASE_URL" -f supabase/seed.sql    # loads catalogs (db push doesn't)
```

> Rebuild everything on the remote from scratch: `supabase db reset --linked` (⚠️ wipes data).

## Views (team only)

- `v_analysis_dataset` — one row per **completed** participant (wide format, for analysis).
- `v_responses_long` — one row per individual **answer**, for all participants
  (catalog answers resolved to names; scale items appear with their 1–N value).
- `v_progress` — one row per participant to **track progress** of each survey
  (sections done, MAAS/PPS items, `sections_done`, `pct_complete`).
- `v_survey_stats` — one row of **totals** by status (`total`, `completed`,
  `incomplete`, `excluded`, `pct_completed`, first/last date).

## Pending

- **Major → area**: some assignments are debatable; review `fk_area` in `seed.sql`.
- **MAAS/PPS scoring**: `v_analysis_dataset` exposes raw sum/mean; apply each manual's
  scoring key in the analysis (see `docs/instruments.md`).
- **Device fingerprint**: a soft anti-duplicate signal (not an identity); it is in the
  consent form and needs ethics approval before collecting.
