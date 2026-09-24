import type { Answers, CalculatorData } from '@/types/calculator'

// Kategoriene låses opp én etter én: neste vises først når alle spørsmålene i
// den forrige er besvart. Kategorier uten spørsmål regnes som ferdige.

/** Hvor mange kategorier (fra toppen) som er synlige. Alltid minst én. */
export function unlockedCategoryCount(data: CalculatorData, answers: Answers): number {
  const firstIncomplete = data.categories.findIndex((category) =>
    data.methods.some((m) => m.categoryId === category.id && answers[m.id] === undefined),
  )
  if (firstIncomplete === -1) return data.categories.length
  return Math.max(1, firstIncomplete + 1)
}
