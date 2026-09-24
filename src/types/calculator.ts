// Domenetyper for kalkulatoren. Speiler tabellene i supabase/migrations,
// men i camelCase. Mapping skjer i src/lib/dataSource.ts.

export type Period = 'week' | 'month' | 'year'

export interface Category {
  id: string
  name: string
  description: string | null
  /** Hex-farge, f.eks. "#728f3f". Metodene i kategorien får nyanser av denne. */
  color: string
  sortOrder: number
}

// `type` (ikke interface) så den kan lagres som JSON i databasen.
export type Choice = {
  label: string
  /** Antall enheter per periode, f.eks. 3 (måltider per uke). */
  value: number
}

export interface EmissionMethod {
  id: string
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

export interface CalculatorSettings {
  /** Gjennomsnittlig årlig fotavtrykk per nordmann, kg CO2e. */
  nationalAverageKg: number
  nationalAverageSource: string | null
  nationalAverageSourceUrl: string | null
  /** Felles utslipp alle har (offentlig sektor, investeringer), kg CO2e/år. */
  baselineKg: number
  baselineLabel: string
}

export interface CalculatorData {
  categories: Category[]
  methods: EmissionMethod[]
  settings: CalculatorSettings
}

/** Svar per metode-id: indeks i `choices`. Ubesvart = mangler i objektet. */
export type Answers = Record<string, number>
