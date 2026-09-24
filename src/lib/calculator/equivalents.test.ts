import { describe, expect, it } from 'vitest'
import { formatArea, seaIceM2, shareOfBudget } from './equivalents'

describe('seaIceM2', () => {
  it('gir 3 m² per tonn', () => {
    expect(seaIceM2(1000)).toBe(3)
    expect(seaIceM2(367)).toBeCloseTo(1.1, 1)
  })
})

describe('formatArea', () => {
  it('bruker m² for store og cm² for små flater', () => {
    expect(formatArea(1.101)).toMatch(/^1,1\s?m²$/)
    expect(formatArea(0.03)).toBe('300 cm²')
  })
})

describe('shareOfBudget', () => {
  it('bruker brøk når den passer', () => {
    expect(shareOfBudget(367, 1100)).toBe('en tredjedel av')
    expect(shareOfBudget(550, 1100)).toBe('halvparten av')
  })
  it('bruker prosent ellers', () => {
    expect(shareOfBudget(66, 1100)).toBe('6 % av')
  })
  it('håndterer besparelser større enn budsjettet', () => {
    expect(shareOfBudget(1100, 1100)).toBe('omtrent like mye som')
    expect(shareOfBudget(3300, 1100)).toBe('3 ganger så mye som')
  })
})
