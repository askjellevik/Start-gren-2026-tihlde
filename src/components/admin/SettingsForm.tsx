import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { describeError, saveSettings } from '@/lib/admin/api'
import { parseNumber, validateSettings, type Errors, type SettingsDraft } from '@/lib/admin/validation'
import type { SettingsRow } from '@/types/database'

interface SettingsFormProps {
  settings: SettingsRow
  onSaved: () => void
}

export function SettingsForm({ settings, onSaved }: SettingsFormProps) {
  const [draft, setDraft] = useState<SettingsDraft>({
    nationalAverageKg: String(settings.national_average_kg),
    nationalAverageSource: settings.national_average_source ?? '',
    nationalAverageSourceUrl: settings.national_average_source_url ?? '',
    baselineKg: String(settings.baseline_kg),
    baselineLabel: settings.baseline_label,
    targetKg: settings.target_kg === null ? '' : String(settings.target_kg),
    targetLabel: settings.target_label ?? '',
  })
  const [errors, setErrors] = useState<Errors<SettingsDraft>>({})
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const set = <K extends keyof SettingsDraft>(key: K, value: string) => setDraft((d) => ({ ...d, [key]: value }))

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const found = validateSettings(draft)
    setErrors(found)
    if (Object.keys(found).length > 0) return
    setSaving(true)
    setSaveError(null)
    try {
      await saveSettings({
        nationalAverageKg: parseNumber(draft.nationalAverageKg)!,
        nationalAverageSource: draft.nationalAverageSource.trim() || null,
        nationalAverageSourceUrl: draft.nationalAverageSourceUrl.trim() || null,
        baselineKg: parseNumber(draft.baselineKg)!,
        baselineLabel: draft.baselineLabel.trim(),
        targetKg: draft.targetKg.trim() === '' ? null : parseNumber(draft.targetKg),
        targetLabel: draft.targetLabel.trim() || null,
      })
      onSaved()
    } catch (err) {
      setSaveError(describeError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-5 rounded-lg border bg-card p-6" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Snitt per nordmann (kg CO₂e/år)" htmlFor="s-avg" error={errors.nationalAverageKg}>
          <Input id="s-avg" inputMode="decimal" value={draft.nationalAverageKg} onChange={(e) => set('nationalAverageKg', e.target.value)} />
        </Field>
        <Field label="Fast tillegg (kg CO₂e/år)" htmlFor="s-base" error={errors.baselineKg} hint="Legges til alle, uansett svar.">
          <Input id="s-base" inputMode="decimal" value={draft.baselineKg} onChange={(e) => set('baselineKg', e.target.value)} />
        </Field>
      </div>
      <Field label="Beskrivelse av fast tillegg" htmlFor="s-base-label" error={errors.baselineLabel}>
        <Input id="s-base-label" value={draft.baselineLabel} maxLength={120} onChange={(e) => set('baselineLabel', e.target.value)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Klimamål (kg CO₂e/år, valgfritt)" htmlFor="s-target" error={errors.targetKg} hint="Vises som egen strek i tanken.">
          <Input id="s-target" inputMode="decimal" value={draft.targetKg} onChange={(e) => set('targetKg', e.target.value)} />
        </Field>
        <Field label="Navn på klimamålet" htmlFor="s-target-label" error={errors.targetLabel}>
          <Input id="s-target-label" value={draft.targetLabel} maxLength={120} onChange={(e) => set('targetLabel', e.target.value)} />
        </Field>
      </div>
      <Field label="Kilde for snittet" htmlFor="s-source" error={errors.nationalAverageSource}>
        <Input id="s-source" value={draft.nationalAverageSource} maxLength={300} onChange={(e) => set('nationalAverageSource', e.target.value)} />
      </Field>
      <Field label="Kildelenke (https://)" htmlFor="s-source-url" error={errors.nationalAverageSourceUrl}>
        <Input id="s-source-url" type="url" value={draft.nationalAverageSourceUrl} onChange={(e) => set('nationalAverageSourceUrl', e.target.value)} />
      </Field>
      {saveError && (
        <p role="alert" className="text-sm text-destructive">
          {saveError}
        </p>
      )}
      <Button type="submit" disabled={saving}>
        {saving ? 'Lagrer …' : 'Lagre'}
      </Button>
    </form>
  )
}
