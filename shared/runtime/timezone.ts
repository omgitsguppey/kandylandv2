export const APP_TIMEZONE = "America/Chicago"

type CentralDateParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

const CENTRAL_DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
})

const CENTRAL_OFFSET_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TIMEZONE,
  timeZoneName: "shortOffset",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
})

function pad(value: number): string {
  return String(value).padStart(2, "0")
}

function buildComparableUtc(parts: Pick<CentralDateParts, "year" | "month" | "day" | "hour" | "minute" | "second">) {
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
}

function extractCentralDateParts(date: Date): CentralDateParts {
  const parts = CENTRAL_DATE_TIME_FORMATTER.formatToParts(date)
  const lookup = (type: Intl.DateTimeFormatPartTypes, fallback: number) => {
    const raw = parts.find((part) => part.type === type)?.value
    const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN
    return Number.isFinite(parsed) ? parsed : fallback
  }

  return {
    year: lookup("year", 1970),
    month: lookup("month", 1),
    day: lookup("day", 1),
    hour: lookup("hour", 0),
    minute: lookup("minute", 0),
    second: lookup("second", 0),
  }
}

function parseCentralOffsetMs(utcTimestamp: number): number {
  const parts = CENTRAL_OFFSET_FORMATTER.formatToParts(new Date(utcTimestamp))
  const offsetLabel = parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT+0"
  const match = offsetLabel.match(/^GMT(?:([+-])(\d{1,2})(?::?(\d{2}))?)?$/u)
  if (!match) {
    return 0
  }

  const sign = match[1] === "-" ? -1 : 1
  const hours = Number.parseInt(match[2] ?? "0", 10)
  const minutes = Number.parseInt(match[3] ?? "0", 10)
  return sign * ((hours * 60) + minutes) * 60 * 1000
}

function resolveCentralLocalToUtc(parts: Pick<CentralDateParts, "year" | "month" | "day" | "hour" | "minute" | "second">): number {
  const targetComparable = buildComparableUtc(parts)
  let utcTimestamp = targetComparable - parseCentralOffsetMs(targetComparable)

  for (let iteration = 0; iteration < 5; iteration += 1) {
    const actual = extractCentralDateParts(new Date(utcTimestamp))
    const diffMs = targetComparable - buildComparableUtc(actual)
    if (diffMs === 0) {
      return utcTimestamp
    }
    utcTimestamp += diffMs
  }

  return utcTimestamp
}

function shiftCentralDate(parts: Pick<CentralDateParts, "year" | "month" | "day">, dayDelta: number) {
  const shifted = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + dayDelta, 12, 0, 0))
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  }
}

export function getCSTDateParts(utcTimestamp: number) {
  return extractCentralDateParts(new Date(utcTimestamp))
}

export function getCSTDateKey(utcTimestamp: number): string {
  const {year, month, day} = getCSTDateParts(utcTimestamp)
  return `${year}-${pad(month)}-${pad(day)}`
}

export function shiftCSTDateKey(dateKey: string, dayDelta: number): string {
  const [year, month, day] = dateKey.split("-").map(Number)
  const shifted = shiftCentralDate({year, month, day}, dayDelta)
  return `${shifted.year}-${pad(shifted.month)}-${pad(shifted.day)}`
}

export function toCSTString(timestamp: number): string {
  const {year, month, day, hour, minute} = getCSTDateParts(timestamp)
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}`
}

export function fromCSTInput(datetimeLocal: string): number {
  const match = datetimeLocal.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/u)
  if (!match) {
    return Number.NaN
  }

  const year = Number.parseInt(match[1], 10)
  const month = Number.parseInt(match[2], 10)
  const day = Number.parseInt(match[3], 10)
  const hour = Number.parseInt(match[4], 10)
  const minute = Number.parseInt(match[5], 10)
  return resolveCentralLocalToUtc({
    year,
    month,
    day,
    hour,
    minute,
    second: 0,
  })
}

export function getCSTDayBoundaries(utcTimestamp: number): {startOfDay: number; endOfDay: number} {
  const {year, month, day} = getCSTDateParts(utcTimestamp)
  const nextDay = shiftCentralDate({year, month, day}, 1)

  const startOfDay = resolveCentralLocalToUtc({
    year,
    month,
    day,
    hour: 0,
    minute: 0,
    second: 0,
  })
  const endOfDay = resolveCentralLocalToUtc({
    year: nextDay.year,
    month: nextDay.month,
    day: nextDay.day,
    hour: 0,
    minute: 0,
    second: 0,
  })

  return {startOfDay, endOfDay}
}

export function isSameCSTDay(timestamp: number, compareTo: number): boolean {
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return false
  }

  const {startOfDay, endOfDay} = getCSTDayBoundaries(compareTo)
  return timestamp >= startOfDay && timestamp < endOfDay
}

export function isPreviousCSTDay(timestamp: number, compareTo: number): boolean {
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return false
  }

  const {year, month, day} = getCSTDateParts(compareTo)
  const previousDay = shiftCentralDate({year, month, day}, -1)
  const previousDayStart = resolveCentralLocalToUtc({
    year: previousDay.year,
    month: previousDay.month,
    day: previousDay.day,
    hour: 0,
    minute: 0,
    second: 0,
  })
  const currentDayStart = resolveCentralLocalToUtc({
    year,
    month,
    day,
    hour: 0,
    minute: 0,
    second: 0,
  })

  return timestamp >= previousDayStart && timestamp < currentDayStart
}

export function getDefaultCSTDates(): {validFrom: string; validUntil: string} {
  const now = Date.now()
  const weekFromNow = now + 7 * 24 * 60 * 60 * 1000
  return {
    validFrom: toCSTString(now),
    validUntil: toCSTString(weekFromNow),
  }
}
