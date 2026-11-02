// Pure date math for the heat map. Dates are "YYYY-MM-DD" calendar days; all
// arithmetic is done in UTC so a day can't shift with the time zone.

const DAY = 86_400_000
const pad = (n: number) => String(n).padStart(2, '0')

const toMs = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}
const fromMs = (ms: number) => {
  const d = new Date(ms)
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

export const addDays = (iso: string, days: number) =>
  fromMs(toMs(iso) + days * DAY)

/** Today in UTC. The server doesn't know the person's time zone. */
export const utcToday = () => fromMs(Date.now() - (Date.now() % DAY))

/** First day shown for a grid of `weeks` weeks ending in the week of `end` (weeks start on Sunday). */
export function heatStart(end: string, weeks: number) {
  const weekday = new Date(toMs(end)).getUTCDay()
  return addDays(end, -weekday - (weeks - 1) * 7)
}

export type HeatCell = {
  /** The Sunday that starts this cell's week. Doubles as the column key. */
  week: string
  /** 0 = Sunday. */
  weekday: number
  date: string
  count: number
  level: 0 | 1 | 2 | 3 | 4
}

export const heatLevel = (count: number): HeatCell['level'] =>
  count <= 0 ? 0 : count >= 4 ? 4 : (count as 1 | 2 | 3)

/** One cell per day from the start of the grid through `end`; no future cells. */
export function buildHeat(
  counts: ReadonlyArray<{ date: string; count: number }>,
  end: string,
  weeks: number,
) {
  const byDate = new Map(counts.map((row) => [row.date, row.count]))
  const start = heatStart(end, weeks)
  const cells: Array<HeatCell> = []
  const weekKeys: Array<string> = []
  for (let date = start; date <= end; date = addDays(date, 1)) {
    const weekday = new Date(toMs(date)).getUTCDay()
    const week = addDays(date, -weekday)
    if (weekday === 0) weekKeys.push(week)
    const count = byDate.get(date) ?? 0
    cells.push({ week, weekday, date, count, level: heatLevel(count) })
  }
  return { cells, weekKeys, start }
}

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]
export const monthShort = (month: number) => MONTHS[month - 1]

/** The month name when the week (Sunday start) contains the 1st of a month, else "". */
export function monthLabelForWeek(week: string) {
  for (let i = 0; i < 7; i++) {
    const [, m, d] = addDays(week, i).split('-').map(Number)
    if (d === 1) return monthShort(m)
  }
  return ''
}

/** The last `count` months, oldest first, as "YYYY-MM", ending at the month of `end`. */
export function lastMonths(end: string, count: number) {
  const [y, m] = end.split('-').map(Number)
  return Array.from({ length: count }, (_, i) => {
    const index = y * 12 + (m - 1) - (count - 1 - i)
    return `${Math.floor(index / 12)}-${pad((index % 12) + 1)}`
  })
}
