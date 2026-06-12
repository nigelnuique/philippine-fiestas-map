import { useEffect } from "react";
import {
  formatFestivalDate,
  festivalsForSelection,
} from "../lib/festivalIndex.js";
import { MONTH_NAMES } from "../lib/constants.js";
import "./Sidebar.css";

function Breadcrumb({ crumbs, onNavigate }) {
  return (
    <nav className="breadcrumb" aria-label="Location">
      {crumbs.map((crumb, i) => (
        <span key={crumb.key}>
          {i > 0 && <span className="breadcrumb-sep">›</span>}
          <button
            type="button"
            className={
              i === crumbs.length - 1 ? "breadcrumb-current" : "breadcrumb-link"
            }
            onClick={() => onNavigate(crumb)}
            disabled={i === crumbs.length - 1 && crumb.level !== "country"}
          >
            {crumb.label}
          </button>
        </span>
      ))}
    </nav>
  );
}

export default function Sidebar({
  selection,
  festivalIndex,
  barangayFestivals = [],
  manifest,
  municipalitiesIndex,
  barangaysIndex,
  loading,
  onNavigate,
  onRegionSelect,
  onProvinceSelect,
  onMunicipalitySelect,
  onBarangaySelect,
  onFestivalSelect,
  activeFestivalId,
  stats,
}) {
  const areaFestivals = festivalIndex
    ? festivalsForSelection(festivalIndex, selection, barangayFestivals)
    : [];
  const visibleFestivals = selection ? areaFestivals : [];

  useEffect(() => {
    if (!activeFestivalId) return;
    document
      .querySelector(`[data-festival-id="${activeFestivalId}"]`)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeFestivalId]);

  const crumbs = [{ key: "ph", label: "Philippines", level: "country" }];
  if (selection?.regionPsgc && selection.regionName) {
    crumbs.push({
      key: `r-${selection.regionPsgc}`,
      label: selection.regionName,
      level: "region",
      regionPsgc: selection.regionPsgc,
      regionName: selection.regionName,
    });
  }
  if (selection?.provincePsgc && selection.provinceName) {
    crumbs.push({
      key: `p-${selection.provincePsgc}`,
      label: selection.provinceName,
      level: "province",
      regionPsgc: selection.regionPsgc,
      regionName: selection.regionName,
      provincePsgc: selection.provincePsgc,
      provinceName: selection.provinceName,
    });
  }
  if (selection?.municipalityPsgc && selection.municipalityName) {
    crumbs.push({
      key: `m-${selection.municipalityPsgc}`,
      label: selection.municipalityName,
      level: "municipality",
      regionPsgc: selection.regionPsgc,
      regionName: selection.regionName,
      provincePsgc: selection.provincePsgc,
      provinceName: selection.provinceName,
      municipalityPsgc: selection.municipalityPsgc,
      municipalityName: selection.municipalityName,
    });
  }
  if (selection?.barangayPsgc && selection.barangayName) {
    crumbs.push({
      key: `b-${selection.barangayPsgc}`,
      label: selection.barangayName,
      level: "barangay",
      regionPsgc: selection.regionPsgc,
      regionName: selection.regionName,
      provincePsgc: selection.provincePsgc,
      provinceName: selection.provinceName,
      municipalityPsgc: selection.municipalityPsgc,
      municipalityName: selection.municipalityName,
      barangayPsgc: selection.barangayPsgc,
      barangayName: selection.barangayName,
    });
  }

  const title =
    selection?.barangayName ??
    selection?.municipalityName ??
    selection?.provinceName ??
    selection?.regionName ??
    "Philippines";

  const provincesInRegion =
    selection?.regionPsgc &&
    manifest &&
    (selection.level === "region" || selection.level === "province")
      ? manifest.regions.find((r) => r.psgc === selection.regionPsgc)
          ?.provinceLayer?.provinces ?? []
      : [];

  const municipalitiesInProvince =
    selection?.provincePsgc &&
    municipalitiesIndex &&
    (selection.level === "province" ||
      selection.level === "municipality" ||
      selection.level === "barangay")
      ? municipalitiesIndex[String(selection.provincePsgc)]?.municipalities ?? []
      : [];

  const barangaysInMunicipality =
    selection?.municipalityPsgc &&
    barangaysIndex &&
    (selection.level === "municipality" || selection.level === "barangay")
      ? barangaysIndex[String(selection.municipalityPsgc)]?.barangays ?? []
      : [];

  const subtitle =
    selection?.level === "region"
      ? "Click a municipality or province on the map to drill down"
      : selection?.level === "province"
        ? "Click a municipality on the map to drill further"
        : selection?.level === "municipality" && barangaysInMunicipality.length > 0
          ? "Click a barangay on the map to drill further"
          : selection?.level === "municipality"
            ? "Fiestas listed below (no barangay map for this area)"
            : selection?.level === "country" || !selection
              ? "Click a region below or on the map"
              : `${areaFestivals.length} festival${areaFestivals.length === 1 ? "" : "s"} in this area`;

  return (
    <aside className="sidebar">
      <header className="sidebar-header">
        <h1>Philippine Fiestas</h1>
        <p className="sidebar-tagline">Map · Explore · Celebrate</p>
      </header>

      <Breadcrumb crumbs={crumbs} onNavigate={onNavigate} />

      <div className="sidebar-area">
        <h2>{title}</h2>
        <p className="sidebar-subtitle">{subtitle}</p>
      </div>

      {manifest && !selection && (
        <div className="region-picker">
          <p className="region-picker-label">Regions</p>
          <div className="region-picker-list">
            {manifest.regions.map((region) => (
              <button
                key={region.psgc}
                type="button"
                className="region-chip"
                onClick={() => onRegionSelect(region)}
              >
                {region.name.replace(/^Region\s+/i, "").replace(/ – .+$/, "")}
              </button>
            ))}
          </div>
        </div>
      )}

      {provincesInRegion.length > 0 && (
        <div className="region-picker">
          <p className="region-picker-label">Provinces in {selection.regionName}</p>
          <div className="region-picker-list">
            {provincesInRegion.map((prov) => (
              <button
                key={prov.psgc}
                type="button"
                className={`region-chip${selection.provincePsgc === prov.psgc ? " region-chip-active" : ""}`}
                onClick={() => onProvinceSelect(prov, selection)}
              >
                {prov.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {municipalitiesInProvince.length > 0 && (
        <div className="region-picker region-picker-scroll">
          <p className="region-picker-label">
            Municipalities in {selection.provinceName}
          </p>
          <div className="region-picker-list">
            {municipalitiesInProvince.map((muni) => (
              <button
                key={muni.psgc}
                type="button"
                className={`region-chip${selection.municipalityPsgc === muni.psgc ? " region-chip-active" : ""}`}
                onClick={() => onMunicipalitySelect(muni, selection)}
              >
                {muni.name.replace(/^City of\s+/i, "")}
              </button>
            ))}
          </div>
        </div>
      )}

      {barangaysInMunicipality.length > 0 && (
        <div className="region-picker region-picker-scroll">
          <p className="region-picker-label">
            Barangays in {selection.municipalityName}
          </p>
          <div className="region-picker-list">
            {barangaysInMunicipality.map((bgy) => (
              <button
                key={bgy.psgc}
                type="button"
                className={`region-chip${selection.barangayPsgc === bgy.psgc ? " region-chip-active" : ""}`}
                onClick={() => onBarangaySelect(bgy, selection)}
              >
                {bgy.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {stats && (
        <div className="sidebar-stats">
          <span>{stats.total} named festivals</span>
          {stats.barangayFiestas > 0 && (
            <span>{stats.barangayFiestas.toLocaleString()} barangay fiestas</span>
          )}
          {stats.totalWithBarangay > 0 && (
            <span>{stats.totalWithBarangay.toLocaleString()} total in database</span>
          )}
        </div>
      )}

      <div className="festival-list" role="list">
        {loading && <p className="festival-empty">Loading map data…</p>}
        {!loading && !selection && (
          <p className="festival-empty">
            Select a region to browse festivals in that area.
          </p>
        )}
        {!loading && selection && visibleFestivals.length === 0 && (
          <p className="festival-empty">
            No festival data for this area yet. More fiestas are being added.
          </p>
        )}
        {selection?.level === "municipality" && barangayFestivals.length > 0 && (
          <p className="festival-empty" style={{ opacity: 0.85 }}>
            Showing {areaFestivals.length} festivals in this municipality
            ({barangayFestivals.length} barangay fiestas). Click a barangay to
            filter further.
          </p>
        )}
        {selection?.level === "barangay" && (
          <p className="festival-empty" style={{ opacity: 0.85 }}>
            Showing festivals for {selection.barangayName}.
          </p>
        )}
        {visibleFestivals.map((f) => (
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
            {(f.barangayName || f.location?.municipality || f.location?.province) && (
              <p className="festival-place">
                {[f.barangayName, f.location?.municipality, f.location?.province]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            )}
            {f.description && (
              <p className="festival-desc">{f.description}</p>
            )}
            {f.month && (
              <span className="festival-month">{MONTH_NAMES[f.month]}</span>
            )}
          </button>
        ))}
      </div>
    </aside>
  );
}
