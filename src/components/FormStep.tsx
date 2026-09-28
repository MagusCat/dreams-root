import { useEffect, useState } from 'react'
import Layout from './Layout'
import { Button } from './Button'
import { Field, isFieldValid, isVisible, type FieldValue, type Values } from './Field'
import { useLocalState } from '../hooks/useLocalState'
import type { FormStepContent } from '../content/schema'
import type { Step } from '../app/steps'

export default function FormStep({
  content,
  step,
  onSubmit,
  onBack,
}: {
  content: FormStepContent
  step: Step
  onSubmit: (values: Record<string, unknown>) => Promise<void>
  onBack?: () => void
}) {
  // Draft is kept after submit so the "back" button restores prior answers.
  const [values, setValues] = useLocalState<Values>(`dreams:draft:${step}`, {})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (key: string, v: FieldValue) => setValues((prev) => ({ ...prev, [key]: v }))

  const visibleFields = content.fields.filter((f) => isVisible(f, values))
  const valid = visibleFields.every((f) => isFieldValid(f, values[f.key]))

  // Drop answers of fields that became hidden, so stale values aren't submitted.
  useEffect(() => {
    const stale = content.fields.filter(
      (f) => !isVisible(f, values) && values[f.key] !== undefined && values[f.key] !== '',
    )
    if (stale.length) {
      setValues((prev) => {
        const next = { ...prev }
        stale.forEach((f) => delete next[f.key])
        return next
      })
    }
  }, [content.fields, values, setValues])

  async function submit() {
    setSaving(true)
    setError(null)
    try {
      await onSubmit(values as Record<string, unknown>)
    } catch (e) {
      console.error(e)
      setError('No se pudieron guardar tus respuestas. Inténtalo de nuevo.')
      setSaving(false)
    }
  }

  return (
    <Layout
      step={step}
      onBack={onBack}
      footer={
        <Button disabled={!valid || saving} onClick={submit}>
          {saving ? 'Guardando…' : content.cta}
        </Button>
      }
    >
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {content.title}
        </h1>
        {content.intro && (
          <p className="text-sm font-normal text-slate-600 leading-relaxed">
            {content.intro}
          </p>
        )}
      </div>

      <div className="stagger-in mt-6 space-y-4">
        {visibleFields.map((f) => (
          <Field key={f.key} def={f} value={values[f.key]} onChange={(v) => set(f.key, v)} />
        ))}
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-600">
          {error}
        </div>
      )}
    </Layout>
  )
}

