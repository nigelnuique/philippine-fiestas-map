/**
 * Parses festival dates from TPB/Wikipedia dateVenueRaw strings.
 * Fills month/dayStart/dayEnd when missing; never overwrites existing values.
 */

const MONTH_NAMES = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

const MONTH_ABBREV = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  sept: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

const MONTH_PATTERN =
  "(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)";

const ORDINAL_WORDS = {
  first: 1,
  second: 2,
  third: 3,
  fourth: 4,
  fifth: 5,
  last: -1,
};

const WEEKDAY_MAP = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

/** Reference year for computing movable feasts and relative dates. */
const REFERENCE_YEAR = new Date().getFullYear();

export function parseMonthToken(token) {
  if (!token) return null;
  const lower = token.toLowerCase().replace(/\./g, "");
  if (MONTH_ABBREV[lower]) return MONTH_ABBREV[lower];
  const idx = MONTH_NAMES.findIndex((m) => m === lower || m.startsWith(lower));
  return idx >= 0 ? idx + 1 : null;
}

function daysInMonth(month, year = REFERENCE_YEAR) {
  return new Date(year, month, 0).getDate();
}

function clampDay(day, month, year = REFERENCE_YEAR) {
  if (!day || !month) return null;
  return Math.min(Math.max(1, day), daysInMonth(month, year));
}

/** Anonymous Gregorian algorithm — returns { month, day } for Easter Sunday. */
export function easterSunday(year = REFERENCE_YEAR) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

function addDays(month, day, delta, year = REFERENCE_YEAR) {
  const date = new Date(year, month - 1, day + delta);
  return { month: date.getMonth() + 1, day: date.getDate() };
}

function nthWeekdayOfMonth(year, month, weekday, nth) {
  if (nth === -1) {
    const last = daysInMonth(month, year);
    for (let d = last; d >= 1; d--) {
      if (new Date(year, month - 1, d).getDay() === weekday) {
        return d;
      }
    }
    return null;
  }
  let count = 0;
  for (let d = 1; d <= daysInMonth(month, year); d++) {
    if (new Date(year, month - 1, d).getDay() === weekday) {
      count++;
      if (count === nth) return d;
    }
  }
  return null;
}

function weekRange(year, month, which) {
  if (which === -1) {
    const end = daysInMonth(month, year);
    return { dayStart: Math.max(1, end - 6), dayEnd: end };
  }
  const start = (which - 1) * 7 + 1;
  const end = Math.min(which * 7, daysInMonth(month, year));
  return { dayStart: start, dayEnd: end };
}

function parseOrdinal(text) {
  const lower = text.toLowerCase();
  const word = Object.entries(ORDINAL_WORDS).find(([k]) => lower.includes(k));
  if (word) return word[1];
  const m = lower.match(/(\d+)(?:st|nd|rd|th)/);
  return m ? Number(m[1]) : null;
}

function parseWeekday(text) {
  const lower = text.toLowerCase();
  for (const [name, idx] of Object.entries(WEEKDAY_MAP)) {
    if (lower.includes(name)) return idx;
  }
  return null;
}

function result(month, dayStart, dayEnd = null, dateParseMethod = null) {
  if (!month || !dayStart) return null;
  return {
    month,
    dayStart: clampDay(dayStart, month),
    dayEnd: dayEnd ? clampDay(dayEnd, month) : null,
    dateParseMethod,
  };
}

/**
 * Parse a date string (not full venue text).
 * @param {string} text
 * @param {number|null} hintMonth - month from table section if known
 */
export function parseDateText(text, hintMonth = null) {
  if (!text) return null;
  let raw = text.trim();
  if (!raw) return null;

  // Strip noise
  raw = raw
    .replace(/\bCANCELLED\b/gi, "")
    .replace(/\bvaries\b/gi, "")
    .replace(/\[.*?\]/g, "")
    .replace(/,\s*\d{4}\b/g, "")
    .replace(/\bbrgy\.?\s*fiesta\s*[-–—:]\s*/gi, "")
    .replace(/\bsaturdy\b/gi, "saturday")
    .replace(/\b2rd\b/gi, "2nd")
    .replace(/\b2th\b/gi, "2nd")
    .replace(new RegExp(`^(${MONTH_PATTERN})(\\d{1,2})`, "i"), "$1 $2")
    .replace(/\s+/g, " ")
    .trim();

  const lower = raw.toLowerCase();

  // "27th of May" / "5th of April" (Maasin LGU phrasing)
  const ordinalOfMonth = raw.match(/^(\d{1,2})(?:st|nd|rd|th)\s+of\s+(\w+)/i);
  if (ordinalOfMonth) {
    const m = parseMonthToken(ordinalOfMonth[2]);
    const d = Number(ordinalOfMonth[1]);
    if (m) return result(m, d, d, "ordinal-of-month");
  }

  // Whole / month-long
  if (
    /^(?:whole|entire)\s+month\s+of\s+/i.test(raw) ||
    /^month[- ]long\b/i.test(raw) ||
    /^all\s+month\b/i.test(raw)
  ) {
    const m =
      parseMonthToken(raw.match(new RegExp(MONTH_PATTERN, "i"))?.[1]) ??
      hintMonth;
    if (m) {
      return result(m, 1, daysInMonth(m), "month-long");
    }
  }

  // "9th Sunday after Easter Sunday" (Pasonanca, Zamboanga City)
  const sundayAfterEaster = raw.match(
    /(\d+(?:st|nd|rd|th)|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth)\s+sunday\s+after\s+(?:the\s+)?easter(?:\s+sunday)?/i
  );
  if (sundayAfterEaster) {
    const nth = parseOrdinal(sundayAfterEaster[1] ?? sundayAfterEaster[0]);
    if (nth) {
      const easter = easterSunday();
      const feast = addDays(easter.month, easter.day, nth * 7);
      return result(feast.month, feast.day, feast.day, "sunday-after-easter");
    }
  }

  // "every 8th day of December" / "8thday of December" (Ligao LGU phrasing)
  const everyNthDay = raw.match(
    /(?:every\s+)?(\d{1,2})(?:st|nd|rd|th)?\s*day\s+of\s+(\w+)/i
  );
  if (everyNthDay) {
    const m = parseMonthToken(everyNthDay[2]);
    const d = Number(everyNthDay[1]);
    if (m) return result(m, d, d, "nth-day-of-month");
  }

  // Holy Week / Good Friday / Easter-linked
  if (/\bgood\s+friday\b/i.test(raw)) {
    const easter = easterSunday();
    const gf = addDays(easter.month, easter.day, -2);
    return result(gf.month, gf.day, gf.day, "good-friday");
  }
  if (/\bholy\s+week\b/i.test(raw) || (/\beaster\b/i.test(raw) && !/after\s+(?:the\s+)?easter/i.test(raw))) {
    const easter = easterSunday();
    const palm = addDays(easter.month, easter.day, -7);
    return result(palm.month, palm.day, easter.day, "holy-week");
  }
  if (/\bmarch\s*[-–—]\s*april\b/i.test(raw)) {
    const easter = easterSunday();
    const palm = addDays(easter.month, easter.day, -7);
    return result(palm.month, palm.day, easter.day, "holy-week-range");
  }

  // Cross-month: "February 27 - March 07"
  const crossMonth = raw.match(
    new RegExp(
      `^${MONTH_PATTERN}\\s+(\\d{1,2})\\s*[-–—]\\s*${MONTH_PATTERN}\\s+(\\d{1,2})`,
      "i"
    )
  );
  if (crossMonth) {
    const m1 = parseMonthToken(crossMonth[1]);
    const d1 = Number(crossMonth[2]);
    const m2 = parseMonthToken(crossMonth[3]);
    const d2 = Number(crossMonth[4]);
    if (m1 && m2) {
      return {
        month: m1,
        dayStart: clampDay(d1, m1),
        dayEnd: null,
        dayEndMonth: m2,
        dayEndDay: clampDay(d2, m2),
        dateParseMethod: "cross-month",
      };
    }
  }

  // "Feb 10 to Feb 11" / "February 18 to February 19"
  const toRange = raw.match(
    new RegExp(
      `^${MONTH_PATTERN}\\s+(\\d{1,2})\\s+to\\s+${MONTH_PATTERN}\\s+(\\d{1,2})`,
      "i"
    )
  );
  if (toRange) {
    const m1 = parseMonthToken(toRange[1]);
    const d1 = Number(toRange[2]);
    const m2 = parseMonthToken(toRange[3]);
    const d2 = Number(toRange[4]);
    if (m1 === m2) return result(m1, d1, d2, "range-to");
    return {
      month: m1,
      dayStart: clampDay(d1, m1),
      dayEnd: null,
      dayEndMonth: m2,
      dayEndDay: clampDay(d2, m2),
      dateParseMethod: "cross-month-to",
    };
  }

  // "last Sunday of August to first week of September" — use start
  const lastSunToWeek = raw.match(
    /last\s+(\w+)\s+of\s+(\w+).*?(?:to|–|-)\s*(?:first\s+week\s+of\s+)?(\w+)/i
  );
  if (lastSunToWeek) {
    const wd = parseWeekday(lastSunToWeek[1]);
    const m1 = parseMonthToken(lastSunToWeek[2]);
    if (wd != null && m1) {
      const day = nthWeekdayOfMonth(REFERENCE_YEAR, m1, wd, -1);
      if (day) return result(m1, day, day, "last-weekday");
    }
  }

  // "1st to 2nd week" / "first to second week of February"
  const weekToWeek = raw.match(
    /(?:(\d+(?:st|nd|rd|th))|first|second|third|fourth)\s+to\s+(?:(\d+(?:st|nd|rd|th))|first|second|third|fourth)\s+week(?:\s+of\s+(\w+))?/i
  );
  if (weekToWeek) {
    const n1 = parseOrdinal(weekToWeek[1]) ?? 1;
    const n2 = parseOrdinal(weekToWeek[2]) ?? 2;
    const m = parseMonthToken(weekToWeek[3]) ?? hintMonth;
    if (m) {
      const start = weekRange(REFERENCE_YEAR, m, n1);
      const end = weekRange(REFERENCE_YEAR, m, n2);
      return result(m, start.dayStart, end.dayEnd, "week-to-week");
    }
  }

  // "Beginning of March" / "start of April"
  const beginning = raw.match(/(?:beginning|start)\s+of\s+(\w+)/i);
  if (beginning) {
    const m = parseMonthToken(beginning[1]) ?? hintMonth;
    if (m) {
      const range = weekRange(REFERENCE_YEAR, m, 1);
      return result(m, range.dayStart, range.dayEnd, "beginning-of-month");
    }
  }

  // "Last Sunday Malolos" / "First Sunday ... Week of February"
  const weekdayMonthInline = raw.match(
    /(first|second|third|fourth|last)\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)(?:\s+.*?(?:week\s+of\s+)?(\w+))?/i
  );
  if (weekdayMonthInline) {
    const nth = parseOrdinal(weekdayMonthInline[1]);
    const wd = parseWeekday(weekdayMonthInline[2]);
    const m = parseMonthToken(weekdayMonthInline[3]) ?? hintMonth;
    if (m && wd != null && nth) {
      const day = nthWeekdayOfMonth(REFERENCE_YEAR, m, wd, nth);
      if (day) return result(m, day, day, "weekday-inline");
    }
  }

  // Nth weekday of month: "3rd Sunday of January"
  const nthWeekday = raw.match(
    /(?:(\d+(?:st|nd|rd|th))|first|second|third|fourth|fifth|last)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|weekend|weekday)\s+of\s+(\w+)/i
  );
  if (nthWeekday) {
    const nth = parseOrdinal(nthWeekday[0]) ?? parseOrdinal(nthWeekday[1]);
    const wd = parseWeekday(nthWeekday[2]);
    const m = parseMonthToken(nthWeekday[3]);
    if (m && wd != null && nth) {
      const day = nthWeekday[2].toLowerCase().includes("week")
        ? null
        : nthWeekday[2].toLowerCase() === "weekend"
          ? nthWeekdayOfMonth(REFERENCE_YEAR, m, 6, nth === -1 ? -1 : nth) ??
            nthWeekdayOfMonth(REFERENCE_YEAR, m, 0, nth === -1 ? -1 : nth)
          : nthWeekdayOfMonth(REFERENCE_YEAR, m, wd, nth);
      if (day) return result(m, day, day, "nth-weekday");
    }
    if (m && nth && /week/i.test(nthWeekday[2])) {
      const range = weekRange(REFERENCE_YEAR, m, nth === -1 ? -1 : nth);
      return result(m, range.dayStart, range.dayEnd, "nth-week");
    }
  }

  // "3rd Week of January" / "Third week of January" / "Last week of November"
  const nthWeek = raw.match(
    /(?:(\d+(?:st|nd|rd|th))|first|second|third|fourth|fifth|last)\s+week\s+of\s+(\w+)/i
  );
  if (nthWeek) {
    const nth = parseOrdinal(nthWeek[0]) ?? parseOrdinal(nthWeek[1]);
    const m = parseMonthToken(nthWeek[2]) ?? hintMonth;
    if (m && nth) {
      const range = weekRange(REFERENCE_YEAR, m, nth);
      return result(m, range.dayStart, range.dayEnd, "nth-week-of");
    }
  }

  // "Last week of November" / "Last week Cadiz" (hint month)
  const lastWeek = raw.match(/last\s+week(?:\s+of\s+(\w+))?/i);
  if (lastWeek) {
    const m = parseMonthToken(lastWeek[1]) ?? hintMonth;
    if (m) {
      const range = weekRange(REFERENCE_YEAR, m, -1);
      return result(m, range.dayStart, range.dayEnd, "last-week");
    }
  }

  // "First Week of March"
  const firstWeek = raw.match(/first\s+week(?:\s+of\s+(\w+))?/i);
  if (firstWeek) {
    const m = parseMonthToken(firstWeek[1]) ?? hintMonth;
    if (m) {
      const range = weekRange(REFERENCE_YEAR, m, 1);
      return result(m, range.dayStart, range.dayEnd, "first-week");
    }
  }

  // Month + day range: "January 6-11", "February 1-28", "February 1-28,"
  const monthDayRange = raw.match(
    new RegExp(`^${MONTH_PATTERN}\\s+(\\d{1,2})\\s*[-–—]\\s*(\\d{1,2})`, "i")
  );
  if (monthDayRange) {
    const m = parseMonthToken(monthDayRange[1]);
    const d1 = Number(monthDayRange[2]);
    const d2 = Number(monthDayRange[3]);
    if (m) return result(m, d1, d2, "month-day-range");
  }

  // "Feb 24 or 17 – 26" — take explicit range or first number
  const orRange = raw.match(
    new RegExp(
      `^${MONTH_PATTERN}\\s+(\\d{1,2})\\s+or\\s+(\\d{1,2})\\s*[-–—]\\s*(\\d{1,2})`,
      "i"
    )
  );
  if (orRange) {
    const m = parseMonthToken(orRange[1]);
    const d1 = Number(orRange[3]);
    const d2 = Number(orRange[4]);
    if (m) return result(m, d1, d2, "or-range");
  }

  // Single: "February 15", "Feb 6", "March 24" (not ranges like "February 15-16")
  const singleDay = raw.match(
    new RegExp(
      `^${MONTH_PATTERN}\\s+(\\d{1,2})(?!\\s*[-–—]\\s*\\d)(?:\\b|[,\\s]|$)`,
      "i"
    )
  );
  if (singleDay) {
    const m = parseMonthToken(singleDay[1]);
    const d = Number(singleDay[2]);
    if (m) return result(m, d, d, "single-day");
  }

  // Leading day before month rare: "15 January"
  const dayMonth = raw.match(
    new RegExp(`^(\\d{1,2})\\s+${MONTH_PATTERN}\\b`, "i")
  );
  if (dayMonth) {
    const d = Number(dayMonth[1]);
    const m = parseMonthToken(dayMonth[2]);
    if (m) return result(m, d, d, "day-month");
  }

  // Day or day-range with hint month (Wikipedia: "1 Tudela", "5-11 Bauang", "6 Sasmuan")
  const hintDayRange = raw.match(
    /^(\d{1,2})(?!(?:st|nd|rd|th)\b)(?:\s*[-–—]\s*(\d{1,2})(?!(?:st|nd|rd|th)\b))?\b/
  );
  if (hintDayRange && hintMonth) {
    const d1 = Number(hintDayRange[1]);
    const d2 = hintDayRange[2] ? Number(hintDayRange[2]) : d1;
    return result(hintMonth, d1, d2, "hint-month-day");
  }

  // Month only at start: "February Taguilon" — spans full month
  const monthOnly = raw.match(new RegExp(`^${MONTH_PATTERN}\\b`, "i"));
  if (monthOnly) {
    const m = parseMonthToken(monthOnly[1]);
    const rest = raw.slice(monthOnly[0].length).trim();
    if (m && rest && !/^\d/.test(rest)) {
      return result(m, 1, daysInMonth(m), "month-only-span");
    }
  }

  return null;
}

/**
 * Extract leading date portion from dateVenueRaw before venue text.
 */
export function extractDatePortion(raw, hintMonth = null) {
  if (!raw) return "";
  let text = raw.trim();

  // Take segment before common venue separators when date has digits/relative words
  const dateLike =
    /^(?:(?:\d+(?:st|nd|rd|th)\s+)?(?:week|monday|tuesday|wednesday|thursday|friday|saturday|sunday)|good\s+friday|holy\s+week|month[- ]long|whole\s+month|first\s+week|last\s+week|\w+\s+\d)/i;
  if (!dateLike.test(text) && hintMonth) {
    // Try month from hint at start: "February Place"
    const m = text.match(new RegExp(`^${MONTH_PATTERN}\\b`, "i"));
    if (m) return m[0];
    return "";
  }

  // Split on long venue clauses after date
  const patterns = [
    new RegExp(`^(\\d{1,2}(?:\\s*[-–—]\\s*\\d{1,2})?)\\b`),
    new RegExp(`^((?:${MONTH_PATTERN}\\s+)?\\d{1,2}(?:\\s*[-–—]\\s*\\d{1,2})?)`, "i"),
    new RegExp(
      `^((?:\\d+(?:st|nd|rd|th)\\s+)?(?:week|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\\s+of\\s+\\w+)`,
      "i"
    ),
    new RegExp(`^((?:first|second|third|fourth|last)\\s+week(?:\\s+of\\s+\\w+)?)`, "i"),
    new RegExp(`^(${MONTH_PATTERN}\\s+\\d{1,2}(?:\\s+to\\s+${MONTH_PATTERN}\\s+\\d{1,2})?)`, "i"),
    new RegExp(`^(${MONTH_PATTERN}\\s+\\d{1,2}\\s*[-–—]\\s*${MONTH_PATTERN}\\s+\\d{1,2})`, "i"),
    /^(good\s+friday|holy\s+week|month[- ]long|whole\s+month(?:\s+of\s+\w+)?)/i,
  ];

  for (const pat of patterns) {
    const m = text.match(pat);
    if (m) return m[1].trim();
  }

  // Fallback: take until comma or double-space before capital place name
  const comma = text.indexOf(",");
  if (comma > 0 && comma < 40) return text.slice(0, comma).trim();

  return text;
}

/**
 * Parse festival date fields from dateVenueRaw.
 * @returns {{ month?, dayStart?, dayEnd?, dayEndMonth?, dayEndDay?, dateParseMethod? } | null}
 */
export function parseDateFromRaw(dateVenueRaw, hintMonth = null) {
  if (!dateVenueRaw) return null;

  const portion = extractDatePortion(dateVenueRaw, hintMonth);
  const candidates = [];
  if (portion) candidates.push(portion);
  candidates.push(dateVenueRaw);
  if (portion && hintMonth && MONTH_NAMES[hintMonth - 1]) {
    candidates.push(`${MONTH_NAMES[hintMonth - 1]} ${portion}`);
  }

  for (const text of candidates) {
    const parsed = parseDateText(text, hintMonth);
    if (parsed) return parsed;
  }

  return null;
}

/**
 * Fill missing date fields on a festival record.
 * @param {{ monthFallback?: boolean }} options - when true, use full-month span if only month is known
 */
export function enrichFestivalDates(festival, { monthFallback = false } = {}) {
  const month = festival.month ?? null;
  const dayStart = festival.dayStart ?? null;
  const dayEnd = festival.dayEnd ?? null;

  if (dayStart != null) {
    return { month, dayStart, dayEnd, dateParseMethod: festival.dateParseMethod ?? null };
  }

  const parsed = parseDateFromRaw(
    festival.dateVenueRaw ?? festival.locationText ?? "",
    month
  );

  if (parsed?.dayStart) {
    return {
      month: month ?? parsed.month,
      dayStart: parsed.dayStart,
      dayEnd: dayEnd ?? parsed.dayEnd ?? null,
      dayEndMonth: parsed.dayEndMonth ?? null,
      dayEndDay: parsed.dayEndDay ?? null,
      dateParseMethod: parsed.dateParseMethod ?? null,
    };
  }

  if (monthFallback && month) {
    return {
      month,
      dayStart: 1,
      dayEnd: daysInMonth(month),
      dateParseMethod: "month-inferred",
    };
  }

  return { month, dayStart, dayEnd, dateParseMethod: null };
}
