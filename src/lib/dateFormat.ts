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
  weekdayName: string; // e.g. "Sunday"
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
    weekdayName: map.weekday,
  };
}

/** "morning" before noon, "afternoon" 12-5pm, "night" from 5pm onward. */
function dayPart(hour: number): "morning" | "afternoon" | "night" {
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "night";
}

/** e.g. "Sunday morning" */
export function dayPartLabel(date: Date): string {
  const { weekdayName, hour } = getShopLocalParts(date);
  return `${weekdayName} ${dayPart(hour)}`;
}

const ISO_WEEKDAY: Record<string, number> = {
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
  Sunday: 7,
};

// Shop-local instant expressed as the equivalent UTC instant. Safe as a fixed offset
// year-round since Queensland doesn't observe daylight saving.
const SHOP_UTC_OFFSET_HOURS = 10;
function shopLocalInstantUtc(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0
): Date {
  return new Date(Date.UTC(year, month - 1, day, hour, minute) - SHOP_UTC_OFFSET_HOURS * 60 * 60 * 1000);
}

function shopLocalMidnightUtc(year: number, month: number, day: number): Date {
  return shopLocalInstantUtc(year, month, day);
}

/**
 * The most recently *completed* Monday-Sunday week in shop-local time. Regardless of which
 * day it's checked, this always looks back to the last full week, not the in-progress one —
 * e.g. checked on a Wednesday, it returns the Monday-Sunday that ended the Sunday before last.
 * `until` is exclusive (this week's Monday 00:00), so pair with `startedAt: { gte, lt }`.
 */
export function getLastCompletedWeekRange(now: Date = new Date()): { since: Date; until: Date } {
  const { year, month, day, weekdayName } = getShopLocalParts(now);
  const todayMidnightUtc = shopLocalMidnightUtc(year, month, day);
  const daysSinceMonday = ISO_WEEKDAY[weekdayName] - 1;
  const thisWeekMonday = new Date(todayMidnightUtc.getTime() - daysSinceMonday * 24 * 60 * 60 * 1000);
  const lastWeekMonday = new Date(thisWeekMonday.getTime() - 7 * 24 * 60 * 60 * 1000);
  return { since: lastWeekMonday, until: thisWeekMonday };
}

/** e.g. "24/07/26" — built manually to avoid locale-dependent DD/MM vs MM/DD ambiguity. */
export function formatDateDDMMYY(date: Date): string {
  const { day, month, year } = getShopLocalParts(date);
  return `${pad2(day)}/${pad2(month)}/${pad2(year % 100)}`;
}

/** e.g. "2026-07-24" — the format native <input type="date"> elements use. */
export function formatDateInputValue(date: Date): string {
  const { year, month, day } = getShopLocalParts(date);
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/** Parses a date-input value ("YYYY-MM-DD") as shop-local midnight. Null if malformed. */
export function parseShopLocalDateInput(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, y, m, d] = match;
  const date = shopLocalMidnightUtc(Number(y), Number(m), Number(d));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Shop-local midnight of the day after the given date — a convenient exclusive upper bound. */
export function shopLocalStartOfNextDay(date: Date): Date {
  const { year, month, day } = getShopLocalParts(date);
  return new Date(shopLocalMidnightUtc(year, month, day).getTime() + 24 * 60 * 60 * 1000);
}

/** e.g. "2026-07-24T14:30" — the format native <input type="datetime-local"> elements use. */
export function formatDateTimeInputValue(date: Date): string {
  const { year, month, day, hour, minute } = getShopLocalParts(date);
  return `${year}-${pad2(month)}-${pad2(day)}T${pad2(hour)}:${pad2(minute)}`;
}

/** Parses a datetime-local input value ("YYYY-MM-DDTHH:mm") as an exact shop-local instant. Null if malformed. */
export function parseShopLocalDateTimeInput(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [, y, mo, d, h, mi] = match;
  const date = shopLocalInstantUtc(Number(y), Number(mo), Number(d), Number(h), Number(mi));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** e.g. "08:00AM" */
export function formatTime12(date: Date): string {
  const { hour, minute } = getShopLocalParts(date);
  const suffix = hour >= 12 ? "PM" : "AM";
  let h12 = hour % 12;
  if (h12 === 0) h12 = 12;
  return `${pad2(h12)}:${pad2(minute)}${suffix}`;
}
