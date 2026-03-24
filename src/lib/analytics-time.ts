import { getCSTDateParts } from "@/lib/timezone";

export function buildAnalyticsTimeKeys(timestamp: number) {
  const { year, month, day, hour, minute } = getCSTDateParts(timestamp);
  const paddedMonth = String(month).padStart(2, "0");
  const paddedDay = String(day).padStart(2, "0");
  const paddedHour = String(hour).padStart(2, "0");
  const paddedMinute = String(minute).padStart(2, "0");

  return {
    dayKey: `${year}-${paddedMonth}-${paddedDay}`,
    hourKey: `${year}-${paddedMonth}-${paddedDay}T${paddedHour}`,
    minuteKey: `${year}-${paddedMonth}-${paddedDay}T${paddedHour}:${paddedMinute}`,
  };
}
