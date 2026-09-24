import type { Answers, CalculatorData, EmissionMethod } from '@/types/calculator'
import { PERIODS_PER_YEAR } from './engine'

// Finner det enkle grepet som sparer mest for akkurat denne brukeren.
//
// Hver metode kan ha et «enkelt grep»: en tekst («tar én kjøretur mindre til
// jobb i uka») og hvor mange enheter det tilsvarer per periode (30 km).
// Kan metoden erstattes av en annen (rødt kjøtt → vegetar), trekkes
// erstatningens utslipp fra, så besparelsen ikke overdrives.

export interface EasyWin {
  method: EmissionMethod
  text: string
  savingKg: number
}

/** Under dette er grepet for lite til å være verdt å nevne. */
const MIN_SAVING_KG = 10

export function easyWinSaving(method: EmissionMethod, currentValue: number, replacement?: EmissionMethod): number {
  if (!method.easyWinUnits || currentValue <= 0) return 0
  // Man kan ikke kutte mer enn man faktisk gjør i dag.
  const units = Math.min(method.easyWinUnits, currentValue)
  const replacementFactor = replacement?.kgCo2ePerUnit ?? 0
  const saving = units * (method.kgCo2ePerUnit - replacementFactor) * PERIODS_PER_YEAR[method.period]
  return Number.isFinite(saving) && saving > 0 ? saving : 0
}

export function findEasyWin(data: CalculatorData, answers: Answers): EasyWin | null {
  const byId = new Map(data.methods.map((m) => [m.id, m]))
  let best: EasyWin | null = null

  for (const method of data.methods) {
    const choiceIndex = answers[method.id]
    if (choiceIndex === undefined || !method.easyWinText) continue
    const current = method.choices[choiceIndex]?.value ?? 0
    const replacement = method.easyWinReplacementId ? byId.get(method.easyWinReplacementId) : undefined
    const savingKg = easyWinSaving(method, current, replacement)
    if (savingKg >= MIN_SAVING_KG && (!best || savingKg > best.savingKg)) {
      best = { method, text: method.easyWinText, savingKg }
    }
  }
  return best
}
