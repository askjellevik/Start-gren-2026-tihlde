import { lazy, Suspense } from 'react'
import { Calculator } from '@/components/calculator/Calculator'

// Adminpanelet lastes kun når noen går til /admin, så vanlige besøkende
// ikke laster ned admin-koden. Tilgangskontrollen ligger i databasen (RLS).
const AdminPanel = lazy(() =>
  import('@/components/admin/AdminPanel').then((m) => ({ default: m.AdminPanel })),
)

const isAdminRoute = window.location.pathname.replace(/\/+$/, '') === '/admin'

function App() {
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <a href="/" className="flex items-center gap-3">
            <span aria-hidden className="grid size-9 place-items-center rounded-full bg-accent text-lg font-black">
              C
            </span>
            <span className="leading-tight">
              <span className="block text-lg font-black">Bærekraftskalkulator</span>
              <span className="block text-xs opacity-80">Hvor stort er ditt klimafotavtrykk?</span>
            </span>
          </a>
          {isAdminRoute && (
            <a href="/" className="text-sm underline underline-offset-4">
              Til kalkulatoren
            </a>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {isAdminRoute ? (
          <Suspense fallback={<p className="text-muted-foreground">Laster adminpanel …</p>}>
            <AdminPanel />
          </Suspense>
        ) : (
          <Calculator />
        )}
      </main>

      <footer className="border-t bg-secondary">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-muted-foreground sm:px-6">
          <span>Ingen svar lagres. Alt regnes ut i nettleseren din.</span>
          {!isAdminRoute && (
            <a href="/admin" className="opacity-60 hover:underline hover:opacity-100">
              Admin?
            </a>
          )}
        </div>
      </footer>
    </div>
  )
}

export default App
