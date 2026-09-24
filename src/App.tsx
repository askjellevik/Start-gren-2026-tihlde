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
      <header className="bg-page text-foreground">
        {isAdminRoute && (
          <div className="mx-auto flex max-w-6xl items-center justify-end px-4 py-4 sm:px-6">
            <a href="/" className="text-sm text-primary-ink underline underline-offset-4">
              Til kalkulatoren
            </a>
          </div>
        )}

        {!isAdminRoute && (
          <div className="mx-auto max-w-4xl px-4 pt-16 pb-14 text-center sm:px-6 sm:pt-24 sm:pb-16">
            <h1 className="text-4xl leading-[1.15] font-black text-balance text-forest italic sm:text-6xl">
              Hvor bærekraftig er du egentlig i ditt daglige liv?
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg">
              Svar på noen få spørsmål om hverdagen din og se hvordan du ligger an mot en
              gjennomsnittlig nordmann.
            </p>
            {/* Grønn «fane» som på cultura.no */}
            <div aria-hidden className="mt-10 inline-flex flex-col">
              <span className="bg-primary px-7 py-2.5 text-xl font-bold text-primary-foreground italic">
                Klimakalkulator
              </span>
              <span className="h-3 bg-forest" />
            </div>
          </div>
        )}
      </header>

      <main
        className={
          isAdminRoute
            ? 'mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6'
            : 'mx-auto w-full max-w-6xl flex-1 px-4 pb-16 sm:px-6'
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

      <footer className="bg-card">
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
