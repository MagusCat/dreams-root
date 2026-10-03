import raw from './flow.json'
import { flowSchema, type Flow } from './schema'

// Validate flow.json at load so a malformed edit fails loudly, not on screen.
export const flow: Flow = flowSchema.parse(raw)

// Build-time variant (one deploy per version), so there's no URL param to tamper with.
export const VARIANT = import.meta.env.VITE_VARIANT === 'b' ? 'b' : 'a'

// university_center "Otra" — variant B saves it instead of asking.
export const OTHER_CENTER_ID = 2

if (VARIANT === 'b') {
  flow.welcome.context =
    'Este es un estudio universitario. Aplicamos técnicas de minería y análisis de datos para responder preguntas actuales sobre atención y hábitos digitales en estudiantes.'
  const intake = flow.questionnaires.intake
  intake.fields = intake.fields.filter((f) => f.key !== 'fk_center')
  for (const f of intake.fields) if (f.type === 'catalog' && f.key === 'fk_major') delete f.exclude
}
