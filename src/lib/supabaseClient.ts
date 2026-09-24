import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Erstatt med generert type når skjemaet er spikret:
//   pnpm dlx supabase gen types typescript --project-id <ref> > src/types/database.ts
// og importer `Database` derfra.
type Database = any

function requireEnv(name: keyof ImportMetaEnv): string {
  const value = import.meta.env[name]
  if (!value) {
    throw new Error(
      `Mangler miljøvariabel ${name}. Kopier .env.example til .env.local og fyll inn verdien.`,
    )
  }
  return value
}

// Modulen evalueres kun én gang, så dette er en singleton.
export const supabase: SupabaseClient<Database> = createClient<Database>(
  requireEnv('VITE_SUPABASE_URL'),
  requireEnv('VITE_SUPABASE_ANON_KEY'),
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  },
)
