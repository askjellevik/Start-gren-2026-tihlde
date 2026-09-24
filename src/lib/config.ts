// Lett modul uten avhengigheter, så man kan sjekke konfigurasjonen uten å
// laste inn hele Supabase-klienten.
export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)
