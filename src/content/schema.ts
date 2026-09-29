import { z } from 'zod'

export const CATALOG_NAMES = [
  'major',
  'university_center',
  'study_modality',
  'content_format',
  'device',
  'physical_activity',
  'ai_purpose',
  'ai_tool',
] as const
export type CatalogName = (typeof CATALOG_NAMES)[number]

// Field `key` = DB column name (except multi catalogs). `optional` never blocks.
const optionSchema = z.object({
  value: z.union([z.number(), z.string()]),
  label: z.string(),
})
const common = {
  key: z.string(),
  label: z.string(),
  hint: z.string().optional(),
  optional: z.boolean().optional(),
  showIf: z.object({ key: z.string(), equals: z.union([z.string(), z.number()]) }).optional(),
}

const numberField = z.object({
  type: z.literal('number'),
  ...common,
  min: z.number(),
  max: z.number(),
  integer: z.boolean().optional(),
  altScale: z.object({ min: z.number(), max: z.number(), label: z.string() }).optional(),
})

const singleField = z.object({
  type: z.literal('single'),
  ...common,
  options: z.array(optionSchema).min(2),
})

const multiField = z.object({
  type: z.literal('multi'),
  ...common,
  options: z.array(optionSchema).min(2),
  min: z.number().optional(),
})

const catalogField = z.object({
  type: z.literal('catalog'),
  ...common,
  catalog: z.enum(CATALOG_NAMES),
  multiple: z.boolean().optional(),
})

const conditionalField = z.object({
  type: z.literal('conditional'),
  ...common,
  hoursLabel: z.string(),
  max: z.number(),
})

export const fieldSchema = z.discriminatedUnion('type', [
  numberField,
  singleField,
  multiField,
  catalogField,
  conditionalField,
])
export type Field = z.infer<typeof fieldSchema>

const formStep = z.object({
  title: z.string(),
  intro: z.string().optional(),
  fields: z.array(fieldSchema).min(1),
  cta: z.string(),
})
export type FormStepContent = z.infer<typeof formStep>

const scaleStep = z.object({
  title: z.string(),
  intro: z.string().optional(),
  purpose: z.string(),
  instructions: z.array(z.string()).min(1),
  instrument: z.enum(['MAAS', 'PPS']),
  scale: z.object({
    min: z.number(),
    max: z.number(),
    labels: z.array(z.string()).min(2),
  }),
  items: z.array(z.string()).min(1),
  cta: z.string(),
})
export type ScaleStepContent = z.infer<typeof scaleStep>

export const flowSchema = z.object({
  welcome: z.object({
    title: z.string(),
    intro: z.string(),
    image: z.string().optional(),
    context: z.string(),
    objectives: z.array(z.string()).min(1),
    instructions: z.array(z.string()).min(1),
    cta: z.string(),
  }),
  consent: z.object({
    title: z.string(),
    version: z.string(),
    paragraphs: z.array(z.object({ label: z.string(), text: z.string() })).min(1),
    checkbox: z.string(),
    cta: z.string(),
  }),
  closing: z.object({ title: z.string(), text: z.string() }),
  cpt: z.object({
    title: z.string(),
    intro: z.string(),
    instructions: z.array(z.string()).min(1),
    warning: z.string(),
    responseHint: z.string(),
    getReady: z.string(),
    practiceLabel: z.string(),
    startCta: z.string(),
    doneTitle: z.string(),
    doneText: z.string(),
    doneCta: z.string(),
    params: z.object({
      version: z.string(),
      seed: z.number().int(),
      targetLetter: z.string().length(1),
      targetRatio: z.number().min(0).max(1),
      exposureMs: z.number().int().positive(),
      isiMs: z.number().int().positive(),
      windowMs: z.number().int().positive(),
      nBlocks: z.number().int().positive(),
      trialsPerBlock: z.number().int().positive(),
      practiceTrials: z.number().int().positive(),
      passPct: z.number().min(0).max(100),
      maxFalseAlarmPct: z.number().min(0).max(100),
      jitterMs: z.number().min(0),
    }),
  }),
  alreadyDone: z.object({ title: z.string(), text: z.string() }),
  recall: z.object({ title: z.string(), intro: z.string(), cta: z.string() }),
  contact: z.object({
    title: z.string(),
    intro: z.string(),
    checkbox: z.string(),
    emailLabel: z.string(),
    emailPlaceholder: z.string(),
    note: z.string(),
    cta: z.string(),
    skipCta: z.string(),
  }),
  questionnaires: z.object({
    intake: formStep,
    maas: scaleStep,
    pps: scaleStep,
    digital: formStep,
    ai: formStep,
  }),
})
export type Flow = z.infer<typeof flowSchema>
