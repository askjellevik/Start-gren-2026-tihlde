// Radtyper for databasen. Selve `Database`-typen er generert fra skjemaet:
//
//   npx supabase gen types typescript --local > src/types/database.generated.ts
//
// Kjør kommandoen på nytt etter endringer i supabase/migrations.

import type { Database } from './database.generated'

export type { Database }

type Tables = Database['public']['Tables']

export type CategoryRow = Tables['categories']['Row']

export type EmissionMethodRow = Tables['emission_methods']['Row']

export type SettingsRow = Tables['settings']['Row']
