import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Input, Textarea } from '@/components/ui/field'
import { describeError, saveCategory } from '@/lib/admin/api'
import { parseNumber, validateCategory, type CategoryDraft, type Errors } from '@/lib/admin/validation'
import type { Category } from '@/types/calculator'

interface CategoryFormProps {
  category: Category | null
  onCancel: () => void
  onSaved: () => void
}

export function CategoryForm({ category, onCancel, onSaved }: CategoryFormProps) {
  const [draft, setDraft] = useState<CategoryDraft>({
    id: category?.id,
    name: category?.name ?? '',
    description: category?.description ?? '',
    color: category?.color ?? '#728f3f',
    sortOrder: String(category?.sortOrder ?? 0),
  })
  const [errors, setErrors] = useState<Errors<CategoryDraft>>({})
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const set = <K extends keyof CategoryDraft>(key: K, value: CategoryDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const found = validateCategory(draft)
    setErrors(found)
    if (Object.keys(found).length > 0) return
    setSaving(true)
    setSaveError(null)
    try {
      await saveCategory(draft.id, {
        name: draft.name.trim(),
        description: draft.description.trim() || null,
        color: draft.color,
        sortOrder: Math.round(parseNumber(draft.sortOrder)!),
      })
      onSaved()
    } catch (err) {
      setSaveError(describeError(err))
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-5 rounded-lg border bg-card p-6" noValidate>
      <h2 className="text-2xl font-bold text-primary-ink">
        {category ? `Rediger «${category.name}»` : 'Ny kategori'}
      </h2>
      <Field label="Navn" htmlFor="c-name" error={errors.name}>
        <Input id="c-name" value={draft.name} maxLength={80} aria-invalid={!!errors.name} onChange={(e) => set('name', e.target.value)} />
      </Field>
      <Field label="Beskrivelse (valgfritt)" htmlFor="c-desc" error={errors.description}>
        <Textarea id="c-desc" value={draft.description} maxLength={300} onChange={(e) => set('description', e.target.value)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Farge i diagrammet" htmlFor="c-color" error={errors.color}>
          <Input id="c-color" type="color" className="h-10 p-1" value={draft.color} onChange={(e) => set('color', e.target.value)} />
        </Field>
        <Field label="Rekkefølge" htmlFor="c-sort" error={errors.sortOrder}>
          <Input id="c-sort" inputMode="numeric" value={draft.sortOrder} onChange={(e) => set('sortOrder', e.target.value)} />
        </Field>
      </div>
      {saveError && (
        <p role="alert" className="text-sm text-destructive">
          {saveError}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? 'Lagrer …' : 'Lagre'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Avbryt
        </Button>
      </div>
    </form>
  )
}
