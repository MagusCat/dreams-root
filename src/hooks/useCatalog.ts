import { useEffect, useState } from 'react'
import { fetchCatalog, type CatalogItem } from '../lib/supabase/catalogs'
import type { CatalogName } from '../content/schema'

type State = { items: CatalogItem[]; loading: boolean; error: string | null }

export function useCatalog(name: CatalogName): State {
  const [state, setState] = useState<State>({ items: [], loading: true, error: null })

  useEffect(() => {
    let alive = true
    setState({ items: [], loading: true, error: null })
    fetchCatalog(name)
      .then((items) => alive && setState({ items, loading: false, error: null }))
      .catch((e) => alive && setState({ items: [], loading: false, error: String(e) }))
    return () => {
      alive = false
    }
  }, [name])

  return state
}
