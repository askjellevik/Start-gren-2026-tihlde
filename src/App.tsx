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
    <div className="flex min-h-svh flex-col text-foreground">
      <header className="relative isolate overflow-clip bg-primary text-primary-foreground">
        {/* Myke lysflekker i bakgrunnen */}
        <div aria-hidden className="absolute inset-0 -z-10">
          <div className="absolute -top-32 -right-24 size-[28rem] rounded-full bg-accent/40 blur-3xl" />
          <div className="absolute -bottom-40 -left-20 size-[24rem] rounded-full bg-primary-strong blur-3xl" />
        </div>

        {isAdminRoute && (
          <div className="mx-auto flex max-w-6xl items-center justify-end px-4 py-4 sm:px-6">
            <a href="/" className="text-sm underline underline-offset-4">
              Til kalkulatoren
            </a>
          </div>
        )}

        {!isAdminRoute && (
          <div className="mx-auto max-w-6xl px-4 pt-14 pb-20 sm:px-6 sm:pt-20 sm:pb-24">
            <h1 className="max-w-3xl text-4xl leading-[1.05] font-black tracking-tight text-balance sm:text-5xl">
              Hvor bærekraftig er du egentlig i ditt daglige liv?
            </h1>
            <p className="mt-4 max-w-xl text-base text-primary-foreground/80 sm:text-lg">
              Svar på noen få spørsmål om hverdagen din og se hvordan du ligger an mot en
              gjennomsnittlig nordmann.
            </p>
          </div>
        )}
      </header>

      <main
        className={
          isAdminRoute
            ? 'mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6'
            : 'relative mx-auto -mt-12 w-full max-w-6xl flex-1 px-4 pb-12 sm:px-6'
        }
      >
        {isAdminRoute ? (
          <Suspense fallback={<p className="text-muted-foreground">Laster adminpanel …</p>}>
            <AdminPanel />
          </Suspense>
        ) : (
          <Calculator />
        )}
      </main>

      <footer className="border-t border-border/70 bg-secondary/60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-5 text-xs text-muted-foreground sm:px-6">
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
