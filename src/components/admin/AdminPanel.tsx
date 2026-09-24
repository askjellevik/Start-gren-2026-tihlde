import type { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient'
import { AdminDashboard } from './AdminDashboard'
import { LoginForm } from './LoginForm'

// Inngang til adminpanelet: innlogging og sjekk av adminrettighet.
// Frontend-sjekken er kun for brukeropplevelsen – databasen (RLS) avviser
// uansett skriving fra brukere som ikke står i admins-tabellen.
export function AdminPanel() {
  const [session, setSession] = useState<Session | null>(null)
  const [sessionLoaded, setSessionLoaded] = useState(false)
  // Adminstatus per bruker-id, så bytte av bruker gir ny sjekk.
  const [adminCheck, setAdminCheck] = useState<{ userId: string; isAdmin: boolean } | null>(null)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setSessionLoaded(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => setSession(newSession))
    return () => data.subscription.unsubscribe()
  }, [])

  const userId = session?.user.id
  useEffect(() => {
    if (!supabase || !userId) return
    let cancelled = false
    supabase.rpc('is_admin').then(({ data, error }) => {
      if (!cancelled) setAdminCheck({ userId, isAdmin: !error && data === true })
    })
    return () => {
      cancelled = true
    }
  }, [userId])

  if (!isSupabaseConfigured || !supabase) {
    return (
      <Panel title="Databasen er ikke koblet til">
        <p>
          Adminpanelet trenger Supabase. Kalkulatoren fungerer likevel med det innebygde datasettet.
        </p>
        <p className="text-sm text-muted-foreground">
          Legg inn <code>VITE_SUPABASE_URL</code> og <code>VITE_SUPABASE_ANON_KEY</code> i{' '}
          <code>.env.local</code> (lokalt) eller i Vercel. Se README.
        </p>
      </Panel>
    )
  }

  if (!sessionLoaded) return <p className="text-muted-foreground">Laster …</p>

  if (!session) {
    return (
      <Panel title="Logg inn som administrator">
        <LoginForm />
      </Panel>
    )
  }

  const signOut = () => supabase?.auth.signOut()

  const access =
    adminCheck?.userId !== session.user.id ? 'checking' : adminCheck.isAdmin ? 'admin' : 'denied'

  if (access === 'checking') return <p className="text-muted-foreground">Sjekker tilgang …</p>

  if (access === 'denied') {
    return (
      <Panel title="Ingen tilgang">
        <p>
          Du er logget inn som {session.user.email}, men kontoen har ikke administratortilgang.
        </p>
        <Button variant="outline" onClick={signOut}>
          Logg ut
        </Button>
      </Panel>
    )
  }

  return <AdminDashboard email={session.user.email ?? ''} onSignOut={signOut} />
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-md space-y-4 rounded-lg border bg-card p-6">
      <h1 className="text-2xl font-black text-primary">{title}</h1>
      {children}
    </section>
  )
}
