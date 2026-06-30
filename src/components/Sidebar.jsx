import { memo, useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  formatFestivalDate,
  festivalsForSelection,
  getFestivalDateBadge,
} from "../lib/festivalIndex.js";
import { lookupBarangaysForMunicipality } from "../lib/data.js";
import { MONTH_NAMES } from "../lib/constants.js";
import { normalizePsgc } from "../lib/psgc.js";
import DataAttribution from "./DataAttribution.jsx";
import BiringanEasterEgg from "./BiringanEasterEgg.jsx";
import { isBiringanEasterEggQuery } from "../lib/biringanEasterEgg.js";
import "./Sidebar.css";
const FESTIVAL_PAGE_SIZE = 120;
const FestivalList = memo(function FestivalList({
  festivals,
  activeFestivalId,
  onFestivalSelect,
}) {
  const [shown, setShown] = useState(FESTIVAL_PAGE_SIZE);
  useEffect(() => {
    setShown(FESTIVAL_PAGE_SIZE);
  }, [festivals]);
  const visible = festivals.slice(0, shown);
  const remaining = festivals.length - visible.length;
  return (
    <>
      <div className="festival-list" role="list">
        {visible.map((f) => {
          const dateBadge = getFestivalDateBadge(f);
          return (
          <button
            key={f.id}
            type="button"
            className={`festival-card${activeFestivalId === f.id ? " festival-card-active" : ""}`}
            role="listitem"
            data-festival-id={f.id}
            onClick={() => onFestivalSelect(f)}
          >
            <div className="festival-card-head">
              <h3>{f.name}</h3>
              <time className="festival-date">{formatFestivalDate(f)}</time>
            </div>
            {(f.barangayName ||
              f.location?.municipality ||
              f.location?.province) && (
              <p className="festival-place">
                {[f.barangayName, f.location?.municipality, f.location?.province]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            )}
            {f.description && <p className="festival-desc">{f.description}</p>}
            <div className="festival-card-footer">
              {dateBadge && (
                <span className={`festival-date-badge festival-date-badge--${dateBadge.variant}`}>
                  {dateBadge.label}
                </span>
              )}
              {f.sourceUrl && (
                <a
                  className="festival-source-link"
                  href={f.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  Source
                </a>
              )}
            </div>
          </button>
        );
        })}
      </div>
      {remaining > 0 && (
        <button
          type="button"
          className="festival-show-more"
          onClick={() => setShown((n) => n + FESTIVAL_PAGE_SIZE)}
        >
          Show {Math.min(remaining, FESTIVAL_PAGE_SIZE)} more (
          {remaining.toLocaleString()} remaining)
        </button>
      )}
    </>
  );
});
const LEVEL_META = {
  region: { label: "Region", color: "#c084fc" },
  province: { label: "Province", color: "#fbbf24" },
  municipality: { label: "Municipality", color: "#38bdf8" },
  barangay: { label: "Barangay", color: "#4ade80" },
};
function LevelBadge({ level }) {
  const meta = LEVEL_META[level];
  if (!meta) return null;
  return (
    <span
      className="level-badge"
      style={{ color: meta.color, borderColor: meta.color }}
    >
      {meta.label}
    </span>
  );
}

function SidebarBanner({ children, variant = "info" }) {
  return (
    <p className={`sidebar-banner sidebar-banner--${variant}`}>{children}</p>
  );
}
function chipStyle(level) {
  const color = LEVEL_META[level]?.color;
  return color ? { "--chip-accent": color } : undefined;
}

export default function Sidebar({
  selection,
  festivalIndex,
  barangayFestivals = [],
  barangayFestivalsLoading = false,
  manifest,
  municipalitiesIndex,
  barangaysIndex,
  loading,
  onRegionSelect,
  onCountrySelect,
  onProvinceSelect,
  onMunicipalitySelect,
  onBarangaySelect,
  onFestivalSelect,
  activeFestivalId,
  festivalSelectNotice,
  monthFilter,
  onMonthFilterChange,
}) {
  const [festivalSearch, setFestivalSearch] = useState("");
  const showBiringanEgg =
    !selection && isBiringanEasterEggQuery(festivalSearch);
  const areaFestivals = useMemo(
    () =>
      festivalIndex
        ? festivalsForSelection(festivalIndex, selection, barangayFestivals)
        : [],
    [festivalIndex, selection, barangayFestivals]
  );
  const visibleFestivals = useMemo(() => {
    if (!festivalIndex) return [];
    if (selection) return areaFestivals;
    const query = festivalSearch.trim().toLowerCase();
    if (!query) {
      if (!monthFilter) return [];
      if (isBiringanEasterEggQuery(festivalSearch)) return [];
      return festivalIndex.festivals
        .filter((f) => f.month === monthFilter)
        .slice(0, 200);
    }
    if (isBiringanEasterEggQuery(query)) return [];
    return festivalIndex.festivals
      .filter((f) => {
        if (monthFilter && f.month !== monthFilter) return false;
        const place = [
          f.location?.municipality,
          f.location?.province,
          f.location?.text,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return f.name.toLowerCase().includes(query) || place.includes(query);
      })
      .slice(0, 80);
  }, [festivalIndex, selection, areaFestivals, festivalSearch, monthFilter]);
  const deferredFestivals = useDeferredValue(visibleFestivals);
  const festivalsPending =
    deferredFestivals !== visibleFestivals && visibleFestivals.length > 0;
  useEffect(() => {
    if (!activeFestivalId) return;
    const frame = requestAnimationFrame(() => {
      document
        .querySelector(`[data-festival-id="${activeFestivalId}"]`)
        ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
    return () => cancelAnimationFrame(frame);
  }, [activeFestivalId]);
  const atCountryView = !selection || selection.level === "country";
  const title = atCountryView
    ? null
    : (selection?.barangayName ??
      selection?.municipalityName ??
      selection?.provinceName ??
      selection?.regionName ??
      null);
  const provincesInRegion = useMemo(() => {
    if (
      !selection?.regionPsgc ||
      !manifest ||
      !(
        selection.level === "region" ||
        selection.level === "province" ||
        selection.level === "municipality" ||
        selection.level === "barangay"
      )
    ) {
      return [];
    }
    return (
      manifest.regions.find((r) => r.psgc === selection.regionPsgc)?.provinceLayer
        ?.provinces ?? []
    );
  }, [selection?.regionPsgc, selection?.level, manifest]);
  const municipalitiesInProvince = useMemo(() => {
    if (
      !selection?.provincePsgc ||
      !municipalitiesIndex ||
      !(
        selection.level === "province" ||
        selection.level === "municipality" ||
        selection.level === "barangay"
      )
    ) {
      return [];
    }
    return (
      municipalitiesIndex[String(selection.provincePsgc)]?.municipalities ?? []
    );
  }, [selection?.provincePsgc, selection?.level, municipalitiesIndex]);
  const barangaysInMunicipality = useMemo(() => {
    if (
      !selection?.municipalityPsgc ||
      !barangaysIndex ||
      !(selection.level === "municipality" || selection.level === "barangay")
    ) {
      return [];
    }
    return (
      lookupBarangaysForMunicipality(barangaysIndex, selection.municipalityPsgc)
        ?.barangays ?? []
    );
  }, [selection?.municipalityPsgc, selection?.level, barangaysIndex]);
  const subtitle =
    selection?.level === "region"
      ? "Click a province on the map to drill down"
      : selection?.level === "province"
        ? "Click a municipality on the map to drill further"
        : selection?.level === "municipality" &&
            barangaysInMunicipality.length > 0
          ? "Click a barangay on the map to drill further"
          : selection?.level === "municipality"
            ? "Fiestas listed below (no barangay map for this area)"
            : selection?.level === "country" || !selection
              ? monthFilter
                ? `${MONTH_NAMES[monthFilter]} festivals — click the map or pick a region`
                : "Search, pick a month, or click the map"
              : `${areaFestivals.length} festival${areaFestivals.length === 1 ? "" : "s"} in this area`;
  const showFestivalSection =
    !loading &&
    (visibleFestivals.length > 0 ||
      (selection &&
        !barangayFestivalsLoading &&
        visibleFestivals.length === 0) ||
      (!selection && monthFilter && visibleFestivals.length > 0));
  return (
    <aside className="sidebar">
      <div className="sidebar-sticky">
        <header className="sidebar-header">
          <h1>Philippine Fiestas</h1>
          <p className="sidebar-tagline">Map · Explore · Celebrate</p>
        </header>
        <div className="sidebar-area">
          {!atCountryView && (
            <div className="sidebar-area-head">
              <LevelBadge level={selection?.level} />
              {title && <h2>{title}</h2>}
            </div>
          )}
          <p className="sidebar-subtitle">{subtitle}</p>
        </div>
        <div className="sidebar-controls">
          <div className="festival-search-wrap">
            <input
              type="search"
              className="festival-search"
              placeholder="Search festivals (e.g. Sinulog, Cebu)…"
              value={festivalSearch}
              onChange={(e) => setFestivalSearch(e.target.value)}
              aria-label="Search festivals"
            />
          </div>
          {atCountryView && onMonthFilterChange && (
            <div className="month-browse-wrap">
              <p className="month-browse-label">Browse by month</p>
              <div className="month-browse-list">
                {MONTH_NAMES.map((name, idx) => {
                  const month = idx + 1;
                  return (
                    <button
                      key={month}
                      type="button"
                      className={`month-chip${monthFilter === month ? " month-chip-active" : ""}`}
                      onClick={() =>
                        onMonthFilterChange(monthFilter === month ? null : month)
                      }
                    >
                      {name.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="sidebar-body">
        {selection && onCountrySelect && (
          <div className="region-picker" style={chipStyle("region")}>
            <p className="region-picker-label">Navigate</p>
            <div className="region-picker-list">
              <button
                type="button"
                className="region-chip"
                onClick={() => onCountrySelect()}
              >
                Philippines
              </button>
            </div>
          </div>
        )}
        {manifest && (
          <div className="region-picker" style={chipStyle("region")}>
            <p className="region-picker-label">Regions</p>
            <div className="region-picker-list">
              {manifest.regions.map((region) => (
                <button
                  key={region.psgc}
                  type="button"
                  className={`region-chip${
                    normalizePsgc(selection?.regionPsgc) ===
                      normalizePsgc(region.psgc) && selection?.regionPsgc
                      ? " region-chip-active"
                      : ""
                  }`}
                  onClick={() => onRegionSelect(region)}
                >
                  {region.name.replace(/^Region\s+/i, "").replace(/ – .+$/, "")}
                </button>
              ))}
            </div>
          </div>
        )}
        {provincesInRegion.length > 0 && (
          <div className="region-picker" style={chipStyle("province")}>
            <p className="region-picker-label">
              Provinces in {selection.regionName}
            </p>
            <div className="region-picker-list">
              {provincesInRegion.map((prov) => (
                <button
                  key={prov.psgc}
                  type="button"
                  className={`region-chip${
                    normalizePsgc(selection.provincePsgc) ===
                      normalizePsgc(prov.psgc) && selection.provincePsgc
                      ? " region-chip-active"
                      : ""
                  }`}
                  onClick={() => onProvinceSelect(prov, selection)}
                >
                  {prov.name}
                </button>
              ))}
            </div>
          </div>
        )}
        {municipalitiesInProvince.length > 0 && (
          <div
            className="region-picker region-picker-scroll"
            style={chipStyle("municipality")}
          >
            <p className="region-picker-label">
              Municipalities in {selection.provinceName}
            </p>
            <div className="region-picker-list">
              {municipalitiesInProvince.map((muni) => (
                <button
                  key={muni.psgc}
                  type="button"
                  className={`region-chip${normalizePsgc(selection.municipalityPsgc) === normalizePsgc(muni.psgc) ? " region-chip-active" : ""}`}
                  onClick={() => onMunicipalitySelect(muni, selection)}
                >
                  {muni.name.replace(/^City of\s+/i, "")}
                </button>
              ))}
            </div>
          </div>
        )}
        {barangaysInMunicipality.length > 0 && (
          <div
            className="region-picker region-picker-scroll"
            style={chipStyle("barangay")}
          >
            <p className="region-picker-label">
              Barangays in {selection.municipalityName}
            </p>
            <div className="region-picker-list">
              {barangaysInMunicipality.map((bgy) => (
                <button
                  key={bgy.psgc}
                  type="button"
                  className={`region-chip${normalizePsgc(selection.barangayPsgc) === normalizePsgc(bgy.psgc) ? " region-chip-active" : ""}`}
                  onClick={() => onBarangaySelect(bgy, selection)}
                >
                  {bgy.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading && <p className="festival-empty">Loading map data…</p>}
        {!loading && !selection && !festivalSearch.trim() && !monthFilter && (
          <p className="festival-empty">
            Search for a festival, browse by month above, pick a region, or
            click a province on the map.
          </p>
        )}
        {!loading &&
          !selection &&
          monthFilter &&
          !festivalSearch.trim() &&
          visibleFestivals.length === 0 && (
            <p className="festival-empty">
              No festivals listed for {MONTH_NAMES[monthFilter]} in our dataset.
            </p>
          )}
        {festivalSelectNotice && (
          <SidebarBanner variant="notice">{festivalSelectNotice}</SidebarBanner>
        )}
        {!loading && showBiringanEgg && <BiringanEasterEgg />}
        {!loading &&
          !selection &&
          festivalSearch.trim() &&
          visibleFestivals.length === 0 &&
          !showBiringanEgg && (
            <p className="festival-empty">No festivals match that search.</p>
          )}
        {!loading &&
          selection &&
          barangayFestivalsLoading &&
          visibleFestivals.length === 0 && (
            <p className="festival-empty">Loading barangay fiestas…</p>
          )}
        {!loading &&
          selection &&
          !barangayFestivalsLoading &&
          visibleFestivals.length === 0 && (
            <p className="festival-empty">
              No festivals are listed for this area in our dataset.
            </p>
          )}
        {selection?.level === "municipality" &&
          barangayFestivals.length > 0 && (
            <SidebarBanner variant="info">
              {areaFestivals.length.toLocaleString()} festival
              {areaFestivals.length === 1 ? "" : "s"} in this municipality.
              Click a barangay to filter further.
            </SidebarBanner>
          )}
        {selection?.level === "barangay" &&
          (visibleFestivals.length > 0 || barangayFestivalsLoading) && (
            <SidebarBanner variant="info">
              Festivals in {selection.barangayName}.
            </SidebarBanner>
          )}
        {showFestivalSection && visibleFestivals.length > 0 && (
          <h3 className="festival-section-title">
            Festivals ({visibleFestivals.length.toLocaleString()})
            {festivalsPending && (
              <span className="festival-section-pending"> · updating…</span>
            )}
          </h3>
        )}
        {showFestivalSection && deferredFestivals.length > 0 && (
          <FestivalList
            festivals={deferredFestivals}
            activeFestivalId={activeFestivalId}
            onFestivalSelect={onFestivalSelect}
          />
        )}
      </div>
      <DataAttribution />
    </aside>
  );
}
