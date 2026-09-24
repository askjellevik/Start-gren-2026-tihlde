// Setter en besparelse i kontekst, så «367 kg» blir noe man kan se for seg.

/**
 * Hvert tonn CO2 som slippes ut fører til varig tap av ca. 3 m² arktisk
 * sommeris (september). Notz & Stroeve (2016), Science 354(6313).
 */
export const SEA_ICE_M2_PER_TONNE = 3
export const SEA_ICE_SOURCE_URL = 'https://www.science.org/doi/10.1126/science.aag2345'

export function seaIceM2(kg: number): number {
  return (kg / 1000) * SEA_ICE_M2_PER_TONNE
}

/** «1,1 m²» eller «600 cm²» for små flater. */
export function formatArea(m2: number): string {
  if (m2 >= 0.1) return `${m2.toLocaleString('nb-NO', { maximumFractionDigits: 1 })} m²`
  return `${(Math.round((m2 * 10000) / 50) * 50).toLocaleString('nb-NO')} cm²`
}

const FRACTIONS: [number, string][] = [
  [1 / 10, 'en tidel'],
  [1 / 8, 'en åttendedel'],
  [1 / 5, 'en femtedel'],
  [1 / 4, 'en fjerdedel'],
  [1 / 3, 'en tredjedel'],
  [1 / 2, 'halvparten'],
  [2 / 3, 'to tredjedeler'],
  [3 / 4, 'tre fjerdedeler'],
]

/** Hvor stor del av klimabudsjettet besparelsen er, i ord: «en tredjedel», «12 %», «dobbelt så mye som». */
export function shareOfBudget(kg: number, budgetKg: number): string {
  const ratio = kg / budgetKg
  if (ratio >= 1.9) return `${Math.round(ratio).toLocaleString('nb-NO')} ganger så mye som`
  if (ratio >= 0.9) return 'omtrent like mye som'
  // Bruk en brøk hvis den treffer innenfor 12 %, ellers prosent.
  const closest = FRACTIONS.reduce((best, f) =>
    Math.abs(f[0] - ratio) < Math.abs(best[0] - ratio) ? f : best,
  )
  if (Math.abs(closest[0] - ratio) / closest[0] <= 0.12) return `${closest[1]} av`
  return `${Math.max(1, Math.round(ratio * 100))} % av`
}
