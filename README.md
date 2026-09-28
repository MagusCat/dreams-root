# Attention & Digital Habits

A university research study on how digital habits relate to sustained attention in
students. Participants complete one anonymous online session: they read a consent
form, take a short attention test, and answer a few questionnaires. The goal is to
collect clean, comparable data the team can later analyze.

**One sitting, in this order:**
welcome → consent → about you → mindfulness (MAAS) → procrastination (PPS) →
digital habits → AI use → attention test (CPT) → recall → contact → thank you.

Answers are anonymous. Nothing is saved until the very end, when everything is
submitted at once.

## Sources

- **MAAS** (mindfulness) — Spanish validation: Soler et al., 2012 —
  [paper](https://link.springer.com/article/10.1186/1477-7525-11-6) ·
  [undergraduate sample](https://www.sciencedirect.com/science/article/pii/S0121438116000060)
- **PPS** (procrastination) — Spanish validation: Guilera et al., 2024 —
  [paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC10828008/) ·
  original: Steel, 2010 — [measure](https://procrastinus.com/piers-steel/about-the-measure/)

## Run it

```bash
npm install
cp .env.example .env     # add your Supabase URL and anon key
npm run dev              # http://localhost:5173
```

The Supabase project needs its migrations + seed applied and **anonymous sign-ins
enabled**. See [`supabase/README.md`](supabase/README.md).

## More

- The instruments and their validity: [`docs/instruments.md`](docs/instruments.md).
- All participant-facing text lives in `src/content/flow.json` (edit it there).
