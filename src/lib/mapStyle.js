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

export const PROVINCE_BASE_LINE = "#cbd5e1";

export const BASE_LINE_PAINT = {
  "line-color": PROVINCE_BASE_LINE,
  "line-opacity": 1,
  "line-width": [
    "case",
    ["boolean", ["feature-state", "hover"], false],
    2.5,
    1.35,
  ],
};

/** Distinct highlight palette per drill-down level (not opacity-only). */
export const LEVEL_HIGHLIGHT = {
  region: {
    fill: "#c084fc",
    line: "#e9d5ff",
    fillOpacity: 0.5,
    lineWidth: 3,
  },
  province: {
    fill: "#fbbf24",
    line: "#fde68a",
    fillOpacity: 0.55,
    lineWidth: 3.5,
  },
  municipality: {
    fill: "#38bdf8",
    line: "#7dd3fc",
    fillOpacity: 0.55,
    lineWidth: 3,
  },
  barangay: {
    fill: "#4ade80",
    line: "#86efac",
    fillOpacity: 0.6,
    lineWidth: 2.5,
  },
};

export const MUNI_BASE_FILL = "#64748b";
export const MUNI_BASE_LINE = "#94a3b8";

export const MUNI_BASE_LINE_PAINT = {
  "line-color": MUNI_BASE_LINE,
  "line-opacity": 1,
  "line-width": [
    "case",
    ["boolean", ["feature-state", "hover"], false],
    2.25,
    1.5,
  ],
};
export const BGY_BASE_FILL = "#78716c";
export const BGY_BASE_LINE = "#94a3b8";

export const BGY_BASE_LINE_PAINT = {
  "line-color": BGY_BASE_LINE,
  "line-opacity": 1,
  "line-width": [
    "case",
    ["boolean", ["feature-state", "hover"], false],
    2.25,
    1.5,
  ],
};

export const HIGHLIGHT_FILL_PAINT = {
  "fill-color": LEVEL_HIGHLIGHT.province.fill,
  "fill-opacity": LEVEL_HIGHLIGHT.province.fillOpacity,
};

export const HIGHLIGHT_LINE_PAINT = {
  "line-color": LEVEL_HIGHLIGHT.province.line,
  "line-width": LEVEL_HIGHLIGHT.province.lineWidth,
};

export function applyLevelHighlightPaint(map, layerIds, level) {
  const palette = LEVEL_HIGHLIGHT[level] ?? LEVEL_HIGHLIGHT.province;
  for (const { fill, line } of layerIds) {
    if (fill && map.getLayer(fill)) {
      map.setPaintProperty(fill, "fill-color", palette.fill);
      map.setPaintProperty(fill, "fill-opacity", palette.fillOpacity);
    }
    if (line && map.getLayer(line)) {
      map.setPaintProperty(line, "line-color", palette.line);
      map.setPaintProperty(line, "line-width", palette.lineWidth);
    }
  }
}
