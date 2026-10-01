# Instruments

The three measures in this study, what they capture, how they are implemented
here, the evidence for their validity, and how to strengthen each. Item wording
lives in `src/content/flow.json`; the DB shape is in `supabase/`.

---

## MAAS — Mindful Attention Awareness Scale

**Measures:** trait mindfulness — how often a person is attentive to and aware of
the present moment (higher score = more mindful).

**In this app:** 15 items, 6-point scale (1 = *casi siempre* … 6 = *casi nunca*).
Items describe *mindless* everyday lapses, so a higher rating (closer to "almost
never") means more mindfulness. The team's manual should confirm scoring; the
analysis view exposes raw sum/mean without reversing (`v_analysis_dataset`).

**Validity:** well established. The Spanish version (Soler et al., 2012) reports
Cronbach's α ≈ .89 and a single-factor structure that fits confirmatory models
across Spanish-speaking samples. The 6-point anchors used here match that version.

**How to improve:**
- Keep the validated Spanish wording verbatim — do not paraphrase items.
- Report α (and ideally McDonald's ω) for *this* sample; the long-format
  `scale_response` table already stores per-item data for it.
- Consider one attention-check item, but note it can slightly alter scoring.
- Watch for a ceiling/acquiescence bias; the reverse-keyed framing already helps.

---

## PPS — Pure Procrastination Scale

**Measures:** irrational, chronic delay of tasks and decisions.

**In this app:** 12 items, 5-point self-description scale
(1 = *no me describe en absoluto* … 5 = *me describe totalmente*), using the
verbatim wording and anchors of the Spanish validation (Guilera et al., 2024,
Table A1). Aligned as of 2026-09-27.

**Validity:** the Spanish validation (Guilera et al., 2024; N = 596 adults, 18–83)
kept all **12 items** of Steel's (2010) PPS and found a **three-factor** structure
with satisfactory internal consistency, temporal stability, and scalar gender
invariance. The three factors:
- **Decisional delay** — items 1–3.
- **Implemental delay** — items 4–8.
- **Timeliness / lateness** — items 9–12.

The DB `CHECK` on `scale_response` (PPS `n_item` 1–12, `value` 1–5) already matches
this, so no migration is needed.

**How to improve:**
- Score the **three subscales** (per the factor grouping above), not just a single
  total; the long-format `scale_response` table already stores per-item data for it.
- Report α/ω per factor for *this* sample.
- Keep the validated wording verbatim — do not paraphrase items or change anchors.

---

## CPT — Continuous Performance Test (X-CPT)

**Measures:** sustained attention / vigilance. Letters appear one at a time; the
participant responds only to the target ("X"). Standard metrics: omission errors
(missed targets), commission errors (responses to non-targets), reaction time and
its variability, and the vigilance decrement (performance drop over time).

**In this app:** custom X-CPT v1.2 (`src/lib/cpt/`), driven by a DOM-only engine
(no React render during the test) on an absolute calendar: trial `i` starts at
`t0 + i × (exposureMs + blankMs)` and is checked every `rAF` frame, so lateness
never accumulates. A random per-session seed (`crypto.getRandomValues`, stored in
`cpt_session.parameters.seed`) feeds `mulberry32`; each block has exactly
`targetsPerBlock` X at shuffled positions (Fisher-Yates), non-targets are A–Z
minus X with replacement. Practice (`practiceBlocks`, up to
`maxPracticeAttempts`, with feedback) precedes the test; the input used for the
first practice response is locked for the test. Each trial stores planned vs
actual onset and offset, its classification (hit / omission / commission /
correct_rejection / anticipation / late / not_presented) and every raw response
time, so it can be re-scored with another window. Interruptions (hidden tab,
blur, fullscreen exit, orientation change) don't stop the test: it resumes on
schedule and missed trials are `not_presented`. A reload mid-test costs one of
`maxTestAttempts`; after the last one the session is saved empty with the
`session_reloaded` flag. Practice blocks are numbered consecutively across
attempts (attempt = `block div practiceBlocks`). Quality: frame-interval median,
% of frames over 2× median, and flags. Parameters live in `flow.json`
(`cpt.params`) and are validated at load. d′, RT/CV and the vigilance decrement
are computed later in Python from `cpt_trial`.

**Validity:** the CPT paradigm is a standard, well-validated measure of sustained
attention. This *specific* implementation is custom and unnormed, so treat it as a
within-study relative measure, not a clinical/normed score. The main threats are
environmental, not conceptual:
- **Uncontrolled setting** — noise, interruptions, multitasking at home.
- **Device/timing variability** — screen refresh, input latency, and `rAF`
  scheduling differ per device; the recorded onset drift helps quantify this.
- **Input modality** — keyboard (spacebar) vs touch have different latencies.

**How to improve:**
- Keep the drift log and **exclude or flag** trials/sessions with large drift or
  many focus losses in analysis.
- Report RT split by input modality (keyboard vs touch) and control for it.
- Verify total duration and target ratio against a reference protocol; longer
  runs measure the vigilance decrement better but raise dropout.
- Calibrate/measure input latency where possible (physical world drifts — the
  engine's onset log is the calibration knob; use it).
- Pre-register the exclusion rules and the exact metrics before collecting data.

---

## Sources

- MAAS (Spanish): Soler et al., 2012 — [psychometric properties](https://link.springer.com/article/10.1186/1477-7525-11-6);
  Colombian undergraduate validation — [Suma Psicológica](https://www.sciencedirect.com/science/article/pii/S0121438116000060).
- PPS (Spanish): Guilera et al., 2024 — [Spanish validation of the Pure Procrastination Scale](https://pmc.ncbi.nlm.nih.gov/articles/PMC10828008/) ([Frontiers](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2023.1268855/full)); original: Steel, 2010 — [about the measure](https://procrastinus.com/piers-steel/about-the-measure/).
