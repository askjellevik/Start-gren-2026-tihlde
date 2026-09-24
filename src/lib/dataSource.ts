import { seedData } from '@/data/seed'
import { isSupabaseConfigured } from '@/lib/config'
import type { CalculatorData, Category, Choice, EmissionMethod, Period } from '@/types/calculator'
import type { CategoryRow, EmissionMethodRow } from '@/types/database'

// Henter kalkulatordata fra Supabase, med det innebygde datasettet som
// reserve. Kalkulatoren skal aldri bli stående tom fordi databasen er nede.

export type DataOrigin = 'database' | 'innebygd'

export interface LoadedData {
  data: CalculatorData
  origin: DataOrigin
}

const PERIODS: Period[] = ['week', 'month', 'year']
const TIMEOUT_MS = 5000

export function toCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    color: row.color,
    sortOrder: row.sort_order,
  }
}

function toPeriod(value: string): Period {
  return PERIODS.includes(value as Period) ? (value as Period) : 'year'
}

/** `choices` er JSON i databasen. Ugyldige elementer droppes. */
function toChoices(value: unknown): Choice[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((c) =>
    c && typeof c === 'object' && typeof c.label === 'string' && Number.isFinite(Number(c.value))
      ? [{ label: c.label, value: Number(c.value) }]
      : [],
  )
}

export function toMethod(row: EmissionMethodRow): EmissionMethod {
  return {
    id: row.id,
    categoryId: row.category_id,
    name: row.name,
    question: row.question,
    period: toPeriod(row.period),
    unitLabel: row.unit_label,
    kgCo2ePerUnit: Number(row.kg_co2e_per_unit),
    choices: toChoices(row.choices),
    tip: row.tip,
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    sortOrder: row.sort_order,
  }
}

// Databasen håndhever det samme med constraints; dette er et ekstra
// sikkerhetsnett mot at en halvferdig rad knekker visningen.
function isUsableMethod(m: EmissionMethod, categoryIds: Set<string>): boolean {
  return (
    categoryIds.has(m.categoryId) &&
    PERIODS.includes(m.period) &&
    Number.isFinite(m.kgCo2ePerUnit) &&
    m.kgCo2ePerUnit >= 0 &&
    m.choices.length > 0 &&
    m.choices.every((c) => typeof c.label === 'string' && Number.isFinite(c.value) && c.value >= 0)
  )
}

const bySortOrder = <T extends { sortOrder: number; name: string }>(a: T, b: T) =>
  a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'nb')

async function fetchFromDatabase(): Promise<CalculatorData> {
  // Lastes dynamisk så Supabase-klienten ikke forsinker første visning.
  const { supabase } = await import('@/lib/supabaseClient')
  if (!supabase) throw new Error('Supabase er ikke konfigurert')

  const [categoriesRes, methodsRes, settingsRes] = await Promise.all([
    supabase.from('categories').select('*').abortSignal(AbortSignal.timeout(TIMEOUT_MS)),
    supabase.from('emission_methods').select('*').abortSignal(AbortSignal.timeout(TIMEOUT_MS)),
    supabase.from('settings').select('*').eq('id', true).abortSignal(AbortSignal.timeout(TIMEOUT_MS)).maybeSingle(),
  ])
  if (categoriesRes.error) throw categoriesRes.error
  if (methodsRes.error) throw methodsRes.error
  if (settingsRes.error) throw settingsRes.error

  const settingsRow = settingsRes.data
  if (!settingsRow || categoriesRes.data.length === 0) {
    throw new Error('Databasen er tom')
  }

  const categories = categoriesRes.data.map(toCategory).sort(bySortOrder)
  const categoryIds = new Set(categories.map((c) => c.id))
  const methods = methodsRes.data
    .map(toMethod)
    .filter((m) => isUsableMethod(m, categoryIds))
    .sort(bySortOrder)

  return {
    categories,
    methods,
    settings: {
      nationalAverageKg: Number(settingsRow.national_average_kg),
      nationalAverageSource: settingsRow.national_average_source,
      nationalAverageSourceUrl: settingsRow.national_average_source_url,
      baselineKg: Number(settingsRow.baseline_kg),
      baselineLabel: settingsRow.baseline_label,
      targetKg: settingsRow.target_kg === null ? null : Number(settingsRow.target_kg),
      targetLabel: settingsRow.target_label,
    },
  }
}

export async function loadCalculatorData(): Promise<LoadedData> {
  if (!isSupabaseConfigured) return { data: seedData, origin: 'innebygd' }
  try {
    return { data: await fetchFromDatabase(), origin: 'database' }
  } catch (error) {
    console.warn('Bruker innebygd datasett:', error)
    return { data: seedData, origin: 'innebygd' }
  }
}
