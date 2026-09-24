import { describe, expect, it } from 'vitest'
import { seedData } from '@/data/seed'
import { findEasyWin } from './easyWin'

const method = (id: string) => {
  const m = seedData.methods.find((x) => x.id === id)
  if (!m) throw new Error(`Mangler metode ${id} i seed`)
  return m
}
const indexOf = (id: string, label: string) => method(id).choices.findIndex((c) => c.label === label)

describe('findEasyWin', () => {
  it('foreslår én kjøretur mindre for en som kjører til jobb', () => {
    const win = findEasyWin(seedData, { fossilbil: indexOf('fossilbil', 'Til og fra jobb (ca. 150 km)') })
    expect(win?.method.id).toBe('fossilbil')
    // 30 km × bensinbil (sykkel erstatter, 0 utslipp) × 52 uker
    expect(win?.savingKg).toBeCloseTo(30 * method('fossilbil').kgCo2ePerUnit * 52)
  })

  it('trekker fra utslippet til erstatningen', () => {
    const win = findEasyWin(seedData, { 'rodt-kjott': indexOf('rodt-kjott', '3 ganger') })
    const expected = (method('rodt-kjott').kgCo2ePerUnit - method('vegetar').kgCo2ePerUnit) * 52
    expect(win?.savingKg).toBeCloseTo(expected)
  })

  it('kutter aldri mer enn brukeren faktisk gjør', () => {
    // «Litt» er 25 km, mindre enn grepets 30 km.
    const win = findEasyWin(seedData, { fossilbil: indexOf('fossilbil', 'Litt (ca. 25 km)') })
    expect(win?.savingKg).toBeCloseTo(25 * method('fossilbil').kgCo2ePerUnit * 52)
  })

  it('velger grepet som sparer mest', () => {
    const win = findEasyWin(seedData, {
      klaer: indexOf('klaer', '1'),
      fossilbil: indexOf('fossilbil', 'Mye (ca. 400 km)'),
    })
    expect(win?.method.id).toBe('fossilbil')
  })

  it('gir ingenting når brukeren allerede er på null', () => {
    expect(findEasyWin(seedData, { fossilbil: indexOf('fossilbil', 'Ingen'), 'rodt-kjott': indexOf('rodt-kjott', 'Aldri') })).toBeNull()
  })
})
