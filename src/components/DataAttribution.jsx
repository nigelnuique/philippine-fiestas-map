import {
  CREATOR,
  FIESTA_DATA_SOURCE_GROUPS,
  MAP_DATA_SOURCE_GROUPS,
  PRIMARY_DATA_SOURCES,
  PRIMARY_FIESTA_DATA_SOURCES,
} from "../lib/attribution.js";
import {
  DISCLAIMER_FOOTNOTE,
  DISCLAIMER_TAGLINE,
  LEGAL_DISCLAIMER_SECTIONS,
} from "../lib/disclaimers.js";
import "./DataAttribution.css";

function SourceGroupList({ groups }) {
  return groups.map((group) => (
    <section key={group.title} className="sidebar-footer-section">
      <h3>{group.title}</h3>
      <ul>
        {group.sources.map((src) => (
          <li key={`${group.title}-${src.label}`}>
            <span className="sidebar-data-sources-label">
              {src.url ? (
                <a href={src.url} target="_blank" rel="noopener noreferrer">
                  {src.label}
                </a>
              ) : (
                src.label
              )}
              {src.license ? (
                <span className="sidebar-data-sources-license">{src.license}</span>
              ) : null}
            </span>
            {src.note ? (
              <span className="sidebar-data-sources-note">{src.note}</span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  ));
}

function InlineSourceLinks({ label, sources }) {
  return (
    <p className="sidebar-attribution-primary">
      {label}:{" "}
      {sources.map((src, i) => (
        <span key={src.url ?? src.label}>
          {i > 0 && " · "}
          {src.url ? (
            <a href={src.url} target="_blank" rel="noopener noreferrer">
              {src.label}
            </a>
          ) : (
            src.label
          )}
        </span>
      ))}
    </p>
  );
}

export default function DataAttribution() {
  return (
    <footer className="sidebar-attribution">
      <p>
        Made by{" "}
        <a href={CREATOR.url} target="_blank" rel="noopener noreferrer">
          {CREATOR.name}
        </a>
      </p>
      <p className="sidebar-attribution-tagline">{DISCLAIMER_TAGLINE}</p>
      <InlineSourceLinks label="Map" sources={PRIMARY_DATA_SOURCES} />
      <InlineSourceLinks label="Fiestas" sources={PRIMARY_FIESTA_DATA_SOURCES} />
      <details className="sidebar-footer-details">
        <summary>Terms &amp; disclaimers</summary>
        <div className="sidebar-footer-panel">
          {LEGAL_DISCLAIMER_SECTIONS.map((section) => (
            <section key={section.title} className="sidebar-footer-section">
              <h3>{section.title}</h3>
              {section.paragraphs.map((text) => (
                <p key={text.slice(0, 48)}>{text}</p>
              ))}
            </section>
          ))}
          <section className="sidebar-footer-section sidebar-footer-refs-heading">
            <h3>Fiesta data references</h3>
            <p className="sidebar-footer-refs-intro">
              Festival names, dates, and barangay feast schedules acknowledge these
              sources:
            </p>
          </section>
          <SourceGroupList groups={FIESTA_DATA_SOURCE_GROUPS} />
          <p className="sidebar-footer-footnote">{DISCLAIMER_FOOTNOTE}</p>
        </div>
      </details>
      <details className="sidebar-footer-details">
        <summary>Map &amp; place data</summary>
        <div className="sidebar-footer-panel">
          <SourceGroupList groups={MAP_DATA_SOURCE_GROUPS} />
        </div>
      </details>
    </footer>
  );
}
