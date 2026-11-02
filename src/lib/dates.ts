// Entry dates are calendar days ("YYYY-MM-DD"), never instants. Everything here
// avoids Date parsing in the local time zone so a day can't shift.

const pad = (n: number) => String(n).padStart(2, '0')

export function toIsoDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Today's date in the browser's time zone. Call on the client only. */
export function todayLocal() {
  return toIsoDate(new Date())
}

export function isRealDate(iso: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!match) return false
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const date = new Date(Date.UTC(y, m - 1, d))
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  )
}

/** A `?day=` or `?date=` search param: the day if it's a real calendar day, else undefined. */
export function parseDayParam(value: unknown) {
  return typeof value === 'string' && isRealDate(value) ? value : undefined
}

function parts(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

export function formatEntryDate(iso: string, style: 'long' | 'short' = 'long') {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    ...(style === 'long'
      ? { dateStyle: 'long' as const }
      : {
          month: 'short' as const,
          day: 'numeric' as const,
          year: 'numeric' as const,
        }),
  }).format(parts(iso))
}

/**
 * Latest date the server will accept. The server doesn't know the person's time
 * zone, so it allows tomorrow-in-UTC to cover people ahead of UTC; the form
 * enforces the exact "not in the future" rule in the browser's time zone.
 */
export function latestAcceptedDate(now = new Date()) {
  const next = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  )
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`
}
