export function parseAdultDateOfBirth(value: unknown) {
  if (typeof value !== "string") {
    return { ok: false as const, error: "Invalid date of birth format" };
  }

  const trimmed = value.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(trimmed);
  if (!match) {
    return { ok: false as const, error: "Date of birth must use YYYY-MM-DD" };
  }

  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  if (
    !Number.isFinite(utcDate.getTime())
    || utcDate.getUTCFullYear() !== year
    || utcDate.getUTCMonth() !== month - 1
    || utcDate.getUTCDate() !== day
  ) {
    return { ok: false as const, error: "Invalid date of birth" };
  }

  const now = new Date();
  let age = now.getUTCFullYear() - year;
  const currentMonth = now.getUTCMonth() + 1;
  const currentDay = now.getUTCDate();
  if (currentMonth < month || (currentMonth === month && currentDay < day)) {
    age -= 1;
  }

  if (age < 18) {
    return { ok: false as const, error: "Must be 18+ to join", status: 403 };
  }

  return { ok: true as const, value: trimmed };
}
