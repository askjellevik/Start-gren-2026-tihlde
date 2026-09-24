import { describe, expect, it } from 'vitest'
import { seedData } from '@/data/seed'
import type { Answers } from '@/types/calculator'
import { unlockedCategoryCount } from './progress'

const answerAll = (categoryId: string): Answers =>
  Object.fromEntries(seedData.methods.filter((m) => m.categoryId === categoryId).map((m) => [m.id, 0]))

describe('unlockedCategoryCount', () => {
  it('viser bare første kategori ved start', () => {
    expect(unlockedCategoryCount(seedData, {})).toBe(1)
  })

  it('holder neste kategori skjult til alt i den forrige er besvart', () => {
    const [first] = seedData.methods.filter((m) => m.categoryId === 'mat')
    expect(unlockedCategoryCount(seedData, { [first.id]: 0 })).toBe(1)
  })

  it('låser opp neste kategori når den forrige er ferdig', () => {
    expect(unlockedCategoryCount(seedData, answerAll('mat'))).toBe(2)
    expect(unlockedCategoryCount(seedData, { ...answerAll('mat'), ...answerAll('transport') })).toBe(3)
  })

  it('viser alle når alt er besvart', () => {
    const all = Object.fromEntries(seedData.methods.map((m) => [m.id, 0]))
    expect(unlockedCategoryCount(seedData, all)).toBe(seedData.categories.length)
  })

  it('hopper over kategorier uten spørsmål', () => {
    const data = {
      ...seedData,
      categories: [
        seedData.categories[0],
        { id: 'tom', name: 'Tom', description: null, color: '#000000', sortOrder: 2 },
        ...seedData.categories.slice(1),
      ],
    }
    expect(unlockedCategoryCount(data, answerAll('mat'))).toBe(3)
  })
})
