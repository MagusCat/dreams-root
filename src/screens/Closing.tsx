import { useEffect, useRef, useState } from 'react'
import { Button } from '../components/Button'
import Finished from './Finished'
import { finalizeSubmission } from '../lib/data'
import {
  collectAnswersLocal,
  markCompletedLocal,
  clearProgressLocal,
  saveSummaryLocal,
} from '../lib/localStore'
import { buildSummary } from '../lib/summary'

// The ONLY DB write of the whole flow. Runs on mount; local progress is cleared
// only on success, so a failed save keeps everything to retry (no data loss).
export default function Closing() {
  const [state, setState] = useState<'saving' | 'done' | 'error'>('saving')
  const running = useRef(false)

  async function finalize() {
    if (running.current) return
    running.current = true
    setState('saving')
    try {
      const answers = collectAnswersLocal()
      // finalizeSubmission is idempotent, so retrying a flaky mobile network is safe.
      for (let attempt = 1; ; attempt++) {
        try {
          await finalizeSubmission(answers)
          break
        } catch (e) {
          if (attempt >= 3) throw e
          console.error(e)
          await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt))
        }
      }
      try {
        saveSummaryLocal(await buildSummary(answers))
      } catch (e) {
        console.error(e)
      }
      markCompletedLocal()
      clearProgressLocal()
      setState('done')
    } catch (e) {
      console.error(e)
      setState('error')
    } finally {
      running.current = false
    }
  }

  useEffect(() => {
    void finalize()
  }, [])

  if (state === 'done') return <Finished />

  const failed = state === 'error'
  return (
    <div className="animate-enter flex flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <span className="absolute inset-0 rounded-full border-2 border-white/15" />
        {failed ? (
          <svg className="h-8 w-8 text-rose-300" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <svg className="h-8 w-8 animate-spin text-violet-300" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        )}
      </div>
      <p className="text-sm font-medium text-white/85 drop-shadow-[0_2px_10px_rgba(0,0,0,0.4)]">
        {failed ? 'No pudimos guardar tus respuestas' : 'Guardando tus respuestas…'}
      </p>
      {failed && (
        <>
          <p className="max-w-xs text-xs text-white/70 drop-shadow-[0_2px_10px_rgba(0,0,0,0.4)]">
            Siguen guardadas en este dispositivo. Revisa tu conexión e inténtalo de nuevo.
          </p>
          <div className="w-full max-w-xs">
            <Button onClick={() => void finalize()}>Reintentar</Button>
          </div>
        </>
      )}
    </div>
  )
}
