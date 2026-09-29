import { flow } from '../content'
import { fetchCatalog } from './supabase/catalogs'
import type { CatalogName, Field, FormStepContent, ScaleStepContent } from '../content/schema'
import type { LocalAnswers } from './localStore'
import type { CptPayload } from './cpt/types'

export type SummaryRow = { label: string; value: string }
export type SummarySection = { title: string; rows: SummaryRow[] }
export type Summary = SummarySection[]

type CatalogMaps = Record<string, Map<number, string>>
type Values = Record<string, unknown>

function formatField(def: Field, value: unknown, catalogs: CatalogMaps): string | null {
  const empty = value === undefined || value === '' || (Array.isArray(value) && value.length === 0)
  if (empty) return null

  switch (def.type) {
    case 'number':
      return String(value)
    case 'single':
      return def.options.find((o) => o.value === value)?.label ?? String(value)
    case 'multi': {
      const arr = Array.isArray(value) ? value : []
      return arr.map((v) => def.options.find((o) => o.value === v)?.label ?? String(v)).join(', ')
    }
    case 'conditional':
      return typeof value === 'number' ? (value === 0 ? 'No' : `${value} h/día`) : String(value)
    case 'catalog': {
      const map = catalogs[def.catalog]
      if (def.multiple) {
        const arr = Array.isArray(value) ? value : []
        return arr.map((id) => map?.get(Number(id)) ?? `#${id}`).join(', ')
      }
      return map?.get(Number(value)) ?? `#${value}`
    }
  }
}

function formSection(title: string, content: FormStepContent, values: Values, catalogs: CatalogMaps): SummarySection {
  const rows: SummaryRow[] = []
  for (const def of content.fields) {
    const v = formatField(def, values[def.key], catalogs)
    if (v != null) rows.push({ label: def.label, value: v })
  }
  return { title, rows }
}

function cptSection(cpt: CptPayload | null): SummarySection {
  const rows: SummaryRow[] = []
  if (cpt) {
    const target = cpt.parameters.target_letter
    const real = cpt.trials.filter((t) => !t.is_practice)
    const targets = real.filter((t) => t.letter === target)
    const hits = targets.filter((t) => t.rt_ms != null)
    const omissions = targets.length - hits.length
    const commissions = real.filter((t) => t.letter !== target && t.rt_ms != null).length
    const meanRt = hits.length
      ? Math.round(hits.reduce((s, t) => s + (t.rt_ms ?? 0), 0) / hits.length)
      : null
    rows.push({ label: `Aciertos (letras «${target}» detectadas)`, value: `${hits.length} de ${targets.length}` })
    rows.push({ label: 'Omisiones (se te pasaron)', value: String(omissions) })
    rows.push({ label: 'Respuestas incorrectas', value: String(commissions) })
    if (meanRt != null) rows.push({ label: 'Tiempo de reacción medio', value: `${meanRt} ms` })
  }
  return { title: 'Prueba de atención (CPT)', rows }
}

function scaleSection(title: string, content: ScaleStepContent, values: number[]): SummarySection {
  return {
    title,
    rows: values.map((v, i) => ({
      label: `Ítem ${i + 1}`,
      value: content.scale.labels[v - content.scale.min] ?? String(v),
    })),
  }
}

export async function buildSummary(a: LocalAnswers): Promise<Summary> {
  const names: CatalogName[] = [
    'university_center', 'major', 'study_modality', 'device', 'physical_activity', 'content_format',
    'ai_purpose', 'ai_tool',
  ]
  const catalogs: CatalogMaps = {}
  await Promise.all(
    names.map(async (n) => {
      try {
        const items = await fetchCatalog(n)
        catalogs[n] = new Map(items.map((it) => [it.id, it.name]))
      } catch {
        catalogs[n] = new Map()
      }
    }),
  )

  const q = flow.questionnaires
  const contactRows: SummaryRow[] = [
    { label: 'Recibir resultados', value: a.contact.wants_results ? 'Sí' : 'No' },
  ]
  if (a.contact.wants_results && a.contact.email) {
    contactRows.push({ label: 'Correo', value: a.contact.email })
  }

  const sections: Summary = [
    formSection('Sobre ti', q.intake, a.intake, catalogs),
    scaleSection('MAAS', q.maas, a.maas),
    scaleSection('PPS', q.pps, a.pps),
    formSection('Consumo digital', q.digital, a.digital, catalogs),
    formSection('Inteligencia artificial', q.ai, a.ai, catalogs),
    cptSection(a.cpt),
    { title: 'Contacto', rows: contactRows },
  ]

  return sections.filter((s) => s.rows.length > 0)
}
