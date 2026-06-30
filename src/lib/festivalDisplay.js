import { MONTH_NAMES } from "./constants.js";

const RELATIVE_DATE_RE =
  /(?:every\s+)?(?:(?:first|second|third|fourth|last)\s+(?:week(?:end)?\s+of\s+\w+|\w+\s+of\s+\w+|\w+\s+Sunday)|\d{1,2}\s*(?:-|–|to)\s*\d{1,2})/i;

function isMonthOnlyDate(f) {
  return f.datePrecision === "month" || f.dateParseMethod === "month-inferred";
}

/** Extract a human date phrase from raw venue text (before place name). */
export function extractDatePhraseFromRaw(raw) {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  const relative = trimmed.match(RELATIVE_DATE_RE);
  if (relative) return relative[0].trim();

  const commaIdx = trimmed.indexOf(",");
  const beforeComma = commaIdx > 0 ? trimmed.slice(0, commaIdx).trim() : trimmed;
  if (RELATIVE_DATE_RE.test(beforeComma)) {
    return beforeComma.match(RELATIVE_DATE_RE)?.[0]?.trim() ?? null;
  }

  const words = beforeComma.split(/\s+/);
  if (words.length <= 6 && /jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d/i.test(beforeComma)) {
    return beforeComma;
  }
  return null;
}

export function formatFestivalDate(f) {
  const monthName = f.month ? (MONTH_NAMES[f.month] ?? "") : "";

  if (isMonthOnlyDate(f)) {
    const phrase = extractDatePhraseFromRaw(f.dateVenueRaw);
    if (phrase) return phrase;
    if (monthName) return monthName;
  }

  if (f.dayStart && f.month) {
    if (f.dayEnd && f.dayEnd !== f.dayStart) {
      return `${monthName} ${f.dayStart}–${f.dayEnd}`;
    }
    return `${monthName} ${f.dayStart}`;
  }

  if (f.month) return monthName;
  const phrase = extractDatePhraseFromRaw(f.dateVenueRaw);
  if (phrase) return phrase;
  return f.dateVenueRaw?.split(/\s+/).slice(0, 4).join(" ") ?? "Date TBA";
}

/** @returns {{ label: string, variant: string } | null} */
export function getFestivalDateBadge(f) {
  if (f.dateSource === "patron-saint-calendar") {
    return { label: "Patron saint estimate", variant: "estimate" };
  }
  if (f.dateSource?.startsWith("lgu-")) {
    return { label: "LGU schedule", variant: "verified" };
  }
  if (f.dateParseMethod === "month-inferred" || f.datePrecision === "month") {
    return { label: "Month only", variant: "approx" };
  }
  if (f.location?.matchMethod === "national") {
    return { label: "Nationwide", variant: "info" };
  }
  if (
    f.location?.matchMethod === "festival-hint-region" ||
    f.location?.matchMethod === "region-text"
  ) {
    return { label: "Regionwide", variant: "info" };
  }
  if (f.location?.confidence && f.location.confidence !== "high") {
    return { label: "Verify location", variant: "approx" };
  }
  return null;
}
