import type { Answers, CalculatorData, EmissionMethod, Period } from '@/types/calculator'

// Ren beregningslogikk – ingen React, ingen nettverk. Alt regnes om til kg CO2e per år.

export const PERIODS_PER_YEAR: Record<Period, number> = { week: 52, month: 12, year: 1 }

export const PERIOD_LABEL: Record<Period, string> = {
  week: 'per uke',
  month: 'per måned',
  year: 'per år',
}

export interface MethodResult {
  method: EmissionMethod
  kgPerYear: number
}

export interface CategoryResult {
  categoryId: string
  kgPerYear: number
}

export interface Footprint {
  /** Svarte metoder med utslipp > 0, sortert synkende. */
  methods: MethodResult[]
  categories: CategoryResult[]
  /** Summen av dine valg, uten felles utslipp. */
  personalKg: number
  baselineKg: number
  totalKg: number
  answeredCount: number
  methodCount: number
}

export function annualKg(method: EmissionMethod, choiceIndex: number): number {
  const choice = method.choices[choiceIndex]
  if (!choice) return 0
  const kg = choice.value * method.kgCo2ePerUnit * PERIODS_PER_YEAR[method.period]
  return Number.isFinite(kg) && kg > 0 ? kg : 0
}

export function computeFootprint(data: CalculatorData, answers: Answers): Footprint {
  const methods: MethodResult[] = []
  const byCategory = new Map<string, number>()
  let answeredCount = 0

  for (const method of data.methods) {
    const choiceIndex = answers[method.id]
    if (choiceIndex === undefined) continue
    answeredCount++
    const kgPerYear = annualKg(method, choiceIndex)
    if (kgPerYear === 0) continue
    methods.push({ method, kgPerYear })
    byCategory.set(method.categoryId, (byCategory.get(method.categoryId) ?? 0) + kgPerYear)
  }

  methods.sort((a, b) => b.kgPerYear - a.kgPerYear)
  const personalKg = methods.reduce((sum, m) => sum + m.kgPerYear, 0)
  const baselineKg = Math.max(0, data.settings.baselineKg)

  return {
    methods,
    categories: [...byCategory].map(([categoryId, kgPerYear]) => ({ categoryId, kgPerYear })),
    personalKg,
    baselineKg,
    totalKg: personalKg + baselineKg,
    answeredCount,
    methodCount: data.methods.length,
  }
}

/** Formaterer kg som "1,2 tonn" eller "350 kg". */
export function formatKg(kg: number): string {
  if (kg >= 1000) {
    return `${(kg / 1000).toLocaleString('nb-NO', { maximumFractionDigits: 1 })} tonn`
  }
  return `${Math.round(kg).toLocaleString('nb-NO')} kg`
}
