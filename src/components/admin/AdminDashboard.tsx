import { LogOut, Pencil, Plus } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { deleteCategory, deleteMethod, describeError, fetchAdminData } from '@/lib/admin/api'
import { PERIOD_LABEL } from '@/lib/calculator/engine'
import { cn } from '@/lib/utils'
import type { Category, EmissionMethod } from '@/types/calculator'
import type { SettingsRow } from '@/types/database'
import { CategoryForm } from './CategoryForm'
import { ConfirmDeleteButton } from './ConfirmDeleteButton'
import { MethodForm } from './MethodForm'
import { SettingsForm } from './SettingsForm'

type Tab = 'methods' | 'categories' | 'settings'
type Editing =
  | { kind: 'method'; method: EmissionMethod | null }
  | { kind: 'category'; category: Category | null }
  | null

interface AdminDashboardProps {
  email: string
  onSignOut: () => void
}

export function AdminDashboard({ email, onSignOut }: AdminDashboardProps) {
  const [tab, setTab] = useState<Tab>('methods')
  const [categories, setCategories] = useState<Category[]>([])
  const [methods, setMethods] = useState<EmissionMethod[]>([])
  const [settings, setSettings] = useState<SettingsRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [editing, setEditing] = useState<Editing>(null)

  const reload = useCallback(async () => {
    try {
      const data = await fetchAdminData()
      setCategories(data.categories)
      setMethods(data.methods)
      setSettings(data.settings)
      setError(null)
    } catch (e) {
      setError(describeError(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  async function run(action: () => Promise<void>, success: string) {
    setError(null)
    setNotice(null)
    try {
      await action()
      setNotice(success)
      await reload()
    } catch (e) {
      setError(describeError(e))
    }
  }

  function startEditing(next: Editing) {
    setNotice(null)
    setError(null)
    setEditing(next)
  }

  function finishEditing(message: string) {
    setEditing(null)
    setNotice(message)
    reload()
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'methods', label: `Utslippsmetoder (${methods.length})` },
    { id: 'categories', label: `Kategorier (${categories.length})` },
    { id: 'settings', label: 'Snitt og felles utslipp' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black text-primary">Adminpanel</h1>
          <p className="text-sm text-muted-foreground">
            Innlogget som {email}. Endringer vises i kalkulatoren neste gang siden lastes.
          </p>
        </div>
        <Button variant="outline" onClick={onSignOut}>
          <LogOut /> Logg ut
        </Button>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-lg bg-accent/15 p-3 text-sm text-primary">
          {notice}
        </p>
      )}

      {editing?.kind === 'method' ? (
        <MethodForm
          method={editing.method}
          categories={categories}
          onCancel={() => setEditing(null)}
          onSaved={() => finishEditing(editing.method ? 'Utslippsmetoden er oppdatert.' : 'Utslippsmetoden er lagt til.')}
        />
      ) : editing?.kind === 'category' ? (
        <CategoryForm
          category={editing.category}
          onCancel={() => setEditing(null)}
          onSaved={() => finishEditing(editing.category ? 'Kategorien er oppdatert.' : 'Kategorien er lagt til.')}
        />
      ) : (
        <>
          <div role="tablist" className="flex flex-wrap gap-2 border-b">
            {tabs.map((t) => (
              <button
                key={t.id}
                role="tab"
                type="button"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  '-mb-px border-b-2 px-3 py-2 text-sm font-bold',
                  tab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="text-muted-foreground">Laster …</p>
          ) : tab === 'methods' ? (
            <div className="space-y-6">
              <Button onClick={() => startEditing({ kind: 'method', method: null })} disabled={categories.length === 0}>
                <Plus /> Ny utslippsmetode
              </Button>
              {categories.map((category) => {
                const inCategory = methods.filter((m) => m.categoryId === category.id)
                return (
                  <section key={category.id} className="rounded-lg border bg-card">
                    <h2 className="flex items-center gap-2 border-b px-4 py-3 font-bold">
                      <span aria-hidden className="size-3 rounded-full" style={{ background: category.color }} />
                      {category.name}
                    </h2>
                    {inCategory.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-muted-foreground">Ingen utslippsmetoder.</p>
                    ) : (
                      <ul className="divide-y">
                        {inCategory.map((m) => (
                          <li key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                            <div className="min-w-0 flex-1">
                              <p className="font-bold">{m.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {m.kgCo2ePerUnit.toLocaleString('nb-NO')} kg CO₂e per {m.unitLabel} ·{' '}
                                {PERIOD_LABEL[m.period]} · {m.choices.length} valg
                              </p>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => startEditing({ kind: 'method', method: m })}>
                              <Pencil /> Rediger
                            </Button>
                            <ConfirmDeleteButton
                              label={`Slett ${m.name}`}
                              onConfirm={() => run(() => deleteMethod(m.id), `«${m.name}» er slettet.`)}
                            />
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                )
              })}
            </div>
          ) : tab === 'categories' ? (
            <div className="space-y-4">
              <Button onClick={() => startEditing({ kind: 'category', category: null })}>
                <Plus /> Ny kategori
              </Button>
              <ul className="divide-y rounded-lg border bg-card">
                {categories.map((c) => {
                  const count = methods.filter((m) => m.categoryId === c.id).length
                  return (
                    <li key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                      <span aria-hidden className="size-4 rounded-full" style={{ background: c.color }} />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold">{c.name}</p>
                        <p className="text-sm text-muted-foreground">{count} utslippsmetoder</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => startEditing({ kind: 'category', category: c })}>
                        <Pencil /> Rediger
                      </Button>
                      <ConfirmDeleteButton
                        label={`Slett ${c.name}`}
                        warning={count > 0 ? `Sletter også ${count} utslippsmetoder.` : undefined}
                        onConfirm={() => run(() => deleteCategory(c.id), `«${c.name}» er slettet.`)}
                      />
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : settings ? (
            <SettingsForm settings={settings} onSaved={() => finishEditing('Innstillingene er lagret.')} />
          ) : (
            <p className="text-muted-foreground">Fant ingen innstillinger. Er seed-dataene lastet inn?</p>
          )}
        </>
      )}
    </div>
  )
}
