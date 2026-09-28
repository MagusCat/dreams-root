import type { ReactNode } from 'react'
import { PROGRESS_STEPS, type Step } from '../app/steps'
import ProgressBar from './ProgressBar'

export default function Layout({
  children,
  footer,
  onBack,
  step,
}: {
  children: ReactNode
  footer?: ReactNode
  onBack?: () => void
  step?: Step
}) {
  const idx = step ? PROGRESS_STEPS.indexOf(step) : -1

  return (
    <main className="relative flex h-dvh w-full flex-col overflow-hidden bg-white text-slate-900 sm:h-[min(720px,92dvh)] sm:max-w-xl sm:rounded-[2rem] sm:border sm:border-white/80 sm:shadow-[0_25px_75px_-12px_rgba(49,46,129,0.35)] lg:max-w-2xl">
      {idx >= 0 && <ProgressBar current={idx + 1} total={PROGRESS_STEPS.length} />}

      <div className="custom-scrollbar flex-1 overflow-y-auto px-5 py-6 sm:px-8 sm:py-7">{children}</div>

      {(footer || onBack) && (
        <div className="flex items-center gap-3 border-t border-slate-100 bg-white px-6 py-4 sm:px-8">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex shrink-0 items-center gap-1 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-800 active:scale-95 focus:outline-none focus:ring-2 focus:ring-violet-300"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
              Atrás
            </button>
          )}
          {footer && <div className="flex-1">{footer}</div>}
        </div>
      )}
    </main>
  )
}

