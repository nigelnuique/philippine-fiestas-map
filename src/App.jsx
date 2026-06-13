import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import FiestaMap from "./components/FiestaMap.jsx";
import Sidebar from "./components/Sidebar.jsx";import {
  loadManifest,
  loadFestivals,
  loadAllProvinces,
  loadMunicipalitiesIndex,
  loadBarangaysIndex,
  loadBarangayFiestaIndex,
  loadBarangayFiestasForMunicipality,
  resolveMunicipalityBounds,
  resolveSelectionFlyBounds,
} from "./lib/data.js";
import {
  buildFestivalIndex,
  defaultBarangayFestival,
} from "./lib/festivalIndex.js";
import { boundsForSelection, selectionFromFestival, selectionTargetKey } from "./lib/mapUtils.js";import { normalizePsgc } from "./lib/psgc.js";
import "./App.css";

export default function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [manifest, setManifest] = useState(null);
  const [provincesGeoJson, setProvincesGeoJson] = useState(null);
  const [festivalData, setFestivalData] = useState(null);
  const [municipalitiesIndex, setMunicipalitiesIndex] = useState(null);
  const [barangaysIndex, setBarangaysIndex] = useState(null);
  const [selection, setSelection] = useState(null);
  const [activeFestivalId, setActiveFestivalId] = useState(null);
  const [selectionRevision, setSelectionRevision] = useState(0);
  const [barangayFestivals, setBarangayFestivals] = useState([]);
  const [barangayFestivalsLoading, setBarangayFestivalsLoading] = useState(false);
  const [festivalSelectNotice, setFestivalSelectNotice] = useState(null);
  const selectionSeqRef = useRef(0);
  const autoSelectedBarangayRef = useRef(null);
  const selectionRef = useRef(null);
  const provincesGeoJsonRef = useRef(null);
  provincesGeoJsonRef.current = provincesGeoJson;
  selectionRef.current = selection;
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const [m, f, muniIndex, bgyIndex] = await Promise.all([
          loadManifest(),
          loadFestivals(),
          loadMunicipalitiesIndex(),
          loadBarangaysIndex(),
          loadBarangayFiestaIndex().catch(() => null),
        ]);
        const provinces = await loadAllProvinces(m);
        if (!cancelled) {
          setManifest(m);
          setFestivalData(f);
          setMunicipalitiesIndex(muniIndex);
          setBarangaysIndex(bgyIndex);
          setProvincesGeoJson(provinces);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  const festivalIndex = useMemo(
    () =>
      festivalData && manifest
        ? buildFestivalIndex(festivalData, manifest)
        : null,
    [festivalData, manifest]
  );

  useEffect(() => {
    let cancelled = false;
    const muniPsgc = normalizePsgc(selection?.municipalityPsgc);
    const atMunicipality =
      selection?.level === "municipality" || selection?.level === "barangay";

    if (!muniPsgc || !atMunicipality) {
      setBarangayFestivals([]);
      setBarangayFestivalsLoading(false);
      return;
    }

    setBarangayFestivalsLoading(true);

    loadBarangayFiestasForMunicipality(muniPsgc)
      .then((list) => {
        if (!cancelled) {
          setBarangayFestivals(list);
          setBarangayFestivalsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBarangayFestivals([]);
          setBarangayFestivalsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selection?.municipalityPsgc, selection?.level]);

  useEffect(() => {
    const bgyPsgc = normalizePsgc(selection?.barangayPsgc);

    if (selection?.level !== "barangay" || !festivalIndex || barangayFestivalsLoading) {
      if (selection?.level !== "barangay") {
        autoSelectedBarangayRef.current = null;
      }
      return;
    }

    if (bgyPsgc == null) return;

    if (activeFestivalId) {
      autoSelectedBarangayRef.current = bgyPsgc;
      return;
    }

    const festival = defaultBarangayFestival(
      festivalIndex,
      selection,
      barangayFestivals
    );

    const alreadyHandled = autoSelectedBarangayRef.current === bgyPsgc;
    if (alreadyHandled && (activeFestivalId || !festival)) return;

    autoSelectedBarangayRef.current = bgyPsgc;
    setActiveFestivalId(festival?.id ?? null);
  }, [
    selection,
    festivalIndex,
    barangayFestivals,
    barangayFestivalsLoading,
    activeFestivalId,
  ]);

  const normalizeSelection = useCallback((sel) => {
    if (!sel) return null;
    return {
      ...sel,
      regionPsgc: normalizePsgc(sel.regionPsgc),
      provincePsgc: normalizePsgc(sel.provincePsgc),
      municipalityPsgc: normalizePsgc(sel.municipalityPsgc),
      barangayPsgc: normalizePsgc(sel.barangayPsgc),
    };
  }, []);

  const applyMapSelection = useCallback(async (sel, { festivalId = null } = {}) => {
    const nextKey = selectionTargetKey(sel, festivalId);
    const currentKey = selectionTargetKey(selectionRef.current, activeFestivalId);
    if (nextKey === currentKey) return;

    const seq = ++selectionSeqRef.current;
    setActiveFestivalId(festivalId);
    if (!festivalId) setFestivalSelectNotice(null);
    if (!sel) {
      setSelection(null);
      setSelectionRevision((n) => n + 1);
      return;
    }

    const normalized = normalizeSelection(sel);
    const immediateFlyBounds =
      boundsForSelection(normalized, provincesGeoJsonRef.current, null, null) ??
      normalized.flyBounds;
    setSelection({
      ...normalized,
      ...(festivalId ? { festivalId } : {}),
      ...(immediateFlyBounds ? { flyBounds: immediateFlyBounds } : {}),
    });
    setSelectionRevision((n) => n + 1);
    try {
      let flyBounds = immediateFlyBounds;
      if (
        !flyBounds &&
        normalized.municipalityPsgc &&
        normalized.provincePsgc &&
        (normalized.level === "municipality" || normalized.level === "barangay")
      ) {
        flyBounds = await resolveMunicipalityBounds(
          normalized.provincePsgc,
          normalized.municipalityPsgc
        );
      }
      if (!flyBounds) {
        flyBounds = await resolveSelectionFlyBounds(normalized);
      }
      if (seq !== selectionSeqRef.current) return;
      if (!flyBounds) return;
      const boundsUnchanged =
        immediateFlyBounds &&
        flyBounds[0][0] === immediateFlyBounds[0][0] &&
        flyBounds[0][1] === immediateFlyBounds[0][1] &&
        flyBounds[1][0] === immediateFlyBounds[1][0] &&
        flyBounds[1][1] === immediateFlyBounds[1][1];
      if (boundsUnchanged) return;
      setSelection((prev) =>
        prev && seq === selectionSeqRef.current
          ? { ...prev, flyBounds }
          : prev
      );
      setSelectionRevision((n) => n + 1);
    } catch {
      // Selection already applied; bounds resolution is best-effort.
    }
  }, [normalizeSelection, activeFestivalId]);
  const handleRegionSelect = useCallback(
    (region) => {
      applyMapSelection({
        level: "region",
        regionPsgc: region.psgc,
        regionName: region.name,
      });
    },
    [applyMapSelection]
  );

  const handleProvinceSelect = useCallback(
    (province, regionSelection) => {
      applyMapSelection({
        level: "province",
        regionPsgc: regionSelection.regionPsgc,
        regionName: regionSelection.regionName,
        provincePsgc: province.psgc,
        provinceName: province.name,
      });
    },
    [applyMapSelection]
  );

  const handleMunicipalitySelect = useCallback(
    (municipality, provinceSelection) => {
      applyMapSelection({
        level: "municipality",
        regionPsgc: provinceSelection.regionPsgc,
        regionName: provinceSelection.regionName,
        provincePsgc: provinceSelection.provincePsgc,
        provinceName: provinceSelection.provinceName,
        municipalityPsgc: municipality.psgc,
        municipalityName: municipality.name,
      });
    },
    [applyMapSelection]
  );

  const handleBarangaySelect = useCallback(
    (barangay, municipalitySelection) => {
      applyMapSelection({
        level: "barangay",
        regionPsgc: municipalitySelection.regionPsgc,
        regionName: municipalitySelection.regionName,
        provincePsgc: municipalitySelection.provincePsgc,
        provinceName: municipalitySelection.provinceName,
        municipalityPsgc: municipalitySelection.municipalityPsgc,
        municipalityName: municipalitySelection.municipalityName,
        barangayPsgc: barangay.psgc,
        barangayName: barangay.name,
      });
    },
    [applyMapSelection]
  );

  const handleFestivalSelect = useCallback(
    async (festival) => {
      if (!festivalIndex || !manifest) return;
      const sel = selectionFromFestival(
        festival,
        festivalIndex,
        manifest,
        municipalitiesIndex,
        barangaysIndex
      );
      if (!sel) {
        setFestivalSelectNotice(
          `Could not locate “${festival.name}” on the map — location data is incomplete.`
        );
        return;
      }
      setFestivalSelectNotice(null);
      await applyMapSelection(sel, { festivalId: festival.id });
    },
    [festivalIndex, manifest, municipalitiesIndex, barangaysIndex, applyMapSelection]
  );

  if (error) {
    return (
      <div className="app-error">
        <h2>Could not load map data</h2>
        <p>{error}</p>
        <p>
          Run <code>npm run map:sync</code> and <code>npm run dev</code> after
          cloning boundary sources.
        </p>
      </div>
    );
  }

  return (
    <div className="app">
      <Sidebar
        selection={selection}
        festivalIndex={festivalIndex}
        barangayFestivals={barangayFestivals}
        barangayFestivalsLoading={barangayFestivalsLoading}
        manifest={manifest}
        municipalitiesIndex={municipalitiesIndex}
        barangaysIndex={barangaysIndex}
        loading={loading}
        onRegionSelect={handleRegionSelect}
        onCountrySelect={() => applyMapSelection(null)}
        onProvinceSelect={handleProvinceSelect}
        onMunicipalitySelect={handleMunicipalitySelect}
        onBarangaySelect={handleBarangaySelect}
        onFestivalSelect={handleFestivalSelect}
        activeFestivalId={activeFestivalId}
        festivalSelectNotice={festivalSelectNotice}
        stats={festivalData?.stats}
      />
      {provincesGeoJson && manifest ? (
        <FiestaMap
          provincesGeoJson={provincesGeoJson}
          manifest={manifest}
          barangaysIndex={barangaysIndex}
          selection={selection}
          selectionRevision={selectionRevision}
          onSelect={(sel) => {
            applyMapSelection(sel);
          }}
        />
      ) : (
        <div className="map-loading">
          <div className="map-loading-spinner" />
          <p>Loading Philippine boundaries…</p>
        </div>
      )}
    </div>
  );
}
