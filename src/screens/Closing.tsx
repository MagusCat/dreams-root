import { useEffect, useRef, useState } from 'react'
import MessageScreen from '../components/MessageScreen'
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
      await finalizeSubmission(answers)
      // Save a local readable snapshot before clearing (best-effort; the DB
      // save already succeeded, so a summary failure must not block completion).
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (state === 'saving') {
    return (
      <div className="animate-enter flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <span className="absolute inset-0 rounded-full border-2 border-white/15" />
          <svg className="h-8 w-8 animate-spin text-violet-300" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-white/85 drop-shadow-[0_2px_10px_rgba(0,0,0,0.4)]">
          Guardando tus respuestas…
        </p>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <MessageScreen
        step="closing"
        title="No pudimos enviar tus respuestas"
        intro="Revisa tu conexión a internet e inténtalo de nuevo. Tus respuestas siguen guardadas en este dispositivo."
        footer={<Button onClick={() => void finalize()}>Reintentar</Button>}
      />
    )
  }

  return <Finished />
}
