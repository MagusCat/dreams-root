import type { ReactNode } from 'react'

export function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-medium transition-all duration-200 ease-out select-none hover:-translate-y-0.5 active:scale-95 focus:outline-none focus:ring-2 focus:ring-violet-400/50 ${
        active
          ? 'border-violet-600 bg-violet-600 text-white shadow-sm shadow-violet-600/30'
          : 'border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:text-slate-900'
      }`}
    >
      {active && (
        <svg className="h-4 w-4 shrink-0 stroke-current text-white" fill="none" viewBox="0 0 24 24" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      )}
      <span>{children}</span>
    </button>
  )
}

