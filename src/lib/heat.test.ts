import { describe, expect, it } from 'vitest'
import {
  addDays,
  buildHeat,
  heatLevel,
  heatStart,
  lastMonths,
  monthLabelForWeek,
} from '@/lib/heat'

describe('addDays', () => {
  it('crosses month, year and leap-day boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2025-12-31', 1)).toBe('2026-01-01')
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29')
    expect(addDays('2025-02-28', 1)).toBe('2025-03-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
})

describe('heatLevel', () => {
  it('buckets counts into five levels capped at 4', () => {
    expect([0, 1, 2, 3, 4, 5, 40].map(heatLevel)).toEqual([0, 1, 2, 3, 4, 4, 4])
  })
  it('treats negative counts as empty', () => {
    expect(heatLevel(-1)).toBe(0)
  })
})

describe('heatStart', () => {
  it('starts on a Sunday', () => {
    // 2026-11-04 is a Wednesday; its week starts Sunday 2026-11-01.
    expect(heatStart('2026-11-04', 1)).toBe('2026-11-01')
    expect(heatStart('2026-11-01', 1)).toBe('2026-11-01')
    expect(heatStart('2026-11-04', 3)).toBe('2026-10-18')
  })
})

describe('buildHeat', () => {
  const end = '2026-11-04'
  const { cells, weekKeys, start } = buildHeat(
    [
      { date: '2026-11-04', count: 2 },
      { date: '2026-11-01', count: 9 },
      { date: '2000-01-01', count: 1 },
    ],
    end,
    2,
  )

  it('has one cell per day from the start through the end, none in the future', () => {
    expect(start).toBe('2026-10-25')
    expect(cells[0].date).toBe('2026-10-25')
    expect(cells.at(-1)?.date).toBe(end)
    expect(cells).toHaveLength(11)
  })
  it('keys each column by its Sunday', () => {
    expect(weekKeys).toEqual(['2026-10-25', '2026-11-01'])
    expect(cells.find((c) => c.date === '2026-11-04')?.week).toBe('2026-11-01')
  })
  it('applies counts and levels, ignoring dates outside the grid', () => {
    expect(cells.find((c) => c.date === end)).toMatchObject({
      count: 2,
      level: 2,
      weekday: 3,
    })
    expect(cells.find((c) => c.date === '2026-11-01')?.level).toBe(4)
    expect(cells.find((c) => c.date === '2026-10-30')?.level).toBe(0)
  })
})

describe('monthLabelForWeek', () => {
  it('labels only weeks that contain the 1st', () => {
    expect(monthLabelForWeek('2026-10-25')).toBe('')
    expect(monthLabelForWeek('2026-11-01')).toBe('Nov') // the 1st is a Sunday
    expect(monthLabelForWeek('2026-11-29')).toBe('Dec') // the 1st falls mid-week
  })
})

describe('lastMonths', () => {
  it('counts back across a year boundary, oldest first', () => {
    expect(lastMonths('2026-02-10', 4)).toEqual([
      '2025-11',
      '2025-12',
      '2026-01',
      '2026-02',
    ])
  })
})
