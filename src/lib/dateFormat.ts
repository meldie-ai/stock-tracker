// The server (Vercel) runs in UTC regardless of where it's deployed, so raw
// Date.getHours()/getDate()/etc. would show server time, not the shop's local
// time. Always extract date/time parts via this shop-timezone-aware helper
// instead. Queensland doesn't observe daylight saving, so this offset is
// stable year-round.
const SHOP_TIMEZONE = "Australia/Brisbane";

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

type ShopLocalParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekdayName: string; // e.g. "THURSDAY"
};

function getShopLocalParts(date: Date): ShopLocalParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: SHOP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "long",
  });

  const map: Record<string, string> = {};
  for (const part of formatter.formatToParts(date)) {
    map[part.type] = part.value;
  }

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: map.hour === "24" ? 0 : Number(map.hour),
    minute: Number(map.minute),
    weekdayName: map.weekday.toUpperCase(),
  };
}

/** "MORNING" before noon, "AFTERNOON" 12-5pm, "NIGHT" from 5pm onward. */
function dayPart(hour: number): "MORNING" | "AFTERNOON" | "NIGHT" {
  if (hour < 12) return "MORNING";
  if (hour < 17) return "AFTERNOON";
  return "NIGHT";
}

/** e.g. "THURSDAY NIGHT" */
export function dayPartLabel(date: Date): string {
  const { weekdayName, hour } = getShopLocalParts(date);
  return `${weekdayName} ${dayPart(hour)}`;
}

/** e.g. "24/07/26" — built manually to avoid locale-dependent DD/MM vs MM/DD ambiguity. */
export function formatDateDDMMYY(date: Date): string {
  const { day, month, year } = getShopLocalParts(date);
  return `${pad2(day)}/${pad2(month)}/${pad2(year % 100)}`;
}

/** e.g. "08:00AM" */
export function formatTime12(date: Date): string {
  const { hour, minute } = getShopLocalParts(date);
  const suffix = hour >= 12 ? "PM" : "AM";
  let h12 = hour % 12;
  if (h12 === 0) h12 = 12;
  return `${pad2(h12)}:${pad2(minute)}${suffix}`;
}

/** e.g. "10pm" — compact, no minutes, used in the short header hint. */
export function formatHourCompact(date: Date): string {
  const { hour } = getShopLocalParts(date);
  const suffix = hour >= 12 ? "pm" : "am";
  let h12 = hour % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}${suffix}`;
}
