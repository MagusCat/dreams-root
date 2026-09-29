import { useState } from 'react'
import { useCatalog } from '../hooks/useCatalog'
import type { Field as FieldDef } from '../content/schema'
import { Pill } from './Pill'
import Select from './Select'

export type FieldValue = number | string | Array<number | string> | ''
export type Values = Record<string, FieldValue | undefined>

type NumberFieldDef = Extract<FieldDef, { type: 'number' }>
type CatalogFieldDef = Extract<FieldDef, { type: 'catalog' }>
type ConditionalFieldDef = Extract<FieldDef, { type: 'conditional' }>
type Option = { value: number | string; label: string }

export function isFieldValid(def: FieldDef, value: FieldValue | undefined): boolean {
  const empty = value === undefined || value === '' || (Array.isArray(value) && value.length === 0)
  if (def.optional && empty) return true

  switch (def.type) {
    case 'number':
    case 'conditional': {
      if (typeof value !== 'number' || Number.isNaN(value)) return false
      const min = def.type === 'number' ? def.min : 0
      if (def.type === 'number' && def.integer && !Number.isInteger(value)) return false
      return value >= min && value <= def.max
    }
    case 'single':
      return value !== undefined && value !== ''
    case 'catalog':
      return def.multiple ? Array.isArray(value) && value.length > 0 : typeof value === 'number'
    case 'multi':
      return Array.isArray(value) && value.length >= (def.min ?? 1)
  }
}

export function isVisible(def: FieldDef, values: Values): boolean {
  if (!def.showIf) return true
  return values[def.showIf.key] === def.showIf.equals
}

type FieldProps = {
  def: FieldDef
  value: FieldValue | undefined
  onChange: (v: FieldValue) => void
}

export function Field({ def, value, onChange }: FieldProps) {
  return (
    <fieldset className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 transition-all duration-200 ease-out hover:border-violet-200 focus-within:border-violet-300 focus-within:ring-4 focus-within:ring-violet-400/10">
      <legend className="px-1 text-sm font-semibold text-slate-800 flex items-center gap-1.5">
        <span>{def.label}</span>
        {def.optional ? (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-normal text-slate-500">
            opcional
          </span>
        ) : (
          <span className="text-violet-500 text-xs font-bold" title="Requerido">*</span>
        )}
      </legend>
      {def.hint && <p className="mt-1 text-xs text-slate-500 leading-relaxed">{def.hint}</p>}
      <div className="mt-3">
        {def.type === 'number' && <NumberControl def={def} value={value} onChange={onChange} />}
        {def.type === 'single' && (
          <ChoiceControl options={def.options} multiple={false} value={value} onChange={onChange} />
        )}
        {def.type === 'multi' && (
          <ChoiceControl options={def.options} multiple value={value} onChange={onChange} />
        )}
        {def.type === 'catalog' && <CatalogControl def={def} value={value} onChange={onChange} />}
        {def.type === 'conditional' && <ConditionalControl def={def} value={value} onChange={onChange} />}
      </div>
    </fieldset>
  )
}

function NumberInput({
  min,
  max,
  value,
  onChange,
  integer = false,
}: {
  min: number
  max: number
  value: FieldValue | undefined
  onChange: (v: FieldValue) => void
  integer?: boolean
}) {
  const numVal = typeof value === 'number' ? value : ''
  const parse = (raw: string): FieldValue => {
    if (raw === '') return ''
    const n = Number(raw)
    if (Number.isNaN(n)) return ''
    return integer ? Math.trunc(n) : n
  }

  return (
    <div className="relative flex items-center">
      <input
        type="number"
        inputMode={integer ? 'numeric' : 'decimal'}
        step={integer ? 1 : 'any'}
        min={min}
        max={max}
        placeholder={`Ej: ${min}`}
        value={numVal}
        onChange={(e) => onChange(parse(e.target.value))}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-16 text-sm font-medium text-slate-800 outline-none transition-all duration-200 ease-out placeholder:text-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-400/15"
      />
      <div className="pointer-events-none absolute right-3 flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-400">
        <span>{min}–{max}</span>
      </div>
    </div>
  )
}

function NumberControl({ def, value, onChange }: { def: NumberFieldDef } & Omit<FieldProps, 'def'>) {
  const [alt, setAlt] = useState(false)

  if (!def.altScale) {
    return <NumberInput min={def.min} max={def.max} value={value} onChange={onChange} integer={def.integer} />
  }

  // Value is always stored on the primary scale; the alt scale is just a comfier
  // way to type it (e.g. 0–5 → ×20 → 0–100).
  const factor = def.max / def.altScale.max
  const display = alt && typeof value === 'number' ? Number((value / factor).toFixed(2)) : value
  const handle = (v: FieldValue) =>
    onChange(alt ? (v === '' ? '' : Number((Number(v) * factor).toFixed(2))) : v)

  return (
    <div className="space-y-3">
      <div className="flex justify-center gap-2.5">
        <Pill active={!alt} onClick={() => setAlt(false)}>{`${def.min} a ${def.max}`}</Pill>
        <Pill active={alt} onClick={() => setAlt(true)}>{def.altScale.label}</Pill>
      </div>
      <NumberInput
        min={alt ? def.altScale.min : def.min}
        max={alt ? def.altScale.max : def.max}
        value={display}
        onChange={handle}
      />
    </div>
  )
}

function ChoiceControl({
  options,
  multiple,
  value,
  onChange,
}: {
  options: Option[]
  multiple: boolean
  value: FieldValue | undefined
  onChange: (v: FieldValue) => void
}) {
  if (multiple) {
    const selected = Array.isArray(value) ? value : []
    const toggle = (v: number | string) =>
      onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v])
    return (
      <div className="flex flex-wrap gap-2.5">
        {options.map((o) => (
          <Pill key={String(o.value)} active={selected.includes(o.value)} onClick={() => toggle(o.value)}>
            {o.label}
          </Pill>
        ))}
      </div>
    )
  }
  return (
    <div className="flex flex-wrap gap-2.5">
      {options.map((o) => (
        <Pill key={String(o.value)} active={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </Pill>
      ))}
    </div>
  )
}

function CatalogControl({ def, value, onChange }: { def: CatalogFieldDef } & Omit<FieldProps, 'def'>) {
  const { items, loading, error } = useCatalog(def.catalog)

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50 px-4 py-2.5 text-xs text-slate-400">
        <svg className="h-4 w-4 animate-spin text-violet-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        <span>Cargando opciones…</span>
      </div>
    )
  }
  if (error) {
    return (
      <p className="rounded-xl border border-red-200 bg-red-50/80 p-3 text-xs font-medium text-red-600">
        No se pudieron cargar las opciones. Intenta recargar la página.
      </p>
    )
  }

  if (def.multiple) {
    const selected = Array.isArray(value) ? value : []
    const toggle = (id: number) =>
      onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])
    return (
      <div className="flex flex-wrap gap-2.5">
        {items.map((it) => (
          <Pill key={it.id} active={selected.includes(it.id)} onClick={() => toggle(it.id)}>
            {it.name}
          </Pill>
        ))}
      </div>
    )
  }

  return (
    <Select
      options={items.map((it) => ({ value: it.id, label: it.name }))}
      value={typeof value === 'number' ? value : ''}
      onChange={(v) => onChange(Number(v))}
    />
  )
}

function ConditionalControl({ def, value, onChange }: { def: ConditionalFieldDef } & Omit<FieldProps, 'def'>) {
  const initial = value === undefined || value === '' ? 'none' : value === 0 ? 'no' : 'yes'
  const [mode, setMode] = useState<'none' | 'yes' | 'no'>(initial)

  return (
    <div className="space-y-3">
      <div className="flex gap-2.5">
        <Pill
          active={mode === 'yes'}
          onClick={() => {
            setMode('yes')
            onChange(typeof value === 'number' && value > 0 ? value : '')
          }}
        >
          Sí
        </Pill>
        <Pill
          active={mode === 'no'}
          onClick={() => {
            setMode('no')
            onChange(0)
          }}
        >
          No
        </Pill>
      </div>
      {mode === 'yes' && (
        <div className="animate-enter rounded-xl border border-violet-100 bg-violet-50/50 p-3.5">
          <label className="block text-xs font-semibold text-violet-900">
            {def.hoursLabel}
          </label>
          <div className="mt-2">
            <NumberInput min={0} max={def.max} value={value} onChange={onChange} integer />
          </div>
        </div>
      )}
    </div>
  )
}

