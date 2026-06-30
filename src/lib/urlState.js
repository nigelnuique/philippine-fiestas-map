import { normalizePsgc } from "./psgc.js";

function parseHashParams() {
  const raw = window.location.hash.replace(/^#/, "").trim();
  if (!raw) return new URLSearchParams();
  return new URLSearchParams(raw.startsWith("?") ? raw.slice(1) : raw);
}

function writeHashParams(params) {
  const next = params.toString();
  const hash = next ? `#${next}` : "";
  if (window.location.hash !== hash) {
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${hash}`);
  }
}

export function readUrlState() {
  const params = parseHashParams();
  const festivalId = params.get("f") || null;
  const month = params.get("m") ? Number(params.get("m")) : null;
  const level = params.get("l") || null;

  if (!level || level === "country") {
    return { selection: null, festivalId, month };
  }

  const selection = {
    level,
    regionPsgc: normalizePsgc(params.get("r")),
    provincePsgc: normalizePsgc(params.get("p")),
    municipalityPsgc: normalizePsgc(params.get("u")),
    barangayPsgc: normalizePsgc(params.get("b")),
    regionName: params.get("rn") || null,
    provinceName: params.get("pn") || null,
    municipalityName: params.get("un") || null,
    barangayName: params.get("bn") || null,
  };

  return { selection, festivalId, month };
}

export function writeUrlState(selection, { festivalId = null, month = null } = {}) {
  const params = new URLSearchParams();

  if (month != null && month >= 1 && month <= 12) {
    params.set("m", String(month));
  }

  if (festivalId) params.set("f", festivalId);

  if (selection?.level && selection.level !== "country") {
    params.set("l", selection.level);
    if (selection.regionPsgc != null) params.set("r", String(selection.regionPsgc));
    if (selection.provincePsgc != null) params.set("p", String(selection.provincePsgc));
    if (selection.municipalityPsgc != null) params.set("u", String(selection.municipalityPsgc));
    if (selection.barangayPsgc != null) params.set("b", String(selection.barangayPsgc));
    if (selection.regionName) params.set("rn", selection.regionName);
    if (selection.provinceName) params.set("pn", selection.provinceName);
    if (selection.municipalityName) params.set("un", selection.municipalityName);
    if (selection.barangayName) params.set("bn", selection.barangayName);
  }

  writeHashParams(params);
}

export function subscribeUrlState(listener) {
  const onChange = () => listener(readUrlState());
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}
