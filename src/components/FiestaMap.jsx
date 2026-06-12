import { useEffect, useRef, useCallback, useState } from "react";
import maplibregl from "maplibre-gl";
import { PH_CENTER, PH_ZOOM } from "../lib/constants.js";
import {
  BASE_FILL_PAINT,
  BASE_LINE_PAINT,
  HIGHLIGHT_FILL_PAINT,
  HIGHLIGHT_LINE_PAINT,
} from "../lib/mapStyle.js";
import {
  loadBarangays,
  loadMunicipalities,
  loadMunicipalitiesForRegion,
} from "../lib/data.js";
import {
  boundsForSelection,
  selectionToFilter,
} from "../lib/mapUtils.js";
import {
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

function interactiveLayers(map, bgyLoaded, muniLoaded) {
  return CLICK_LAYERS.filter((id) => {
    if (!map.getLayer(id)) return false;
    if (id === MAP_LAYERS.bgyFill) return bgyLoaded;
    if (id === MAP_LAYERS.muniFill) return muniLoaded;
    return true;
  });
}

function safeSetFilter(map, layerId, filter) {
  if (map.getLayer(layerId)) map.setFilter(layerId, filter);
}

function safeSetVisibility(map, layerId, visibility) {
  if (map.getLayer(layerId)) map.setLayoutProperty(layerId, "visibility", visibility);
}

function waitForMapStyle(map) {
  if (map.loaded()) return Promise.resolve();
  return new Promise((resolve) => {
    if (map.loaded()) {
      resolve();
      return;
    }
    map.once("load", resolve);
  });
}

export default function FiestaMap({
  provincesGeoJson,
  manifest,
  barangaysIndex,
  selection,
  flyTrigger = 0,
  onSelect,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const mapReadyRef = useRef(false);
  const hoveredRef = useRef({ id: null, source: null });
  const muniLoadedRef = useRef(null);
  const muniGeoJsonRef = useRef(null);
  const bgyLoadedRef = useRef(null);
  const bgyGeoJsonRef = useRef(null);
  const syncGenRef = useRef(0);
  const [mapLoadId, setMapLoadId] = useState(0);
  const selectionRef = useRef(selection);
  const onSelectRef = useRef(onSelect);
  const manifestRef = useRef(manifest);
  const provincesRef = useRef(provincesGeoJson);

  onSelectRef.current = onSelect;
  manifestRef.current = manifest;
  provincesRef.current = provincesGeoJson;
  selectionRef.current = selection;

  const applyHighlight = useCallback((map, sel) => {
    if (!map?.isStyleLoaded()) return;

    if (!sel || sel.level === "country") {
      safeSetFilter(map, MAP_LAYERS.highlightFill, ["==", ["literal", 1], 2]);
      safeSetFilter(map, MAP_LAYERS.highlightLine, ["==", ["literal", 1], 2]);
      safeSetFilter(map, MAP_LAYERS.muniHighlightFill, ["==", ["literal", 1], 2]);
      safeSetFilter(map, MAP_LAYERS.muniHighlightLine, ["==", ["literal", 1], 2]);
      safeSetFilter(map, MAP_LAYERS.bgyHighlightFill, ["==", ["literal", 1], 2]);
      safeSetFilter(map, MAP_LAYERS.bgyHighlightLine, ["==", ["literal", 1], 2]);
      if (map.getLayer(MAP_LAYERS.provincesFill)) {
        map.setPaintProperty(MAP_LAYERS.provincesFill, "fill-opacity", [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          0.85,
          0.55,
        ]);
      }
      return;
    }

    const filter = selectionToFilter(sel);
    safeSetFilter(map, MAP_LAYERS.highlightFill, filter);
    safeSetFilter(map, MAP_LAYERS.highlightLine, filter);

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

    const isRegion = sel?.level === "region";
    const isProvince = sel?.level === "province";
    const isMuni =
      sel?.level === "municipality" || sel?.level === "barangay";

    safeSetVisibility(map, MAP_LAYERS.muniFill, "visible");
    safeSetVisibility(map, MAP_LAYERS.muniHighlightFill, "visible");
    safeSetVisibility(map, MAP_LAYERS.muniHighlightLine, "visible");

    if (map.getLayer(MAP_LAYERS.muniLine)) {
      map.setPaintProperty(
        MAP_LAYERS.muniLine,
        "line-width",
        isRegion ? 0.85 : 1
      );
      map.setPaintProperty(MAP_LAYERS.muniLine, "line-opacity", isRegion ? 1 : 0.9);
      map.setPaintProperty(
        MAP_LAYERS.muniLine,
        "line-color",
        isRegion ? "#334155" : "#0f172a"
      );
    }

    if (map.getLayer(MAP_LAYERS.muniFill)) {
      if (isRegion) {
        map.setPaintProperty(MAP_LAYERS.muniFill, "fill-opacity", [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          0.12,
          0.02,
        ]);
      } else if (isMuni && sel.municipalityPsgc) {
        map.setPaintProperty(MAP_LAYERS.muniFill, "fill-opacity", [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          0.75,
          [
            "case",
            ["==", ["to-number", ["get", "adm3_psgc"]], sel.municipalityPsgc],
            0.5,
            0.18,
          ],
        ]);
      } else if (isProvince && sel.provincePsgc) {
        map.setPaintProperty(MAP_LAYERS.muniFill, "fill-opacity", [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          0.7,
          [
            "case",
            ["==", ["to-number", ["get", "adm2_psgc"]], sel.provincePsgc],
            0.45,
            0.12,
          ],
        ]);
      } else if (bgyLoadedRef.current) {
        map.setPaintProperty(MAP_LAYERS.muniFill, "fill-opacity", [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          0.35,
          0.12,
        ]);
      } else {
        map.setPaintProperty(MAP_LAYERS.muniFill, "fill-opacity", [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          0.7,
          0.45,
        ]);
      }
    }

    // Dim areas outside the current drill-down focus
    if (map.getLayer(MAP_LAYERS.provincesFill)) {
      if (isMuni && sel.provincePsgc) {
        map.setPaintProperty(MAP_LAYERS.provincesFill, "fill-opacity", [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          0.85,
          [
            "case",
            ["==", ["to-number", ["get", "adm2_psgc"]], sel.provincePsgc],
            0.35,
            0.12,
          ],
        ]);
      } else if (isProvince && sel.provincePsgc) {
        map.setPaintProperty(MAP_LAYERS.provincesFill, "fill-opacity", [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          0.9,
          [
            "case",
            ["==", ["to-number", ["get", "adm2_psgc"]], sel.provincePsgc],
            0.55,
            0.15,
          ],
        ]);
      } else if (isRegion && sel.regionPsgc) {
        map.setPaintProperty(MAP_LAYERS.provincesFill, "fill-opacity", [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          0.9,
          [
            "case",
            ["==", ["to-number", ["get", "adm1_psgc"]], sel.regionPsgc],
            0.65,
            0.2,
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
    if (!map?.isStyleLoaded()) return;

    map.stop();

    if (!sel) {
      map.flyTo({
        center: PH_CENTER,
        zoom: PH_ZOOM,
        duration: 900,
        essential: true,
      });
      return;
    }

    if (sel.mapFocus?.center) {
      map.flyTo({
        center: sel.mapFocus.center,
        zoom: sel.mapFocus.zoom ?? 12,
        duration: 900,
        essential: true,
      });
      return;
    }

    const bounds =
      sel.flyBounds ??
      boundsForSelection(
        sel,
        provincesRef.current,
        muniGeoJsonRef.current,
        bgyGeoJsonRef.current
      );
    if (!bounds) return;

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
  }, []);

  const loadMuniLayer = useCallback(async (map, sel) => {
    if (!map?.isStyleLoaded() || !sel) return null;

    let cacheKey;
    let geojson;

    if (sel.level === "region" && sel.regionPsgc) {
      cacheKey = `region:${sel.regionPsgc}`;
      if (muniLoadedRef.current === cacheKey && muniGeoJsonRef.current) {
        return muniGeoJsonRef.current;
      }
      geojson = await loadMunicipalitiesForRegion(
        manifestRef.current,
        sel.regionPsgc
      );
    } else if (sel.provincePsgc) {
      cacheKey = `province:${sel.provincePsgc}`;
      if (muniLoadedRef.current === cacheKey && muniGeoJsonRef.current) {
        return muniGeoJsonRef.current;
      }
      geojson = await loadMunicipalities(sel.provincePsgc);
    } else {
      return null;
    }

    if (!mapRef.current || mapRef.current !== map) return null;
    map.getSource("municipalities")?.setData(geojson);
    muniLoadedRef.current = cacheKey;
    muniGeoJsonRef.current = geojson;
    safeSetVisibility(map, MAP_LAYERS.muniFill, "visible");
    safeSetVisibility(map, MAP_LAYERS.muniLine, "visible");
    safeSetVisibility(map, MAP_LAYERS.muniHighlightFill, "visible");
    safeSetVisibility(map, MAP_LAYERS.muniHighlightLine, "visible");
    return geojson;
  }, []);

  const hideBgyLayer = useCallback((map) => {
    if (!map?.isStyleLoaded()) return;
    bgyLoadedRef.current = null;
    bgyGeoJsonRef.current = null;
    for (const id of [
      MAP_LAYERS.bgyFill,
      MAP_LAYERS.bgyLine,
      MAP_LAYERS.bgyHighlightFill,
      MAP_LAYERS.bgyHighlightLine,
    ]) {
      safeSetVisibility(map, id, "none");
    }
    map.getSource("barangays")?.setData({
      type: "FeatureCollection",
      features: [],
    });
  }, []);

  const loadBgyLayer = useCallback(
    async (map, municipalityPsgc) => {
      if (!map?.isStyleLoaded()) return null;
      if (bgyLoadedRef.current === municipalityPsgc && bgyGeoJsonRef.current) {
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
      for (const id of [
        MAP_LAYERS.bgyFill,
        MAP_LAYERS.bgyLine,
        MAP_LAYERS.bgyHighlightFill,
        MAP_LAYERS.bgyHighlightLine,
      ]) {
        safeSetVisibility(map, id, "visible");
      }
      return geojson;
    },
    [hideBgyLayer]
  );

  const hideMuniLayer = useCallback((map) => {
    if (!map?.isStyleLoaded()) return;
    muniLoadedRef.current = null;
    muniGeoJsonRef.current = null;
    for (const id of [
      MAP_LAYERS.muniFill,
      MAP_LAYERS.muniLine,
      MAP_LAYERS.muniHighlightFill,
      MAP_LAYERS.muniHighlightLine,
    ]) {
      safeSetVisibility(map, id, "none");
    }
    map.getSource("municipalities")?.setData({
      type: "FeatureCollection",
      features: [],
    });
  }, []);

  const syncSelectionToMap = useCallback(
    async (map) => {
      if (!map) return;

      const syncGen = ++syncGenRef.current;
      await waitForMapStyle(map);
      if (syncGen !== syncGenRef.current) return;

      const sel = selectionRef.current;

      if (!sel || sel.level === "country") {
        hideMuniLayer(map);
        hideBgyLayer(map);
        if (syncGen !== syncGenRef.current) return;
        applyHighlight(map, null);
        flyCameraToSelection(map, null);
        return;
      }

      const needsMuniLayer =
        (sel.level === "region" && sel.regionPsgc) ||
        ((sel.level === "province" ||
          sel.level === "municipality" ||
          sel.level === "barangay") &&
          sel.provincePsgc);

      if (needsMuniLayer) {
        await loadMuniLayer(map, sel);
      } else {
        hideMuniLayer(map);
      }

      if (syncGen !== syncGenRef.current) return;

      const latestForBgy = selectionRef.current;
      const showBarangays =
        (latestForBgy?.level === "municipality" ||
          latestForBgy?.level === "barangay") &&
        hasBarangayMap(barangaysIndex, latestForBgy.municipalityPsgc);

      if (showBarangays) {
        await loadBgyLayer(map, latestForBgy.municipalityPsgc);
      } else {
        hideBgyLayer(map);
      }

      if (syncGen !== syncGenRef.current) return;

      const latest = selectionRef.current;
      applyHighlight(map, latest);
      flyCameraToSelection(map, latest);
    },
    [
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
            paint: BASE_LINE_PAINT,
          },
          {
            id: MAP_LAYERS.muniFill,
            type: "fill",
            source: "municipalities",
            layout: { visibility: "none" },
            paint: {
              "fill-color": "#38bdf8",
              "fill-opacity": [
                "case",
                ["boolean", ["feature-state", "hover"], false],
                0.7,
                0.45,
              ],
            },
          },
          {
            id: MAP_LAYERS.muniLine,
            type: "line",
            source: "municipalities",
            layout: { visibility: "none" },
            paint: { "line-color": "#0f172a", "line-width": 1 },
          },
          {
            id: MAP_LAYERS.bgyFill,
            type: "fill",
            source: "barangays",
            layout: { visibility: "none" },
            paint: {
              "fill-color": "#fbbf24",
              "fill-opacity": [
                "case",
                ["boolean", ["feature-state", "hover"], false],
                0.75,
                0.5,
              ],
            },
          },
          {
            id: MAP_LAYERS.bgyLine,
            type: "line",
            source: "barangays",
            layout: { visibility: "none" },
            paint: { "line-color": "#78350f", "line-width": 0.6 },
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

    const setHover = (id, source) => {
      const prev = hoveredRef.current;
      if (
        prev.id !== null &&
        (prev.id !== id || prev.source !== source)
      ) {
        map.setFeatureState({ source: prev.source, id: prev.id }, { hover: false });
      }
      hoveredRef.current =
        id !== null ? { id, source } : { id: null, source: null };
      if (id !== null) {
        map.setFeatureState({ source, id }, { hover: true });
      }
    };

    const sourceForLayer = (layerId) => {
      if (layerId === MAP_LAYERS.bgyFill) return "barangays";
      if (layerId === MAP_LAYERS.muniFill) return "municipalities";
      return "provinces";
    };

    const queryFeaturesAt = (point) => {
      const layers = interactiveLayers(
        map,
        bgyLoadedRef.current,
        muniLoadedRef.current
      );
      if (!layers.length) return null;
      const features = map.queryRenderedFeatures(point, { layers });
      return pickDeepestFeature(features);
    };

    const onPointerMove = (e) => {
      const feature = queryFeaturesAt(e.point);
      map.getCanvas().style.cursor = feature ? "pointer" : "";
      if (feature?.id != null && feature.layer?.id) {
        setHover(feature.id, sourceForLayer(feature.layer.id));
      } else {
        setHover(null, null);
      }
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

      const feature = queryFeaturesAt(e.point);
      if (feature) {
        const sel = selectionFromMapClick(
          feature,
          manifestRef.current,
          selectionRef.current
        );
        if (sel) onSelectRef.current(sel);
        return;
      }

      if (selectionRef.current) {
        setHover(null, null);
        onSelectRef.current(null);
      }
    };

    map.on("load", () => {
      mapReadyRef.current = true;
      setMapLoadId((n) => n + 1);
    });

    map.on("mousedown", onMouseDown);
    map.on("mousemove", onPointerMove);
    map.on("click", onMapClick);

    mapRef.current = map;

    return () => {
      mapReadyRef.current = false;
      map.off("mousedown", onMouseDown);
      map.off("mousemove", onPointerMove);
      map.off("click", onMapClick);
      map.remove();
      mapRef.current = null;
      container.innerHTML = "";
    };
  }, [provincesGeoJson]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || mapLoadId === 0) return;
    syncSelectionToMap(map);
  }, [selection, flyTrigger, mapLoadId, syncSelectionToMap]);

  const muniHasBarangayMap = hasBarangayMap(
    barangaysIndex,
    selection?.municipalityPsgc
  );

  const hint = !selection
    ? "Click a province to explore a region"
    : selection.level === "barangay"
      ? "Barangay selected · click sea or breadcrumb to go back"
      : selection.level === "municipality" && muniHasBarangayMap
        ? "Click a barangay, another municipality, or the sea"
        : selection.level === "municipality"
          ? "Click another area or the sea to go back"
          : selection.level === "province"
            ? "Click a municipality, province, or the sea"
            : selection.level === "region"
              ? "Click a municipality or province to drill down"
              : "Click the map to explore";

  return (
    <div className="map-wrap">
      <div ref={containerRef} className="map-container" />
      <div className="map-hint">{hint}</div>
    </div>
  );
}
