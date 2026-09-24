import { describe, expect, it } from 'vitest'
import { parseNumber, validateCategory, validateMethod, type MethodDraft } from './validation'

const validMethod: MethodDraft = {
  categoryId: 'mat',
  name: 'Ost',
  question: 'Hvor mye ost spiser du?',
  period: 'week',
  unitLabel: 'skive',
  kgCo2ePerUnit: '0,3',
  choices: [{ label: 'Ingen', value: '0' }, { label: 'Mye', value: '10' }],
  tip: '',
  sourceName: '',
  sourceUrl: '',
  sortOrder: '1',
}

describe('parseNumber', () => {
  it('godtar komma og punktum', () => {
    expect(parseNumber('1,5')).toBe(1.5)
    expect(parseNumber('1.5')).toBe(1.5)
    expect(parseNumber('13 000')).toBe(13000)
  })
  it('avviser tekst', () => {
    expect(parseNumber('abc')).toBeNull()
    expect(parseNumber('')).toBeNull()
    expect(parseNumber('1e5')).toBeNull()
  })
})

describe('validateMethod', () => {
  it('godtar et gyldig skjema', () => {
    const { errors, choices } = validateMethod(validMethod)
    expect(errors).toEqual({})
    expect(choices).toEqual([{ label: 'Ingen', value: 0 }, { label: 'Mye', value: 10 }])
  })

  it('avviser negative faktorer og valg', () => {
    expect(validateMethod({ ...validMethod, kgCo2ePerUnit: '-1' }).errors.kgCo2ePerUnit).toBeDefined()
    expect(
      validateMethod({ ...validMethod, choices: [{ label: 'x', value: '-2' }] }).errors.choices,
    ).toBeDefined()
  })

  it('avviser lenker som ikke er https', () => {
    expect(validateMethod({ ...validMethod, sourceUrl: 'javascript:alert(1)' }).errors.sourceUrl).toBeDefined()
    expect(validateMethod({ ...validMethod, sourceUrl: 'http://ssb.no' }).errors.sourceUrl).toBeDefined()
    expect(validateMethod({ ...validMethod, sourceUrl: 'https://ssb.no' }).errors.sourceUrl).toBeUndefined()
  })
})

describe('validateCategory', () => {
  it('krever gyldig farge', () => {
    expect(validateCategory({ name: 'X', description: '', color: 'red', sortOrder: '1' }).color).toBeDefined()
  })
})
