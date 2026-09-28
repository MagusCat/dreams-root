import { useCallback, useEffect, useState } from 'react'

// State mirrored to localStorage (survives leaving/returning within a step).
export function useLocalState<T>(key: string, initial: T | (() => T)) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw != null) return JSON.parse(raw) as T
    } catch {
      /* ignore */
    }
    return typeof initial === 'function' ? (initial as () => T)() : initial
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* ignore */
    }
  }, [key, value])

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(key)
    } catch {
      /* ignore */
    }
  }, [key])

  return [value, setValue, clear] as const
}
