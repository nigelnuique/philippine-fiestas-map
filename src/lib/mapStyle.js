import { REGION_COLORS } from "./constants.js";

export function regionColorExpression() {
  const pairs = Object.entries(REGION_COLORS).flatMap(([k, v]) => [
    Number(k),
    v,
  ]);
  return ["match", ["get", "adm1_psgc"], ...pairs, "#64748b"];
}

export const BASE_FILL_PAINT = {
  "fill-color": regionColorExpression(),
  "fill-opacity": [
    "case",
    ["boolean", ["feature-state", "hover"], false],
    0.85,
    0.55,
  ],
};

export const BASE_LINE_PAINT = {
  "line-color": "#1e293b",
  "line-width": [
    "case",
    ["boolean", ["feature-state", "hover"], false],
    2,
    0.6,
  ],
};

export const HIGHLIGHT_FILL_PAINT = {
  "fill-color": "#fbbf24",
  "fill-opacity": 0.55,
};

export const HIGHLIGHT_LINE_PAINT = {
  "line-color": "#fbbf24",
  "line-width": 3.5,
};
