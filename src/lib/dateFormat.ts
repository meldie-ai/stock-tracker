const WEEKDAYS = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
] as const;

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

/** "MORNING" before noon, "AFTERNOON" 12-5pm, "NIGHT" from 5pm onward. */
export function dayPart(date: Date): "MORNING" | "AFTERNOON" | "NIGHT" {
  const hour = date.getHours();
  if (hour < 12) return "MORNING";
  if (hour < 17) return "AFTERNOON";
  return "NIGHT";
}

/** e.g. "THURSDAY NIGHT" */
export function dayPartLabel(date: Date): string {
  return `${WEEKDAYS[date.getDay()]} ${dayPart(date)}`;
}

/** e.g. "24/07/26" — built manually to avoid locale-dependent DD/MM vs MM/DD ambiguity. */
export function formatDateDDMMYY(date: Date): string {
  const day = pad2(date.getDate());
  const month = pad2(date.getMonth() + 1);
  const year = pad2(date.getFullYear() % 100);
  return `${day}/${month}/${year}`;
}

/** e.g. "08:00AM" */
export function formatTime12(date: Date): string {
  let hours = date.getHours();
  const minutes = pad2(date.getMinutes());
  const suffix = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${pad2(hours)}:${minutes}${suffix}`;
}

/** e.g. "10pm" — compact, no minutes, used in the short header hint. */
export function formatHourCompact(date: Date): string {
  let hours = date.getHours();
  const suffix = hours >= 12 ? "pm" : "am";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${hours}${suffix}`;
}
