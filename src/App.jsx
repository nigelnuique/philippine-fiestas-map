import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import FiestaMap from "./components/FiestaMap.jsx";
import Sidebar from "./components/Sidebar.jsx";
import {
  loadManifest,
  loadFestivals,
  loadAllProvinces,
  loadMunicipalitiesIndex,
  loadBarangaysIndex,
  loadBarangayFiestasForMunicipality,
  resolveSelectionFlyBounds,
} from "./lib/data.js";
import { buildFestivalIndex } from "./lib/festivalIndex.js";
import { selectionFromFestival } from "./lib/mapUtils.js";
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
  const [mapFlyTrigger, setMapFlyTrigger] = useState(0);
  const [barangayFestivals, setBarangayFestivals] = useState([]);
  const selectionSeqRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const [m, f, muniIndex, bgyIndex] = await Promise.all([
          loadManifest(),
          loadFestivals(),
          loadMunicipalitiesIndex(),
          loadBarangaysIndex(),
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
    const muniPsgc = selection?.municipalityPsgc;

    if (!muniPsgc) {
      setBarangayFestivals([]);
      return;
    }

    loadBarangayFiestasForMunicipality(muniPsgc).then((list) => {
      if (!cancelled) setBarangayFestivals(list);
    });

    return () => {
      cancelled = true;
    };
  }, [selection?.municipalityPsgc]);

  const applyMapSelection = useCallback(async (sel, { festivalId = null } = {}) => {
    const seq = ++selectionSeqRef.current;
    setActiveFestivalId(festivalId);
    if (!sel) {
      setSelection(null);
      setMapFlyTrigger((n) => n + 1);
      return;
    }
    const flyBounds = sel.flyBounds ?? (await resolveSelectionFlyBounds(sel));
    if (seq !== selectionSeqRef.current) return;
    setSelection({
      ...sel,
      ...(festivalId ? { festivalId } : {}),
      ...(flyBounds ? { flyBounds } : {}),
    });
    setMapFlyTrigger((n) => n + 1);
  }, []);

  const handleNavigate = useCallback(
    (crumb) => {
      if (crumb.level === "country") {
        applyMapSelection(null);
        return;
      }
      applyMapSelection({
        level: crumb.level,
        regionPsgc: crumb.regionPsgc,
        regionName: crumb.regionName,
        provincePsgc: crumb.provincePsgc,
        provinceName: crumb.provinceName,
        municipalityPsgc: crumb.municipalityPsgc,
        municipalityName: crumb.municipalityName,
        barangayPsgc: crumb.barangayPsgc,
        barangayName: crumb.barangayName,
      });
    },
    [applyMapSelection]
  );

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
      if (!sel) return;
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
        manifest={manifest}
        municipalitiesIndex={municipalitiesIndex}
        barangaysIndex={barangaysIndex}
        loading={loading}
        onNavigate={handleNavigate}
        onRegionSelect={handleRegionSelect}
        onProvinceSelect={handleProvinceSelect}
        onMunicipalitySelect={handleMunicipalitySelect}
        onBarangaySelect={handleBarangaySelect}
        onFestivalSelect={handleFestivalSelect}
        activeFestivalId={activeFestivalId}
        stats={festivalData?.stats}
      />
      {provincesGeoJson && manifest ? (
        <FiestaMap
          provincesGeoJson={provincesGeoJson}
          manifest={manifest}
          barangaysIndex={barangaysIndex}
          selection={selection}
          flyTrigger={mapFlyTrigger}
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
