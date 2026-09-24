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
  /** Gjennomsnittlig årlig livsstilsfotavtrykk per nordmann, kg CO2e. */
  nationalAverageKg: number
  nationalAverageSource: string | null
  nationalAverageSourceUrl: string | null
  /** Fast tillegg alle får, uansett svar (tjenester som helse og utdanning), kg CO2e/år. */
  baselineKg: number
  baselineLabel: string
  /** Klimamål å sammenligne med, f.eks. 1,5-gradersmålet. Vises som egen strek i tanken. */
  targetKg: number | null
  targetLabel: string | null
}

export interface CalculatorData {
  categories: Category[]
  methods: EmissionMethod[]
  settings: CalculatorSettings
}

/** Svar per metode-id: indeks i `choices`. Ubesvart = mangler i objektet. */
export type Answers = Record<string, number>
