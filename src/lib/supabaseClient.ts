import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from '@/lib/config'
import type { Database } from '@/types/database'

// Supabase er valgfritt for kalkulatoren: mangler miljøvariablene, brukes det
// innebygde datasettet (src/data/seed.ts). Kun adminpanelet krever databasen.
//
// Anon-nøkkelen er offentlig med vilje. Tilgangskontroll skjer med RLS i
// databasen (supabase/migrations), ikke her.

export { isSupabaseConfigured }

// Modulen evalueres kun én gang, så dette er en singleton.
export const supabase: SupabaseClient<Database> | null = isSupabaseConfigured
  ? createClient<Database>(supabaseUrl!, supabaseAnonKey!, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null
