import { Fragment } from "react";
import {
  PROJECT_REPO,
  DATA_SOURCE_GROUPS,
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
  let lastCategory = null;

  return groups.map((group) => {
    const showCategoryDivider =
      lastCategory !== null && group.category !== lastCategory;
    lastCategory = group.category;

    return (
      <Fragment key={group.title}>
        {showCategoryDivider ? (
          <div
            className="sidebar-source-category-divider"
            role="separator"
            aria-hidden="true"
          />
        ) : null}
        <section className="sidebar-footer-section">
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
      </Fragment>
    );
  });
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
        <a href={PROJECT_REPO.url} target="_blank" rel="noopener noreferrer">
          {PROJECT_REPO.label}
        </a>
      </p>
      <p className="sidebar-attribution-tagline">{DISCLAIMER_TAGLINE}</p>
      <InlineSourceLinks label="Map" sources={PRIMARY_DATA_SOURCES} />
      <InlineSourceLinks label="Fiestas" sources={PRIMARY_FIESTA_DATA_SOURCES} />
      <details className="sidebar-footer-details">
        <summary>Data sources &amp; references</summary>
        <div className="sidebar-footer-panel">
          <SourceGroupList groups={DATA_SOURCE_GROUPS} />
        </div>
      </details>
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
          <p className="sidebar-footer-footnote">{DISCLAIMER_FOOTNOTE}</p>
        </div>
      </details>
    </footer>
  );
}
