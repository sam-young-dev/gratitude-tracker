import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  formatEntryDate,
  isRealDate,
  latestAcceptedDate,
  parseDayParam,
  toIsoDate,
  todayLocal,
} from '@/lib/dates'

afterEach(() => vi.useRealTimers())

describe('isRealDate', () => {
  it('accepts real calendar days, including a leap day', () => {
    expect(isRealDate('2026-11-02')).toBe(true)
    expect(isRealDate('2024-02-29')).toBe(true)
  })
  it('rejects impossible and malformed dates', () => {
    expect(isRealDate('2025-02-29')).toBe(false)
    expect(isRealDate('2026-13-01')).toBe(false)
    expect(isRealDate('2026-04-31')).toBe(false)
    expect(isRealDate('2026-1-2')).toBe(false)
    expect(isRealDate('')).toBe(false)
    expect(isRealDate('2026-11-02T00:00:00Z')).toBe(false)
  })
})

describe('parseDayParam', () => {
  it('keeps a real calendar day', () => {
    expect(parseDayParam('2026-10-14')).toBe('2026-10-14')
  })
  it('drops anything that is not a real calendar day', () => {
    expect(parseDayParam('2026-02-30')).toBeUndefined()
    expect(parseDayParam('yesterday')).toBeUndefined()
    expect(parseDayParam('')).toBeUndefined()
    expect(parseDayParam(20261014)).toBeUndefined()
    expect(parseDayParam(undefined)).toBeUndefined()
  })
})

describe('toIsoDate / todayLocal', () => {
  it('uses the local calendar day, not the UTC one', () => {
    // Local-time constructor: late evening stays on the same local day in any zone.
    expect(toIsoDate(new Date(2026, 10, 2, 23, 30))).toBe('2026-11-02')
    expect(toIsoDate(new Date(2026, 10, 2, 0, 5))).toBe('2026-11-02')
  })
  it('todayLocal follows the clock', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 0, 1, 23, 59))
    expect(todayLocal()).toBe('2026-01-01')
  })
})

describe('formatEntryDate', () => {
  it('never shifts the day, whatever the time zone', () => {
    expect(formatEntryDate('2026-03-04')).toBe('March 4, 2026')
    expect(formatEntryDate('2026-01-01', 'short')).toBe('Jan 1, 2026')
    expect(formatEntryDate('2026-12-31', 'short')).toBe('Dec 31, 2026')
  })
})

describe('latestAcceptedDate', () => {
  it('is tomorrow in UTC, so people ahead of UTC can save late-night moments', () => {
    expect(latestAcceptedDate(new Date('2026-11-02T23:30:00Z'))).toBe(
      '2026-11-03',
    )
    expect(latestAcceptedDate(new Date('2026-11-02T00:00:00Z'))).toBe(
      '2026-11-03',
    )
  })
  it('rolls over month and year ends', () => {
    expect(latestAcceptedDate(new Date('2026-12-31T12:00:00Z'))).toBe(
      '2027-01-01',
    )
    expect(latestAcceptedDate(new Date('2026-02-28T12:00:00Z'))).toBe(
      '2026-03-01',
    )
  })
})
