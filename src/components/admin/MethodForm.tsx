import { Plus, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { describeError, saveMethod } from '@/lib/admin/api'
import { parseNumber, validateMethod, type Errors, type MethodDraft } from '@/lib/admin/validation'
import { easyWinSaving } from '@/lib/calculator/easyWin'
import { annualKg, formatKg, PERIOD_LABEL } from '@/lib/calculator/engine'
import type { Category, EmissionMethod, Period } from '@/types/calculator'

interface MethodFormProps {
  method: EmissionMethod | null
  categories: Category[]
  /** Alle metoder, for å velge erstatning i «enkelt grep». */
  methods: EmissionMethod[]
  onCancel: () => void
  onSaved: () => void
}

function toDraft(method: EmissionMethod | null, categories: Category[]): MethodDraft {
  return {
    id: method?.id,
    categoryId: method?.categoryId ?? categories[0]?.id ?? '',
    name: method?.name ?? '',
    question: method?.question ?? '',
    period: method?.period ?? 'week',
    unitLabel: method?.unitLabel ?? '',
    kgCo2ePerUnit: method ? String(method.kgCo2ePerUnit).replace('.', ',') : '',
    choices: method
      ? method.choices.map((c) => ({ label: c.label, value: String(c.value).replace('.', ',') }))
      : [{ label: '', value: '' }],
    tip: method?.tip ?? '',
    sourceName: method?.sourceName ?? '',
    sourceUrl: method?.sourceUrl ?? '',
    sortOrder: String(method?.sortOrder ?? 0),
    easyWinText: method?.easyWinText ?? '',
    easyWinUnits: method?.easyWinUnits == null ? '' : String(method.easyWinUnits).replace('.', ','),
    easyWinReplacementId: method?.easyWinReplacementId ?? '',
  }
}

export function MethodForm({ method, categories, methods, onCancel, onSaved }: MethodFormProps) {
  const [draft, setDraft] = useState(() => toDraft(method, categories))
  const [errors, setErrors] = useState<Errors<MethodDraft>>({})
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const set = <K extends keyof MethodDraft>(key: K, value: MethodDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))

  const setChoice = (index: number, key: 'label' | 'value', value: string) =>
    set('choices', draft.choices.map((c, i) => (i === index ? { ...c, [key]: value } : c)))

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const { errors, choices } = validateMethod(draft)
    setErrors(errors)
    if (Object.keys(errors).length > 0) return
    setSaving(true)
    setSaveError(null)
    try {
      await saveMethod(draft.id, {
        categoryId: draft.categoryId,
        name: draft.name.trim(),
        question: draft.question.trim(),
        period: draft.period,
        unitLabel: draft.unitLabel.trim(),
        kgCo2ePerUnit: parseNumber(draft.kgCo2ePerUnit)!,
        choices,
        tip: draft.tip.trim() || null,
        sourceName: draft.sourceName.trim() || null,
        sourceUrl: draft.sourceUrl.trim() || null,
        sortOrder: Math.round(parseNumber(draft.sortOrder)!),
        easyWinText: draft.easyWinText.trim() || null,
        easyWinUnits: draft.easyWinText.trim() ? parseNumber(draft.easyWinUnits) : null,
        easyWinReplacementId: draft.easyWinReplacementId || null,
      })
      onSaved()
    } catch (err) {
      setSaveError(describeError(err))
      setSaving(false)
    }
  }

  // Forhåndsvisning av årlige utslipp per valg
  const factor = parseNumber(draft.kgCo2ePerUnit) ?? 0
  const preview = (value: string) => {
    const v = parseNumber(value)
    if (v === null) return '–'
    const kg = annualKg(
      { period: draft.period, kgCo2ePerUnit: factor, choices: [{ label: '', value: v }] } as EmissionMethod,
      0,
    )
    return `${formatKg(kg)}/år`
  }

  // Forhåndsvisning av det enkle grepet
  const winUnits = parseNumber(draft.easyWinUnits)
  const replacement = methods.find((m) => m.id === draft.easyWinReplacementId)
  const winSaving =
    winUnits !== null && winUnits > 0
      ? easyWinSaving(
          { ...(method ?? ({} as EmissionMethod)), period: draft.period, kgCo2ePerUnit: factor, easyWinUnits: winUnits },
          winUnits,
          replacement,
        )
      : 0

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border bg-card p-6" noValidate>
      <h2 className="text-2xl font-black text-primary-ink">
        {method ? `Rediger «${method.name}»` : 'Ny utslippsmetode'}
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Navn" htmlFor="m-name" error={errors.name} hint="Vises i menyen, f.eks. «Rødt kjøtt»">
          <Input id="m-name" value={draft.name} maxLength={80} aria-invalid={!!errors.name} onChange={(e) => set('name', e.target.value)} />
        </Field>
        <Field label="Kategori" htmlFor="m-category" error={errors.categoryId}>
          <Select id="m-category" value={draft.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Spørsmål" htmlFor="m-question" error={errors.question}>
        <Input id="m-question" value={draft.question} maxLength={200} aria-invalid={!!errors.question} onChange={(e) => set('question', e.target.value)} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Utslipp per enhet (kg CO₂e)" htmlFor="m-factor" error={errors.kgCo2ePerUnit}>
          <Input id="m-factor" inputMode="decimal" value={draft.kgCo2ePerUnit} aria-invalid={!!errors.kgCo2ePerUnit} onChange={(e) => set('kgCo2ePerUnit', e.target.value)} />
        </Field>
        <Field label="Enhet" htmlFor="m-unit" error={errors.unitLabel} hint="f.eks. middag, km, plagg">
          <Input id="m-unit" value={draft.unitLabel} maxLength={30} aria-invalid={!!errors.unitLabel} onChange={(e) => set('unitLabel', e.target.value)} />
        </Field>
        <Field label="Periode" htmlFor="m-period" error={errors.period}>
          <Select id="m-period" value={draft.period} onChange={(e) => set('period', e.target.value as Period)}>
            {(Object.keys(PERIOD_LABEL) as Period[]).map((p) => (
              <option key={p} value={p}>
                {PERIOD_LABEL[p]}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-bold">Svaralternativer</legend>
        <p className="text-xs text-muted-foreground">
          «Antall» er hvor mange enheter valget tilsvarer {PERIOD_LABEL[draft.period]}.
        </p>
        {draft.choices.map((choice, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input aria-label={`Tekst for valg ${i + 1}`} placeholder="Tekst, f.eks. «2 ganger»" value={choice.label} maxLength={80} onChange={(e) => setChoice(i, 'label', e.target.value)} />
            <Input aria-label={`Antall for valg ${i + 1}`} placeholder="Antall" inputMode="decimal" className="w-24" value={choice.value} onChange={(e) => setChoice(i, 'value', e.target.value)} />
            <span className="w-24 shrink-0 text-right text-xs text-muted-foreground">{preview(choice.value)}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Fjern valg ${i + 1}`}
              disabled={draft.choices.length <= 1}
              onClick={() => set('choices', draft.choices.filter((_, j) => j !== i))}
            >
              <X />
            </Button>
          </div>
        ))}
        {errors.choices && <p className="text-xs text-destructive">{errors.choices}</p>}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={draft.choices.length >= 12}
          onClick={() => set('choices', [...draft.choices, { label: '', value: '' }])}
        >
          <Plus /> Legg til valg
        </Button>
      </fieldset>

      <Field label="Tips (valgfritt)" htmlFor="m-tip" error={errors.tip} hint="Vises i resultatet hvis dette er en av de største kildene.">
        <Textarea id="m-tip" value={draft.tip} maxLength={300} onChange={(e) => set('tip', e.target.value)} />
      </Field>

      <fieldset className="space-y-3 rounded-lg bg-muted p-4">
        <legend className="px-1 text-sm font-bold">Enkelt grep (valgfritt)</legend>
        <p className="text-xs text-muted-foreground">
          Vises i resultatet som «Dersom du bare …, sparer du X i året» hvis dette er grepet som sparer
          brukeren mest.
        </p>
        <Field label="Dersom du bare …" htmlFor="m-win-text" error={errors.easyWinText} hint="f.eks. «tar én kjøretur mindre til jobb i uka»">
          <Input id="m-win-text" value={draft.easyWinText} maxLength={200} onChange={(e) => set('easyWinText', e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={`Antall ${draft.unitLabel || 'enheter'} ${PERIOD_LABEL[draft.period]}`} htmlFor="m-win-units" error={errors.easyWinUnits}>
            <Input id="m-win-units" inputMode="decimal" value={draft.easyWinUnits} onChange={(e) => set('easyWinUnits', e.target.value)} />
          </Field>
          <Field label="Erstattes med (samme enhet)" htmlFor="m-win-repl" error={errors.easyWinReplacementId} hint="Utslippet fra erstatningen trekkes fra besparelsen.">
            <Select id="m-win-repl" value={draft.easyWinReplacementId} onChange={(e) => set('easyWinReplacementId', e.target.value)}>
              <option value="">Ingenting</option>
              {methods
                .filter((m) => m.id !== draft.id)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.kgCo2ePerUnit.toLocaleString('nb-NO')} kg per {m.unitLabel})
                  </option>
                ))}
            </Select>
          </Field>
        </div>
        {winSaving > 0 && (
          <p className="text-sm">
            Forhåndsvisning: «Dersom du bare {draft.easyWinText.trim() || '…'}, sparer du{' '}
            <strong>{formatKg(winSaving)}</strong> i året.»
          </p>
        )}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-[2fr_2fr_1fr]">
        <Field label="Kilde" htmlFor="m-source" error={errors.sourceName}>
          <Input id="m-source" value={draft.sourceName} maxLength={300} onChange={(e) => set('sourceName', e.target.value)} />
        </Field>
        <Field label="Kildelenke (https://)" htmlFor="m-source-url" error={errors.sourceUrl}>
          <Input id="m-source-url" type="url" value={draft.sourceUrl} aria-invalid={!!errors.sourceUrl} onChange={(e) => set('sourceUrl', e.target.value)} />
        </Field>
        <Field label="Rekkefølge" htmlFor="m-sort" error={errors.sortOrder}>
          <Input id="m-sort" inputMode="numeric" value={draft.sortOrder} onChange={(e) => set('sortOrder', e.target.value)} />
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
