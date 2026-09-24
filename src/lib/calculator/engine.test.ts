import { describe, expect, it } from 'vitest'
import { seedData } from '@/data/seed'
import { annualKg, computeFootprint, formatKg } from './engine'
import { isKlimaversting, sustainabilityScore } from './score'

const method = (id: string) => {
  const m = seedData.methods.find((x) => x.id === id)
  if (!m) throw new Error(`Mangler metode ${id} i seed`)
  return m
}

describe('annualKg', () => {
  it('regner ukentlige verdier om til år', () => {
    const m = method('rodt-kjott')
    // 3 middager × faktor × 52 uker
    expect(annualKg(m, 3)).toBeCloseTo(3 * m.kgCo2ePerUnit * 52)
  })

  it('regner månedlige verdier om til år', () => {
    const m = method('klaer')
    // 1 plagg × faktor × 12 måneder
    expect(annualKg(m, 1)).toBeCloseTo(m.kgCo2ePerUnit * 12)
  })

  it('gir 0 for ugyldig valg', () => {
    expect(annualKg(method('rodt-kjott'), 99)).toBe(0)
  })
})

describe('computeFootprint', () => {
  it('uten svar er totalen lik felles utslipp', () => {
    const fp = computeFootprint(seedData, {})
    expect(fp.personalKg).toBe(0)
    expect(fp.totalKg).toBe(seedData.settings.baselineKg)
    expect(fp.answeredCount).toBe(0)
  })

  it('summerer, grupperer og sorterer verstingene først', () => {
    const fp = computeFootprint(seedData, { 'rodt-kjott': 1, 'fly-lang': 1, fossilbil: 0 })
    expect(fp.answeredCount).toBe(3)
    // «Ingen» bilkjøring gir 0 utslipp og tas ikke med i diagrammet.
    expect(fp.methods.map((m) => m.method.id)).toEqual(['fly-lang', 'rodt-kjott'])
    const fly = method('fly-lang').kgCo2ePerUnit
    const kjott = method('rodt-kjott').kgCo2ePerUnit * 52
    expect(fp.personalKg).toBeCloseTo(fly + kjott)
    expect(fp.categories.find((c) => c.categoryId === 'transport')?.kgPerYear).toBeCloseTo(fly)
  })

  it('et typisk svarsett havner i nærheten av snittet', () => {
    const typical = {
      'rodt-kjott': 2, 'hvitt-kjott': 1, fisk: 1, vegetar: 1, meieri: 2, 'ovrig-mat': 1,
      fossilbil: 2, buss: 1, 'fly-innland': 1, 'fly-europa': 1,
      boligareal: 2, oppvarming: 0, klaer: 2, mobil: 1, pc: 1, fritid: 1,
      restavfall: 1, kildesortering: 1,
    }
    const fp = computeFootprint(seedData, typical)
    const ratio = fp.totalKg / seedData.settings.nationalAverageKg
    // Et typisk svarsett skal havne nær snittet (7,8 t), ellers er faktorene skjeve.
    expect(ratio).toBeGreaterThan(0.85)
    expect(ratio).toBeLessThan(1.15)
  })
})

describe('sustainabilityScore', () => {
  it('følger den logaritmiske skalaen', () => {
    expect(sustainabilityScore(6500, 13000)).toBe(10)
    expect(sustainabilityScore(13000, 13000)).toBe(6)
    expect(sustainabilityScore(26000, 13000)).toBe(1)
    expect(sustainabilityScore(100000, 13000)).toBe(1)
  })

  it('klassifiserer 1 og 2 som klimaversting', () => {
    expect(isKlimaversting(2)).toBe(true)
    expect(isKlimaversting(3)).toBe(false)
  })

  it('tåler ugyldig snitt', () => {
    expect(sustainabilityScore(5000, 0)).toBe(10)
  })
})

describe('formatKg', () => {
  it('bruker tonn over 1000 kg', () => {
    expect(formatKg(1234)).toMatch(/1,2\s?tonn/)
    expect(formatKg(350)).toBe('350 kg')
  })
})
