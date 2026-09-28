import { useEffect, useRef, useState } from 'react'

export type SelectOption = { value: number | string; label: string }

// Clean searchable combobox (no deps). Used for catalog single-select where the
// list can be long (universities, majors). Click-outside / Escape close it.
export default function Select({
  options,
  value,
  onChange,
  placeholder = 'Selecciona una opción…',
}: {
  options: SelectOption[]
  value: number | string | undefined | ''
  onChange: (v: number | string) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const selected = options.find((o) => o.value === value)
  const filtered = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center justify-between rounded-xl border bg-white px-4 py-2.5 text-left text-sm font-medium outline-none transition-all duration-200 ease-out ${
          open ? 'border-violet-400 ring-4 ring-violet-400/15' : 'border-slate-200 hover:border-slate-300'
        } ${selected ? 'text-slate-800' : 'text-slate-400'}`}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <svg
          className={`ml-2 h-4 w-4 shrink-0 stroke-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="2"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div className="animate-enter mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {options.length > 6 && (
            <div className="border-b border-slate-100 p-2">
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
                placeholder="Buscar…"
                className="w-full rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-violet-400/30"
              />
            </div>
          )}
          <ul className="custom-scrollbar max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="px-4 py-2.5 text-sm text-slate-400">Sin resultados</li>
            )}
            {filtered.map((o) => (
              <li key={String(o.value)}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(o.value)
                    setQuery('')
                    setOpen(false)
                  }}
                  className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors hover:bg-violet-50 ${
                    o.value === value ? 'font-semibold text-violet-700' : 'text-slate-700'
                  }`}
                >
                  <span className="truncate">{o.label}</span>
                  {o.value === value && (
                    <svg className="h-4 w-4 shrink-0 stroke-violet-600" fill="none" viewBox="0 0 24 24" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
