import type { CalculatorData } from '@/types/calculator'

// Hver utslippsmetode får sin egen nyanse av kategorifargen, slik at metodene
// skiller seg fra hverandre i sektordiagrammet, men fortsatt hører sammen.

// Positive tall blander inn hvitt, negative blander inn svart.
const SHADE_STEPS = [0, 35, -25, 55, -40, 70, 20, -15, 45, -30]

export function shade(hex: string, step: number): string {
  if (step === 0) return hex
  const mixWith = step > 0 ? 'white' : 'black'
  return `color-mix(in oklch, ${hex}, ${mixWith} ${Math.abs(step)}%)`
}

export function buildMethodColors(data: CalculatorData): Map<string, string> {
  const colors = new Map<string, string>()
  for (const category of data.categories) {
    data.methods
      .filter((m) => m.categoryId === category.id)
      .forEach((m, i) => colors.set(m.id, shade(category.color, SHADE_STEPS[i % SHADE_STEPS.length])))
  }
  return colors
}
