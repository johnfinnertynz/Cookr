import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

export const getSupabaseClient = () => {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

  if (!url || !anonKey) return null
  if (!client) {
    client = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  }
  return client
}

export const isCloudSyncAvailable = () => Boolean(getSupabaseClient())
