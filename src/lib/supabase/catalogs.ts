import { supabase } from './client'
import type { CatalogName } from '../../content/schema'

export type CatalogItem = { id: number; name: string }

// Each catalog table exposes a different PK column but the same `name`.
const PK: Record<CatalogName, string> = {
  major: 'id_major',
  university_center: 'id_center',
  study_modality: 'id_modality',
  content_format: 'id_format',
  device: 'id_device',
  physical_activity: 'id_activity',
  ai_purpose: 'id_purpose',
  ai_tool: 'id_tool',
}

export async function fetchCatalog(name: CatalogName): Promise<CatalogItem[]> {
  const pk = PK[name]
  const { data, error } = await supabase.from(name).select('*').order('name')
  if (error) throw error
  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>
    return { id: Number(r[pk]), name: String(r.name) }
  })
}
