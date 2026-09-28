import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  throw new Error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY in .env')
}

// persistSession keeps the anon session across reloads (needed for finalize retry).
export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true },
})
