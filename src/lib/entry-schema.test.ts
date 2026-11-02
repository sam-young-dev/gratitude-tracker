import { describe, expect, it } from 'vitest'
import {
  MAX_TAGS,
  MAX_TAG_LENGTH,
  cleanTags,
  entryInputSchema,
  normalizeTag,
  tagKey,
  tagNameSchema,
} from '@/lib/entry-schema'

describe('normalizeTag', () => {
  it('trims, collapses whitespace and drops leading #', () => {
    expect(normalizeTag('  Answered   prayer ')).toBe('Answered prayer')
    expect(normalizeTag('##peace')).toBe('peace')
    expect(normalizeTag('a\tb\nc')).toBe('a b c')
  })
  it('caps the length', () => {
    expect(normalizeTag('x'.repeat(100))).toHaveLength(MAX_TAG_LENGTH)
  })
  it('keeps a # that is not leading', () => {
    expect(normalizeTag('C#')).toBe('C#')
  })
})

describe('tagKey', () => {
  it('is case-insensitive and normalized', () => {
    expect(tagKey(' #Peace ')).toBe('peace')
    expect(tagKey('PEACE')).toBe(tagKey('peace'))
  })
})

describe('cleanTags', () => {
  it('de-duplicates case-insensitively, first casing wins, drops empties', () => {
    expect(cleanTags(['Peace', 'peace', ' ', '#', 'Healing', 'PEACE'])).toEqual(
      ['Peace', 'Healing'],
    )
  })
  it('preserves order', () => {
    expect(cleanTags(['b', 'a', 'c'])).toEqual(['b', 'a', 'c'])
  })
})

describe('tagNameSchema', () => {
  it('normalizes and rejects empty names', () => {
    expect(tagNameSchema.parse('  #Peace ')).toBe('Peace')
    const result = tagNameSchema.safeParse('   ')
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toBe('Enter a name for the tag.')
  })
})

describe('entryInputSchema', () => {
  const valid = {
    entryDate: '2026-11-02',
    title: 'A good day',
    body: 'Something happened.',
    tags: [],
  }
  const messages = (input: unknown) => {
    const result = entryInputSchema.safeParse(input)
    return result.success ? [] : result.error.issues.map((i) => i.message)
  }

  it('accepts a minimal entry and turns blank optional fields into null', () => {
    const out = entryInputSchema.parse({
      ...valid,
      scripture: '  ',
      outcome: '',
    })
    expect(out.scripture).toBeNull()
    expect(out.outcome).toBeNull()
  })
  it('trims text fields', () => {
    const out = entryInputSchema.parse({
      ...valid,
      title: '  Hi  ',
      scripture: ' Psalm 34:8 ',
    })
    expect(out.title).toBe('Hi')
    expect(out.scripture).toBe('Psalm 34:8')
  })
  it('requires a title and body with specific messages', () => {
    expect(messages({ ...valid, title: '   ' })).toContain(
      'Add a title so you can find this later.',
    )
    expect(messages({ ...valid, body: '' })).toContain(
      'Write what happened, even a sentence.',
    )
  })
  it('blocks dates that are not real or are too far in the future', () => {
    expect(messages({ ...valid, entryDate: '2026-02-30' })).toContain(
      'Choose a real date.',
    )
    expect(messages({ ...valid, entryDate: '2999-01-01' })).toContain(
      "Moments can’t be dated in the future.",
    )
  })
  it('allows past dates', () => {
    expect(messages({ ...valid, entryDate: '1999-12-31' })).toEqual([])
  })
  it('cleans tags and enforces the maximum after de-duplication', () => {
    const eight = Array.from({ length: MAX_TAGS }, (_, i) => `t${i}`)
    expect(messages({ ...valid, tags: eight })).toEqual([])
    expect(messages({ ...valid, tags: [...eight, 'extra'] })).toContain(
      `Use up to ${MAX_TAGS} tags.`,
    )
    // Duplicates collapse first, so these nine inputs are only eight tags.
    expect(messages({ ...valid, tags: [...eight, 'T0'] })).toEqual([])
  })
  it('enforces length limits', () => {
    expect(messages({ ...valid, title: 'x'.repeat(201) })).toContain(
      'Keep the title under 200 characters.',
    )
    expect(messages({ ...valid, scripture: 'x'.repeat(201) })).toContain(
      'Keep the Scripture reference under 200 characters.',
    )
  })
})
