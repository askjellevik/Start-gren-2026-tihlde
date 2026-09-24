import type { Choice, Period } from '@/types/calculator'

// Klientvalidering for adminskjemaene. Speiler constraints i
// supabase/migrations – databasen er fasiten, dette gir bare bedre feilmeldinger.

export interface MethodDraft {
  id?: string
  categoryId: string
  name: string
  question: string
  period: Period
  unitLabel: string
  kgCo2ePerUnit: string
  choices: { label: string; value: string }[]
  tip: string
  sourceName: string
  sourceUrl: string
  sortOrder: string
}

export interface CategoryDraft {
  id?: string
  name: string
  description: string
  color: string
  sortOrder: string
}

export interface SettingsDraft {
  nationalAverageKg: string
  nationalAverageSource: string
  nationalAverageSourceUrl: string
  baselineKg: string
  baselineLabel: string
}

export type Errors<T> = Partial<Record<keyof T, string>>

const PERIODS: Period[] = ['week', 'month', 'year']

/** Godtar både "1,5" og "1.5". */
export function parseNumber(raw: string): number | null {
  const trimmed = raw.trim().replace(/\s/g, '').replace(',', '.')
  if (trimmed === '' || !/^-?\d+(\.\d+)?$/.test(trimmed)) return null
  return Number(trimmed)
}

function checkLength(value: string, min: number, max: number, label: string): string | undefined {
  const len = value.trim().length
  if (len < min) return `${label} må fylles ut`
  if (len > max) return `${label} kan være maks ${max} tegn`
  return undefined
}

function checkUrl(value: string): string | undefined {
  if (value.trim() === '') return undefined
  if (!/^https:\/\/\S+$/.test(value.trim()) || value.length > 500) {
    return 'Lenken må starte med https:// og kan ikke inneholde mellomrom'
  }
  return undefined
}

export function validateMethod(d: MethodDraft): { errors: Errors<MethodDraft>; choices: Choice[] } {
  const errors: Errors<MethodDraft> = {}
  if (!d.categoryId) errors.categoryId = 'Velg en kategori'
  errors.name = checkLength(d.name, 1, 80, 'Navn')
  errors.question = checkLength(d.question, 1, 200, 'Spørsmål')
  errors.unitLabel = checkLength(d.unitLabel, 1, 30, 'Enhet')
  if (!PERIODS.includes(d.period)) errors.period = 'Velg periode'

  const factor = parseNumber(d.kgCo2ePerUnit)
  if (factor === null || factor < 0 || factor > 100000) {
    errors.kgCo2ePerUnit = 'Oppgi et tall mellom 0 og 100 000'
  }

  const choices: Choice[] = []
  if (d.choices.length < 1 || d.choices.length > 12) {
    errors.choices = 'Legg inn mellom 1 og 12 svaralternativer'
  } else {
    for (const c of d.choices) {
      const value = parseNumber(c.value)
      if (c.label.trim().length < 1 || c.label.trim().length > 80) {
        errors.choices = 'Alle svaralternativer må ha en tekst (maks 80 tegn)'
        break
      }
      if (value === null || value < 0 || value > 1000000) {
        errors.choices = 'Alle svaralternativer må ha et antall som er 0 eller høyere'
        break
      }
      choices.push({ label: c.label.trim(), value })
    }
  }

  if (d.tip.length > 300) errors.tip = 'Maks 300 tegn'
  if (d.sourceName.length > 300) errors.sourceName = 'Maks 300 tegn'
  errors.sourceUrl = checkUrl(d.sourceUrl)
  if (parseNumber(d.sortOrder) === null) errors.sortOrder = 'Oppgi et heltall'

  return { errors: stripEmpty(errors), choices }
}

export function validateCategory(d: CategoryDraft): Errors<CategoryDraft> {
  const errors: Errors<CategoryDraft> = {}
  errors.name = checkLength(d.name, 1, 80, 'Navn')
  if (d.description.length > 300) errors.description = 'Maks 300 tegn'
  if (!/^#[0-9a-fA-F]{6}$/.test(d.color)) errors.color = 'Velg en farge'
  if (parseNumber(d.sortOrder) === null) errors.sortOrder = 'Oppgi et heltall'
  return stripEmpty(errors)
}

export function validateSettings(d: SettingsDraft): Errors<SettingsDraft> {
  const errors: Errors<SettingsDraft> = {}
  const avg = parseNumber(d.nationalAverageKg)
  if (avg === null || avg <= 0 || avg > 1000000) errors.nationalAverageKg = 'Oppgi et tall over 0'
  const base = parseNumber(d.baselineKg)
  if (base === null || base < 0 || base > 1000000) errors.baselineKg = 'Oppgi et tall, 0 eller høyere'
  if (d.nationalAverageSource.length > 300) errors.nationalAverageSource = 'Maks 300 tegn'
  errors.nationalAverageSourceUrl = checkUrl(d.nationalAverageSourceUrl)
  errors.baselineLabel = checkLength(d.baselineLabel, 1, 120, 'Beskrivelse')
  return stripEmpty(errors)
}

function stripEmpty<T>(errors: Errors<T>): Errors<T> {
  return Object.fromEntries(Object.entries(errors).filter(([, v]) => v)) as Errors<T>
}
