import { useEffect, useLayoutEffect, useRef, useCallback, useState } from "react";
import maplibregl from "maplibre-gl";
import { PH_CENTER, PH_ZOOM } from "../lib/constants.js";
import {
  BASE_FILL_PAINT,
  BASE_LINE_PAINT,
  PROVINCE_BASE_LINE,
  BGY_BASE_FILL,
  BGY_BASE_LINE,
  BGY_BASE_LINE_PAINT,
  HIGHLIGHT_FILL_PAINT,
  HIGHLIGHT_LINE_PAINT,
  MUNI_BASE_FILL,
  MUNI_BASE_LINE,
  MUNI_BASE_LINE_PAINT,
  applyLevelHighlightPaint,
} from "../lib/mapStyle.js";
import { loadBarangays, loadMunicipalities } from "../lib/data.js";
import {
  boundsForSelection,
  boundsFromFeature,
  selectionToFilter,
} from "../lib/mapUtils.js";
import { mapFocusForMunicipality } from "../lib/locationHints.js";
import {
  featureHoverLabel,
  hasBarangayMap,
  pickDeepestFeature,
  selectionFromMapClick,
} from "../lib/mapInteraction.js";
import "./FiestaMap.css";

const MAP_LAYERS = {
  background: "background",
  provincesFill: "provinces-fill",
  provincesLine: "provinces-line",
  highlightFill: "highlight-fill",
  highlightLine: "highlight-line",
  muniFill: "muni-fill",
  muniLine: "muni-line",
  muniHighlightFill: "muni-highlight-fill",
  muniHighlightLine: "muni-highlight-line",
  bgyFill: "bgy-fill",
  bgyLine: "bgy-line",
  bgyHighlightFill: "bgy-highlight-fill",
  bgyHighlightLine: "bgy-highlight-line",
};

const CLICK_LAYERS = [
  MAP_LAYERS.bgyFill,
  MAP_LAYERS.muniFill,
  MAP_LAYERS.provincesFill,
];

function interactiveLayers(map, bgyLoaded, muniLoaded, selection, { forClick = false } = {}) {
  return CLICK_LAYERS.filter((id) => {
    if (!map.getLayer(id)) return false;
    if (id === MAP_LAYERS.bgyFill) return bgyLoaded;
    if (id === MAP_LAYERS.muniFill) {
      if (!muniLoaded) return false;
      // At region level provinces are clickable; municipalities unlock after province select.
      return (
        selection?.level === "province" ||
        selection?.level === "municipality" ||
        selection?.level === "barangay"
      );
    }
    if (id === MAP_LAYERS.provincesFill) {
      // Province underlay catches sea/coast clicks when drilled into a municipality.
      if (
        forClick &&
        (selection?.level === "municipality" || selection?.level === "barangay")
      ) {
        return false;
      }
    }
    return true;
  });
}

function safeSetFilter(map, layerId, filter) {
  if (map.getLayer(layerId)) map.setFilter(layerId, filter);
}

function safeSetVisibility(map, layerId, visibility) {
  if (map.getLayer(layerId)) map.setLayoutProperty(layerId, "visibility", visibility);
}

const MUNI_LAYER_IDS = [
  MAP_LAYERS.muniFill,
  MAP_LAYERS.muniLine,
  MAP_LAYERS.muniHighlightFill,
  MAP_LAYERS.muniHighlightLine,
];

const BGY_LAYER_IDS = [
  MAP_LAYERS.bgyFill,
  MAP_LAYERS.bgyLine,
  MAP_LAYERS.bgyHighlightFill,
  MAP_LAYERS.bgyHighlightLine,
];

function setLayersVisibility(map, layerIds, visibility) {
  for (const id of layerIds) safeSetVisibility(map, id, visibility);
}

function waitForMapStyle(map) {
  if (map.loaded()) return Promise.resolve();
  return new Promise((resolve) => {
    map.once("load", resolve);
  });
}

/** After setData(), map.loaded() can be false until the style is idle. */
function waitForMapIdle(map) {
  return new Promise((resolve) => {
    if (!map) {
      resolve();
      return;
    }
    if (map.loaded() && !map.isMoving()) {
      resolve();
      return;
    }
    map.once("idle", resolve);
  });
}

function mapIsReady(map) {
  return Boolean(map);
}

export default function FiestaMap({
  provincesGeoJson,
  manifest,
  barangaysIndex,
  selection,
  selectionRevision = 0,
  onSelect,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const mapReadyRef = useRef(false);
  const hoveredRef = useRef({ ids: [], source: null });
  const regionFeatureIdsRef = useRef(new Map());
  const muniLoadedRef = useRef(null);
  const muniGeoJsonRef = useRef(null);
  const bgyLoadedRef = useRef(null);
  const bgyGeoJsonRef = useRef(null);
  const syncGenRef = useRef(0);
  const [mapLoadId, setMapLoadId] = useState(0);
  const [hoverTip, setHoverTip] = useState(null);
  const setHoverTipRef = useRef(setHoverTip);
  setHoverTipRef.current = setHoverTip;
  const selectionRef = useRef(selection);
  const onSelectRef = useRef(onSelect);
  const manifestRef = useRef(manifest);
  const provincesRef = useRef(provincesGeoJson);

  onSelectRef.current = onSelect;
  manifestRef.current = manifest;
  provincesRef.current = provincesGeoJson;
  selectionRef.current = selection;

  const applyHighlight = useCallback((map, sel) => {
    if (!mapIsReady(map)) return;

    if (!sel || sel.level === "country") {
      safeSetFilter(map, MAP_LAYERS.highlightFill, ["==", ["literal", 1], 2]);
      safeSetFilter(map, MAP_LAYERS.highlightLine, ["==", ["literal", 1], 2]);
      safeSetFilter(map, MAP_LAYERS.muniHighlightFill, ["==", ["literal", 1], 2]);
      safeSetFilter(map, MAP_LAYERS.muniHighlightLine, ["==", ["literal", 1], 2]);
      safeSetFilter(map, MAP_LAYERS.bgyHighlightFill, ["==", ["literal", 1], 2]);
      safeSetFilter(map, MAP_LAYERS.bgyHighlightLine, ["==", ["literal", 1], 2]);
      setLayersVisibility(map, MUNI_LAYER_IDS, "none");
      setLayersVisibility(map, BGY_LAYER_IDS, "none");
      if (map.getLayer(MAP_LAYERS.provincesFill)) {
        map.setPaintProperty(MAP_LAYERS.provincesFill, "fill-antialias", false);
        map.setPaintProperty(MAP_LAYERS.provincesFill, "fill-opacity", [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          1,
          1,
        ]);
      }
      safeSetVisibility(map, MAP_LAYERS.provincesLine, "none");
      return;
    }

    const isRegion = sel?.level === "region";
    const isProvince = sel?.level === "province";
    const isMuni =
      sel?.level === "municipality" || sel?.level === "barangay";
    const isBarangay = sel?.level === "barangay";
    const showProvinceOutlines = isProvince || isMuni;

    if (map.getLayer(MAP_LAYERS.provincesFill)) {
      map.setPaintProperty(
        MAP_LAYERS.provincesFill,
        "fill-antialias",
        showProvinceOutlines
      );
    }

    safeSetVisibility(
      map,
      MAP_LAYERS.provincesLine,
      showProvinceOutlines ? "visible" : "none"
    );

    const provinceHighlightFilter = selectionToFilter(sel);
    safeSetFilter(map, MAP_LAYERS.highlightFill, provinceHighlightFilter);
    safeSetFilter(map, MAP_LAYERS.highlightLine, provinceHighlightFilter);

    const muniHighlightFilter =
      (sel?.level === "municipality" || sel?.level === "barangay") &&
      sel.municipalityPsgc
        ? ["==", ["to-number", ["get", "adm3_psgc"]], sel.municipalityPsgc]
        : ["==", ["literal", 1], 2];
    safeSetFilter(map, MAP_LAYERS.muniHighlightFill, muniHighlightFilter);
    safeSetFilter(map, MAP_LAYERS.muniHighlightLine, muniHighlightFilter);

    const bgyFilter =
      sel?.level === "barangay" && sel.barangayPsgc
        ? ["==", ["to-number", ["get", "adm4_psgc"]], sel.barangayPsgc]
        : ["==", ["literal", 1], 2];
    safeSetFilter(map, MAP_LAYERS.bgyHighlightFill, bgyFilter);
    safeSetFilter(map, MAP_LAYERS.bgyHighlightLine, bgyFilter);

    const muniSrc = map.getSource("municipalities");
    const muniFromSource =
      muniSrc?._data?.features?.length ??
      muniSrc?.serialize?.()?.data?.features?.length ??
      0;
    const hasMuniData =
      Boolean(muniGeoJsonRef.current?.features?.length) || muniFromSource > 0;
    const bgySrc = map.getSource("barangays");
    const bgyFromSource =
      bgySrc?._data?.features?.length ??
      bgySrc?.serialize?.()?.data?.features?.length ??
      0;
    const hasBgyData =
      Boolean(bgyGeoJsonRef.current?.features?.length) || bgyFromSource > 0;
    const showMunis = (isProvince || isMuni) && hasMuniData;
    const showBgys = (isMuni || isBarangay) && hasBgyData;

    // Province / region selection → purple or amber highlight overlays
    applyLevelHighlightPaint(
      map,
      [{ fill: MAP_LAYERS.highlightFill, line: MAP_LAYERS.highlightLine }],
      isRegion ? "region" : "province"
    );

    // Municipality selection → sky-blue highlight on muni layer
    applyLevelHighlightPaint(
      map,
      [
        {
          fill: MAP_LAYERS.muniHighlightFill,
          line: MAP_LAYERS.muniHighlightLine,
        },
      ],
      "municipality"
    );

    // Barangay selection → green highlight on barangay layer
    applyLevelHighlightPaint(
      map,
      [{ fill: MAP_LAYERS.bgyHighlightFill, line: MAP_LAYERS.bgyHighlightLine }],
      "barangay"
    );

    // Child segments: provinces at region, municipalities at province, barangays at municipality
    setLayersVisibility(map, MUNI_LAYER_IDS, showMunis ? "visible" : "none");
    setLayersVisibility(map, BGY_LAYER_IDS, showBgys ? "visible" : "none");

    if (showMunis) {
      if (map.getLayer(MAP_LAYERS.muniFill)) {
        map.setPaintProperty(MAP_LAYERS.muniFill, "fill-color", MUNI_BASE_FILL);
      }
      if (map.getLayer(MAP_LAYERS.muniLine)) {
        map.setPaintProperty(MAP_LAYERS.muniLine, "line-color", MUNI_BASE_LINE);
        map.setPaintProperty(MAP_LAYERS.muniLine, "line-opacity", 1);
        map.setPaintProperty(MAP_LAYERS.muniLine, "line-width", [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          isProvince ? 2.5 : isBarangay ? 2 : 2.25,
          isProvince ? 1.65 : isBarangay ? 1.25 : 1.5,
        ]);
      }

      if (map.getLayer(MAP_LAYERS.muniFill)) {
        if (isBarangay) {
          map.setPaintProperty(MAP_LAYERS.muniFill, "fill-opacity", [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            0.35,
            0.2,
          ]);
        } else if (isMuni) {
          map.setPaintProperty(MAP_LAYERS.muniFill, "fill-opacity", [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            0.4,
            0.22,
          ]);
        } else if (isProvince && sel.provincePsgc) {
          map.setPaintProperty(MAP_LAYERS.muniFill, "fill-opacity", [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            0.55,
            [
              "case",
              ["==", ["to-number", ["get", "adm2_psgc"]], sel.provincePsgc],
              0.38,
              0.06,
            ],
          ]);
        }
      }
    }

    if (showBgys) {
      if (map.getLayer(MAP_LAYERS.bgyFill)) {
        map.setPaintProperty(MAP_LAYERS.bgyFill, "fill-color", BGY_BASE_FILL);
        map.setPaintProperty(MAP_LAYERS.bgyFill, "fill-opacity", [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          0.5,
          isBarangay ? 0.28 : 0.22,
        ]);
      }
      if (map.getLayer(MAP_LAYERS.bgyLine)) {
        map.setPaintProperty(MAP_LAYERS.bgyLine, "line-color", BGY_BASE_LINE);
        map.setPaintProperty(MAP_LAYERS.bgyLine, "line-opacity", 1);
        map.setPaintProperty(MAP_LAYERS.bgyLine, "line-width", [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          isBarangay ? 2.5 : 2.25,
          isBarangay ? 1.75 : 1.5,
        ]);
      }
    }

    // Province segment outlines when drilled to province level or deeper
    if (showProvinceOutlines && map.getLayer(MAP_LAYERS.provincesLine)) {
      map.setPaintProperty(MAP_LAYERS.provincesLine, "line-color", PROVINCE_BASE_LINE);
      map.setPaintProperty(MAP_LAYERS.provincesLine, "line-width", [
        "case",
        ["boolean", ["feature-state", "hover"], false],
        2.5,
        isProvince ? 1.75 : 1.35,
      ]);
      map.setPaintProperty(MAP_LAYERS.provincesLine, "line-opacity", 1);
    }

    if (map.getLayer(MAP_LAYERS.provincesFill)) {
      if (isMuni && sel.provincePsgc) {
        map.setPaintProperty(MAP_LAYERS.provincesFill, "fill-opacity", [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          0.7,
          [
            "case",
            ["==", ["to-number", ["get", "adm2_psgc"]], sel.provincePsgc],
            0.3,
            0.08,
          ],
        ]);
      } else if (isProvince && sel.provincePsgc) {
        map.setPaintProperty(MAP_LAYERS.provincesFill, "fill-opacity", [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          0.75,
          [
            "case",
            ["==", ["to-number", ["get", "adm2_psgc"]], sel.provincePsgc],
            0.45,
            0.1,
          ],
        ]);
      } else if (isRegion && sel.regionPsgc) {
        map.setPaintProperty(MAP_LAYERS.provincesFill, "fill-opacity", [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          1,
          [
            "case",
            ["==", ["to-number", ["get", "adm1_psgc"]], sel.regionPsgc],
            1,
            0.35,
          ],
        ]);
      } else {
        map.setPaintProperty(MAP_LAYERS.provincesFill, "fill-opacity", [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          0.85,
          0.55,
        ]);
      }
    }
  }, []);

  const flyCameraToSelection = useCallback((map, sel) => {
    if (!map) return;

    if (!sel) {
      map.flyTo({
        center: PH_CENTER,
        zoom: PH_ZOOM,
        duration: 900,
        essential: true,
      });
      return;
    }

    let bounds = boundsForSelection(
      sel,
      provincesRef.current,
      muniGeoJsonRef.current,
      bgyGeoJsonRef.current
    );
    if (!bounds) bounds = sel.flyBounds;
    if (!bounds && sel.level === "province" && sel.provincePsgc && provincesRef.current) {
      const feat = provincesRef.current.features.find(
        (f) => Number(f.properties?.adm2_psgc) === Number(sel.provincePsgc)
      );
      bounds = boundsFromFeature(feat);
    }
    if (!bounds && (sel.level === "municipality" || sel.level === "barangay")) {
      const feat = muniGeoJsonRef.current?.features?.find(
        (f) => Number(f.properties?.adm3_psgc) === Number(sel.municipalityPsgc)
      );
      bounds = boundsFromFeature(feat);
    }

    if (bounds) {
      const maxZoom =
        sel.level === "barangay"
          ? 15
          : sel.level === "municipality"
            ? 12
            : sel.level === "province"
              ? 10
              : 8;
      map.fitBounds(bounds, {
        padding: 56,
        duration: 900,
        maxZoom,
        essential: true,
      });
      return;
    }

    const focus =
      sel.mapFocus ??
      sel.mapFocusFallback ??
      mapFocusForMunicipality(sel.municipalityName);
    if (focus?.center) {
      map.flyTo({
        center: focus.center,
        zoom: focus.zoom ?? 12,
        duration: 900,
        essential: true,
      });
      return;
    }

    return;

  }, []);

  const loadMuniLayer = useCallback(async (map, sel, { force = false, syncGen } = {}) => {
    if (!mapIsReady(map) || !sel?.provincePsgc) return null;

    const cacheKey = `province:${sel.provincePsgc}`;
    if (!force && muniLoadedRef.current === cacheKey && muniGeoJsonRef.current) {
      setLayersVisibility(map, MUNI_LAYER_IDS, "visible");
      return muniGeoJsonRef.current;
    }

    const geojson = await loadMunicipalities(sel.provincePsgc);
    if (!mapRef.current || mapRef.current !== map) return null;

    map.getSource("municipalities")?.setData(geojson);
    muniLoadedRef.current = cacheKey;
    muniGeoJsonRef.current = geojson;
    if (syncGen == null || syncGen === syncGenRef.current) {
      setLayersVisibility(map, MUNI_LAYER_IDS, "visible");
    }
    return geojson;
  }, []);

  const hideBgyLayer = useCallback((map) => {
    if (!mapIsReady(map)) return;
    bgyLoadedRef.current = null;
    bgyGeoJsonRef.current = null;
    setLayersVisibility(map, BGY_LAYER_IDS, "none");
    map.getSource("barangays")?.setData({
      type: "FeatureCollection",
      features: [],
    });
  }, []);

  const loadBgyLayer = useCallback(
    async (map, municipalityPsgc, syncGen) => {
      if (!mapIsReady(map)) return null;
      if (bgyLoadedRef.current === municipalityPsgc && bgyGeoJsonRef.current) {
        setLayersVisibility(map, BGY_LAYER_IDS, "visible");
        return bgyGeoJsonRef.current;
      }
      const geojson = await loadBarangays(municipalityPsgc);
      if (!mapRef.current || mapRef.current !== map) return null;
      if (!geojson) {
        hideBgyLayer(map);
        return null;
      }
      map.getSource("barangays")?.setData(geojson);
      bgyLoadedRef.current = municipalityPsgc;
      bgyGeoJsonRef.current = geojson;
      if (syncGen == null || syncGen === syncGenRef.current) {
        setLayersVisibility(map, BGY_LAYER_IDS, "visible");
      }
      return geojson;
    },
    [hideBgyLayer]
  );

  const hideMuniLayer = useCallback((map) => {
    if (!mapIsReady(map)) return;
    muniLoadedRef.current = null;
    muniGeoJsonRef.current = null;
    setLayersVisibility(map, MUNI_LAYER_IDS, "none");
    map.getSource("municipalities")?.setData({
      type: "FeatureCollection",
      features: [],
    });
  }, []);

  const isSyncCurrent = useCallback((syncGen) => syncGen === syncGenRef.current, []);

  const applyHighlightRef = useRef(applyHighlight);
  const flyCameraRef = useRef(flyCameraToSelection);
  applyHighlightRef.current = applyHighlight;
  flyCameraRef.current = flyCameraToSelection;

  const applySelectionNow = useCallback((map, sel) => {
    if (!map || !sel) return;
    const flyBounds =
      boundsForSelection(sel, provincesRef.current, null, null) ?? sel.flyBounds;
    applyHighlightRef.current(map, sel);
    if (flyBounds) {
      flyCameraRef.current(map, { ...sel, flyBounds });
    }
  }, []);

  const syncSelectionToMap = useCallback(
    async (map) => {
      if (!map) return;

      const syncGen = ++syncGenRef.current;
      // map.loaded() is false during flyTo/setData; only wait for the initial style load.
      if (!mapReadyRef.current) {
        await waitForMapStyle(map);
        if (!isSyncCurrent(syncGen)) return;
      }

      const sel = selectionRef.current;

      if (!sel || sel.level === "country") {
        hideMuniLayer(map);
        hideBgyLayer(map);
        if (!isSyncCurrent(syncGen)) return;
        applyHighlight(map, null);
        flyCameraToSelection(map, null);
        return;
      }

      const needsMuniLayer =
        (sel.level === "province" ||
          sel.level === "municipality" ||
          sel.level === "barangay") &&
        sel.provincePsgc;

      if (needsMuniLayer) {
        const forceMuniReload =
          Boolean(sel.festivalId) &&
          (sel.level === "municipality" || sel.level === "barangay");
        await loadMuniLayer(map, sel, { force: forceMuniReload, syncGen });
      } else {
        hideMuniLayer(map);
      }

      if (!isSyncCurrent(syncGen)) return;

      const latestForBgy = selectionRef.current;
      const showBarangays =
        (latestForBgy?.level === "municipality" ||
          latestForBgy?.level === "barangay") &&
        hasBarangayMap(barangaysIndex, latestForBgy.municipalityPsgc);

      if (showBarangays) {
        await loadBgyLayer(map, latestForBgy.municipalityPsgc, syncGen);
      } else {
        hideBgyLayer(map);
      }

      if (!isSyncCurrent(syncGen)) return;

      if (needsMuniLayer || showBarangays) {
        await waitForMapIdle(map);
        if (!isSyncCurrent(syncGen)) return;
      }

      const latest = selectionRef.current;
      const flyBounds =
        boundsForSelection(
          latest,
          provincesRef.current,
          muniGeoJsonRef.current,
          bgyGeoJsonRef.current
        ) ?? latest?.flyBounds;

      applyHighlight(map, latest);
      flyCameraToSelection(map, flyBounds ? { ...latest, flyBounds } : latest);
    },
    [
      isSyncCurrent,
      applyHighlight,
      loadMuniLayer,
      hideMuniLayer,
      loadBgyLayer,
      hideBgyLayer,
      flyCameraToSelection,
      barangaysIndex,
    ]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !provincesGeoJson) return;

    container.innerHTML = "";
    mapReadyRef.current = false;

    const map = new maplibregl.Map({
      container,
      style: {
        version: 8,
        sources: {
          provinces: {
            type: "geojson",
            data: provincesGeoJson,
            generateId: true,
          },
          municipalities: {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
            generateId: true,
          },
          barangays: {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
            generateId: true,
          },
        },
        layers: [
          {
            id: MAP_LAYERS.background,
            type: "background",
            paint: { "background-color": "#0a0e14" },
          },
          {
            id: MAP_LAYERS.provincesFill,
            type: "fill",
            source: "provinces",
            paint: BASE_FILL_PAINT,
          },
          {
            id: MAP_LAYERS.provincesLine,
            type: "line",
            source: "provinces",
            layout: { visibility: "none" },
            paint: BASE_LINE_PAINT,
          },
          {
            id: MAP_LAYERS.muniFill,
            type: "fill",
            source: "municipalities",
            layout: { visibility: "none" },
            paint: {
              "fill-color": MUNI_BASE_FILL,
              "fill-opacity": [
                "case",
                ["boolean", ["feature-state", "hover"], false],
                0.4,
                0.22,
              ],
            },
          },
          {
            id: MAP_LAYERS.muniLine,
            type: "line",
            source: "municipalities",
            layout: { visibility: "none" },
            paint: MUNI_BASE_LINE_PAINT,
          },
          {
            id: MAP_LAYERS.bgyFill,
            type: "fill",
            source: "barangays",
            layout: { visibility: "none" },
            paint: {
              "fill-color": BGY_BASE_FILL,
              "fill-opacity": [
                "case",
                ["boolean", ["feature-state", "hover"], false],
                0.5,
                0.28,
              ],
            },
          },
          {
            id: MAP_LAYERS.bgyLine,
            type: "line",
            source: "barangays",
            layout: { visibility: "none" },
            paint: BGY_BASE_LINE_PAINT,
          },
          {
            id: MAP_LAYERS.highlightFill,
            type: "fill",
            source: "provinces",
            paint: HIGHLIGHT_FILL_PAINT,
            filter: ["==", ["literal", 1], 2],
          },
          {
            id: MAP_LAYERS.highlightLine,
            type: "line",
            source: "provinces",
            paint: HIGHLIGHT_LINE_PAINT,
            filter: ["==", ["literal", 1], 2],
          },
          {
            id: MAP_LAYERS.muniHighlightFill,
            type: "fill",
            source: "municipalities",
            layout: { visibility: "none" },
            paint: HIGHLIGHT_FILL_PAINT,
            filter: ["==", ["literal", 1], 2],
          },
          {
            id: MAP_LAYERS.muniHighlightLine,
            type: "line",
            source: "municipalities",
            layout: { visibility: "none" },
            paint: HIGHLIGHT_LINE_PAINT,
            filter: ["==", ["literal", 1], 2],
          },
          {
            id: MAP_LAYERS.bgyHighlightFill,
            type: "fill",
            source: "barangays",
            layout: { visibility: "none" },
            paint: HIGHLIGHT_FILL_PAINT,
            filter: ["==", ["literal", 1], 2],
          },
          {
            id: MAP_LAYERS.bgyHighlightLine,
            type: "line",
            source: "barangays",
            layout: { visibility: "none" },
            paint: HIGHLIGHT_LINE_PAINT,
            filter: ["==", ["literal", 1], 2],
          },
        ],
      },
      center: PH_CENTER,
      zoom: PH_ZOOM,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-right"
    );

    const byRegion = new Map();
    for (let i = 0; i < provincesGeoJson.features.length; i++) {
      const adm1 = Number(provincesGeoJson.features[i].properties?.adm1_psgc);
      if (!Number.isFinite(adm1)) continue;
      const list = byRegion.get(adm1) ?? [];
      list.push(i);
      byRegion.set(adm1, list);
    }
    regionFeatureIdsRef.current = byRegion;

    const clearHover = () => {
      const prev = hoveredRef.current;
      if (prev.ids?.length && prev.source) {
        for (const id of prev.ids) {
          map.setFeatureState({ source: prev.source, id }, { hover: false });
        }
      }
      hoveredRef.current = { ids: [], source: null };
    };

    const setHoverForFeature = (feature, source) => {
      clearHover();
      if (!feature || feature.id == null || !source) return;

      const countryView = !selectionRef.current;

      if (countryView && source === "provinces") {
        const adm1 = Number(feature.properties?.adm1_psgc);
        const ids =
          Number.isFinite(adm1) && regionFeatureIdsRef.current.has(adm1)
            ? regionFeatureIdsRef.current.get(adm1)
            : [feature.id];
        for (const id of ids) {
          map.setFeatureState({ source: "provinces", id }, { hover: true });
        }
        hoveredRef.current = { ids, source: "provinces" };
        return;
      }

      map.setFeatureState({ source, id: feature.id }, { hover: true });
      hoveredRef.current = { ids: [feature.id], source };
    };

    const sourceForLayer = (layerId) => {
      if (layerId === MAP_LAYERS.bgyFill) return "barangays";
      if (layerId === MAP_LAYERS.muniFill) return "municipalities";
      return "provinces";
    };

    const queryFeaturesAt = (point, { forClick = false } = {}) => {
      const layers = interactiveLayers(
        map,
        Boolean(bgyGeoJsonRef.current?.features?.length),
        Boolean(muniGeoJsonRef.current?.features?.length),
        selectionRef.current,
        { forClick }
      );
      if (!layers.length) return null;
      const features = map.queryRenderedFeatures(point, { layers });
      return pickDeepestFeature(features);
    };

    const onPointerMove = (e) => {
      const feature = queryFeaturesAt(e.point);
      map.getCanvas().style.cursor = feature ? "pointer" : "";
      if (feature?.id != null && feature.layer?.id) {
        setHoverForFeature(feature, sourceForLayer(feature.layer.id));
        const label = featureHoverLabel(
          feature,
          manifestRef.current,
          selectionRef.current
        );
        if (label) {
          const { clientX, clientY } = e.originalEvent;
          setHoverTipRef.current({ text: label, x: clientX, y: clientY });
        } else {
          setHoverTipRef.current(null);
        }
      } else {
        clearHover();
        setHoverTipRef.current(null);
      }
    };

    const onPointerLeave = () => {
      clearHover();
      setHoverTipRef.current(null);
    };

    let pointerDown = null;
    const DRAG_THRESHOLD_PX = 8;

    const onMouseDown = (e) => {
      pointerDown = e.point;
    };

    const onMapClick = (e) => {
      if (pointerDown) {
        const dx = e.point.x - pointerDown.x;
        const dy = e.point.y - pointerDown.y;
        pointerDown = null;
        if (Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) return;
      }

      const feature = queryFeaturesAt(e.point, { forClick: true });
      if (feature) {
        const sel = selectionFromMapClick(
          feature,
          manifestRef.current,
          selectionRef.current
        );
        if (sel) {
          selectionRef.current = sel;
          applySelectionNow(map, sel);
          onSelectRef.current(sel);
        }
        return;
      }

      clearHover();
      setHoverTipRef.current(null);
      if (selectionRef.current) {
        selectionRef.current = null;
        applyHighlightRef.current(map, null);
        flyCameraRef.current(map, null);
        onSelectRef.current(null);
      }
    };

    map.on("load", () => {
      mapReadyRef.current = true;
      if (import.meta.env.DEV || window.location.hostname === "localhost") {
        window.__fiestaMap = map;
      }
      setMapLoadId((n) => n + 1);
    });

    map.on("mousedown", onMouseDown);
    map.on("mousemove", onPointerMove);
    map.on("mouseleave", onPointerLeave);
    map.on("click", onMapClick);

    mapRef.current = map;

    return () => {
      mapReadyRef.current = false;
      map.off("mousedown", onMouseDown);
      map.off("mousemove", onPointerMove);
      map.off("mouseleave", onPointerLeave);
      map.off("click", onMapClick);
      setHoverTipRef.current(null);
      map.remove();
      mapRef.current = null;
      container.innerHTML = "";
    };
  }, [provincesGeoJson]);

  useLayoutEffect(() => {
    const map = mapRef.current;
    if (!map || mapLoadId === 0) return;
    selectionRef.current = selection;
    syncSelectionToMap(map);
  }, [selection, selectionRevision, mapLoadId, syncSelectionToMap]);

  const muniHasBarangayMap = hasBarangayMap(
    barangaysIndex,
    selection?.municipalityPsgc
  );

  const hint = !selection
    ? "Click a province to zoom into its region"
    : selection.level === "barangay"
      ? "Barangay selected · click the sea or use sidebar chips to go back"
      : selection.level === "municipality" && muniHasBarangayMap
        ? "Click a barangay to drill down, or the sea to reset"
        : selection.level === "municipality"
          ? "Click another municipality, or the sea to reset"
          : selection.level === "province"
            ? "Click a municipality to drill down, or the sea to reset"
            : selection.level === "region"
              ? "Click a province to drill down, or the sea to reset"
              : "Click the map to explore";

  const level = selection?.level;
  const legend = [
    { key: "region", label: "Region", color: "#c084fc" },
    { key: "province", label: "Province", color: "#fbbf24" },
    { key: "municipality", label: "Municipality", color: "#38bdf8" },
    { key: "barangay", label: "Barangay", color: "#4ade80" },
  ];

  return (
    <div className="map-wrap">
      <div ref={containerRef} className="map-container" />
      {hoverTip && (
        <div
          className="map-tooltip"
          style={{ left: hoverTip.x, top: hoverTip.y }}
          role="tooltip"
        >
          {hoverTip.text}
        </div>
      )}
      <div className="map-hint">{hint}</div>
      {selection && (
        <div className="map-legend" aria-label="Highlight colors by level">
          {legend.map((item) => (
            <span
              key={item.key}
              className={`map-legend-item${level === item.key ? " map-legend-active" : ""}`}
            >
              <span
                className="map-legend-swatch"
                style={{ backgroundColor: item.color }}
              />
              {item.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
