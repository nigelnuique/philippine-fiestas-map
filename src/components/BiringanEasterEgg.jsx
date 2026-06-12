import "./BiringanEasterEgg.css";

export default function BiringanEasterEgg() {
  return (
    <article className="biringan-egg" aria-label="Biringan City easter egg">
      <p className="biringan-egg-eyebrow">Between here and elsewhere</p>
      <h3 className="biringan-egg-title">Biringan City</h3>
      <p className="biringan-egg-lede">
        The invisible city of legend — said to appear only to those who are
        already lost, and vanish the moment you try to pin it on a map.
      </p>
      <dl className="biringan-egg-facts">
        <div>
          <dt>Patron</dt>
          <dd>Unknown (the bells ring from nowhere)</dd>
        </div>
        <div>
          <dt>Feast day</dt>
          <dd>When the mist lifts at midnight</dd>
        </div>
        <div>
          <dt>Coordinates</dt>
          <dd>—</dd>
        </div>
      </dl>
      <p className="biringan-egg-footnote">
        No polygon. No PSGC code. Just a story passed around campfires in Samar —
        and now, apparently, your search bar.
      </p>
    </article>
  );
}
