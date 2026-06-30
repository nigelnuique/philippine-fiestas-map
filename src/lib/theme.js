const STORAGE_KEY = "philippine-fiestas-theme";
const THEME_EVENT = "app-theme-change";

/** @typedef {"light" | "dark"} Theme */

/** @type {Set<() => void>} */
const listeners = new Set();

function readStoredTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* private browsing */
  }
  return null;
}

/** @returns {Theme} */
export function getPreferredTheme() {
  const stored = readStoredTheme();
  if (stored) return stored;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

/** @returns {Theme} */
export function getTheme() {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function updateMetaThemeColor(theme) {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) return;
  meta.setAttribute("content", theme === "light" ? "#f8fafc" : "#0f1419");
}

/** @param {Theme} theme */
export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
  updateMetaThemeColor(theme);
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: theme }));
  for (const listener of listeners) listener();
}

export function initTheme() {
  applyTheme(getPreferredTheme());
}

/** @returns {Theme} */
export function toggleTheme() {
  const next = getTheme() === "light" ? "dark" : "light";
  applyTheme(next);
  return next;
}

/** @param {() => void} listener */
export function subscribeTheme(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getMapBackgroundColor() {
  return getTheme() === "light" ? "#e2e8f0" : "#0a0e14";
}
