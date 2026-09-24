import { useState } from 'react'
import { AdminPanel } from '@/components/admin/AdminPanel'
import { Calculator } from '@/components/calculator/Calculator'
import { Button } from '@/components/ui/button'

type View = 'calculator' | 'admin'

function App() {
  const [view, setView] = useState<View>('calculator')

  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <h1 className="text-lg font-semibold">Bærekraftskalkulator</h1>
        <nav className="flex gap-2">
          <Button
            variant={view === 'calculator' ? 'default' : 'outline'}
            onClick={() => setView('calculator')}
          >
            Kalkulator
          </Button>
          <Button
            variant={view === 'admin' ? 'default' : 'outline'}
            onClick={() => setView('admin')}
          >
            Admin
          </Button>
        </nav>
      </header>
      <main className="mx-auto max-w-3xl p-6">
        {view === 'calculator' ? <Calculator /> : <AdminPanel />}
      </main>
    </div>
  )
}

export default App
