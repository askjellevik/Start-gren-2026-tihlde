// Bærekraftsscore 1–10 ut fra forholdet mellom ditt og snittets fotavtrykk.
//
// Logaritmisk skala: halvparten av snittet og dobbelt så mye som snittet er like
// langt fra midten.
//   ≤ 0,5 × snittet → 10
//   = snittet       → 6 (5,5 avrundet)
//   ≥ 2 × snittet   → 1

export const KLIMAVERSTING_MAX_SCORE = 2

export function sustainabilityScore(totalKg: number, averageKg: number): number {
  if (!(averageKg > 0) || !(totalKg > 0)) return 10
  const ratio = totalKg / averageKg
  const raw = 5.5 - 4.5 * Math.log2(ratio)
  return Math.min(10, Math.max(1, Math.round(raw)))
}

export function isKlimaversting(score: number): boolean {
  return score <= KLIMAVERSTING_MAX_SCORE
}

export function scoreHeadline(score: number): string {
  if (score >= 9) return 'Klimahelt!'
  if (score >= 7) return 'Godt under snittet'
  if (score >= 5) return 'Rundt snittet'
  if (score >= 3) return 'Over snittet'
  return 'Klimaversting'
}
