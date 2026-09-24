import { supabase } from '@/lib/supabaseClient'
import { toCategory, toMethod } from '@/lib/dataSource'
import type { CalculatorSettings, Category, Choice, EmissionMethod, Period } from '@/types/calculator'

// Alle skrivekall fra adminpanelet. RLS i databasen avgjør om de lykkes.

function client() {
  if (!supabase) throw new Error('Supabase er ikke konfigurert')
  return supabase
}

/** Gjør databasefeil om til forståelige meldinger uten å lekke detaljer. */
export function describeError(error: unknown): string {
  const code = (error as { code?: string })?.code
  if (code === '23505') return 'Det finnes allerede en oppføring med samme id.'
  if (code === '23514') return 'Verdiene ble avvist av databasen. Sjekk at alle felt er gyldige.'
  if (code === '42501') return 'Du har ikke tilgang til å gjøre denne endringen.'
  if (code === 'PGRST116') return 'Fant ikke oppføringen, eller du mangler tilgang.'
  return 'Noe gikk galt. Prøv igjen, eller last siden på nytt.'
}

export async function fetchAdminData() {
  const db = client()
  const [categories, methods, settings] = await Promise.all([
    db.from('categories').select('*').order('sort_order'),
    db.from('emission_methods').select('*').order('sort_order'),
    db.from('settings').select('*').eq('id', true).maybeSingle(),
  ])
  if (categories.error) throw categories.error
  if (methods.error) throw methods.error
  if (settings.error) throw settings.error
  return {
    categories: categories.data.map(toCategory),
    methods: methods.data.map(toMethod),
    settings: settings.data,
  }
}

export interface MethodInput {
  categoryId: string
  name: string
  question: string
  period: Period
  unitLabel: string
  kgCo2ePerUnit: number
  choices: Choice[]
  tip: string | null
  sourceName: string | null
  sourceUrl: string | null
  sortOrder: number
}

function methodRow(m: MethodInput) {
  return {
    category_id: m.categoryId,
    name: m.name,
    question: m.question,
    period: m.period,
    unit_label: m.unitLabel,
    kg_co2e_per_unit: m.kgCo2ePerUnit,
    choices: m.choices,
    tip: m.tip,
    source_name: m.sourceName,
    source_url: m.sourceUrl,
    sort_order: m.sortOrder,
  }
}

/** Oppdaterer når id er satt, ellers opprettes en ny metode. */
export async function saveMethod(id: string | undefined, input: MethodInput): Promise<EmissionMethod> {
  const db = client()
  const query = id
    ? db.from('emission_methods').update(methodRow(input)).eq('id', id)
    : db.from('emission_methods').insert(methodRow(input))
  // .single() feiler hvis RLS stoppet endringen (0 rader), så vi merker det.
  const { data, error } = await query.select().single()
  if (error) throw error
  return toMethod(data)
}

export async function deleteMethod(id: string): Promise<void> {
  const { data, error } = await client().from('emission_methods').delete().eq('id', id).select('id')
  if (error) throw error
  if (!data?.length) throw { code: 'PGRST116' }
}

export interface CategoryInput {
  name: string
  description: string | null
  color: string
  sortOrder: number
}

export async function saveCategory(id: string | undefined, input: CategoryInput): Promise<Category> {
  const db = client()
  const row = {
    name: input.name,
    description: input.description,
    color: input.color,
    sort_order: input.sortOrder,
  }
  const query = id ? db.from('categories').update(row).eq('id', id) : db.from('categories').insert(row)
  const { data, error } = await query.select().single()
  if (error) throw error
  return toCategory(data)
}

/** Sletter kategorien og (via ON DELETE CASCADE) alle metodene i den. */
export async function deleteCategory(id: string): Promise<void> {
  const { data, error } = await client().from('categories').delete().eq('id', id).select('id')
  if (error) throw error
  if (!data?.length) throw { code: 'PGRST116' }
}

export async function saveSettings(input: CalculatorSettings): Promise<void> {
  const { data, error } = await client()
    .from('settings')
    .update({
      national_average_kg: input.nationalAverageKg,
      national_average_source: input.nationalAverageSource,
      national_average_source_url: input.nationalAverageSourceUrl,
      baseline_kg: input.baselineKg,
      baseline_label: input.baselineLabel,
    })
    .eq('id', true)
    .select('id')
  if (error) throw error
  if (!data?.length) throw { code: 'PGRST116' }
}
