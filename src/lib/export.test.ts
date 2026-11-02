import { describe, expect, it } from 'vitest'
import { exportFilename, toJson, toMarkdown } from '@/lib/export'
import type { ExportedEntry } from '@/lib/export'

const oldest: ExportedEntry = {
  entryDate: '2026-01-05',
  title: 'First',
  body: 'First body.\n\nSecond paragraph.',
  scripture: 'Psalm 34:8',
  outcome: 'It worked out.',
  tags: ['Peace', 'Healing'],
}
const newest: ExportedEntry = {
  entryDate: '2026-02-01',
  title: 'Second',
  body: 'Just a body.',
  scripture: null,
  outcome: null,
  tags: [],
}

describe('exportFilename', () => {
  it('names files by day and extension', () => {
    expect(exportFilename('json', '2026-11-02')).toBe(
      'moment-tracker-2026-11-02.json',
    )
    expect(exportFilename('md', '2026-11-02')).toBe(
      'moment-tracker-2026-11-02.md',
    )
  })
})

describe('toJson', () => {
  it('round-trips the entries and the export time', () => {
    const parsed = JSON.parse(toJson([oldest, newest], '2026-11-02T10:00:00Z'))
    expect(parsed.exportedAt).toBe('2026-11-02T10:00:00Z')
    expect(parsed.entries).toEqual([oldest, newest])
  })
})

describe('toMarkdown', () => {
  const input = [oldest, newest]
  const md = toMarkdown(input, '2026-11-02T10:00:00Z')

  it('has a header with the date and a pluralized count', () => {
    expect(md).toContain('Exported 2026-11-02 · 2 moments')
    expect(toMarkdown([newest], '2026-11-02T10:00:00Z')).toContain(
      '· 1 moment\n',
    )
    expect(toMarkdown([], '2026-11-02T10:00:00Z')).toContain('· 0 moments')
  })
  it('lists the newest moment first without reordering the input', () => {
    expect(md.indexOf('## Second')).toBeLessThan(md.indexOf('## First'))
    expect(input[0]).toBe(oldest)
  })
  it('includes optional parts only when present', () => {
    expect(md).toContain('Tags: Peace, Healing')
    expect(md).toContain('Scripture: Psalm 34:8')
    expect(md).toContain('### How it turned out\n\nIt worked out.')
    expect(md.match(/How it turned out/g)).toHaveLength(1)
    expect(md.match(/Tags:/g)).toHaveLength(1)
  })
  it('ends with a single newline', () => {
    expect(md.endsWith('\n')).toBe(true)
    expect(md.endsWith('\n\n')).toBe(false)
  })
})
