/**
 * Festival deduplication across seed, TPB, and other sources.
 */

const STOP_TOKENS = new Set([
  "the",
  "of",
  "de",
  "sa",
  "festival",
  "fiesta",
  "feast",
  "celebration",
  "annual",
]);

/**
 * Normalizes festival names for cross-source deduplication.
 */
export function normalizeFestivalName(name) {
  return String(name)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u2013\u2014–—-]/g, " ")
    .replace(/^the\s+/, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function nameTokens(name) {
  return normalizeFestivalName(name)
    .split(" ")
    .filter((w) => w.length > 2 && !STOP_TOKENS.has(w));
}

/**
 * True when two festival names refer to the same event (exact or fuzzy).
 */
export function namesAreDuplicates(nameA, nameB) {
  const normA = normalizeFestivalName(nameA);
  const normB = normalizeFestivalName(nameB);
  if (normA === normB) return true;

  const tokensA = nameTokens(nameA);
  const tokensB = nameTokens(nameB);
  if (!tokensA.length || !tokensB.length) return false;

  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  const [smaller, larger] =
    tokensA.length <= tokensB.length ? [tokensA, setB] : [tokensB, setA];

  if (smaller.length >= 1 && smaller.every((t) => larger.has(t))) {
    return true;
  }

  const intersection = tokensA.filter((t) => setB.has(t));
  const union = new Set([...tokensA, ...tokensB]);
  return intersection.length / union.size >= 0.6;
}

/**
 * True when two resolved locations are the same place (or overlapping).
 */
export function locationsOverlap(locA, locB) {
  if (!locA || !locB) return false;

  if (locA.psgc && locB.psgc) {
    return Number(locA.psgc) === Number(locB.psgc);
  }

  if (locA.provincePsgc && locB.provincePsgc) {
    if (Number(locA.provincePsgc) !== Number(locB.provincePsgc)) {
      return false;
    }

    // Same province; if one has a municipality PSGC and the other doesn't, still overlap
    // (e.g. seed Giant Lantern in San Fernando vs TPB province-level row).
    if (!locA.psgc || !locB.psgc) {
      return true;
    }
  }

  if (locA.provincePsgc && locB.provincePsgc) {
    return Number(locA.provincePsgc) === Number(locB.provincePsgc);
  }

  return false;
}

function sourceRank(source) {
  if (source === "seed" || source === "seed+tpb") return 3;
  if (source === "tpb") return 1;
  return 2;
}

function confidenceRank(confidence) {
  if (confidence === "high") return 3;
  if (confidence === "medium") return 2;
  return 1;
}

function pickPrimary(a, b) {
  const rankA =
    sourceRank(a.source) * 10 +
    confidenceRank(a.location?.confidence) +
    (a.location?.psgc ? 1 : 0);
  const rankB =
    sourceRank(b.source) * 10 +
    confidenceRank(b.location?.confidence) +
    (b.location?.psgc ? 1 : 0);

  if (rankA !== rankB) return rankA > rankB ? a : b;
  return (a.description?.length ?? 0) >= (b.description?.length ?? 0) ? a : b;
}

function mergeFestivalRecords(primary, secondary) {
  const merged = { ...primary };

  if (
    secondary.description &&
    (!merged.description || secondary.description.length > merged.description.length)
  ) {
    merged.description = secondary.description;
  }

  const primaryIsSeed = String(merged.source ?? "").includes("seed");
  if (!merged.dayStart && secondary.dayStart) merged.dayStart = secondary.dayStart;
  if (
    !merged.dayEnd &&
    secondary.dayEnd &&
    !primaryIsSeed &&
    merged.dayStart === secondary.dayStart
  ) {
    merged.dayEnd = secondary.dayEnd;
  }
  if (!merged.dateVenueRaw && secondary.dateVenueRaw) {
    merged.dateVenueRaw = secondary.dateVenueRaw;
  }

  if (secondary.sourceUrl && !merged.sourceUrl) {
    merged.sourceUrl = secondary.sourceUrl;
  }

  if (merged.source !== secondary.source) {
    if (merged.source === "seed" && secondary.source === "tpb") {
      merged.source = "seed+tpb";
    } else if (merged.source === "tpb" && secondary.source === "seed") {
      merged.source = "seed+tpb";
    } else if (!merged.source?.includes("+")) {
      merged.source = [merged.source, secondary.source].filter(Boolean).join("+");
    }
  }

  merged.mergedIds = [
    ...(merged.mergedIds ?? []),
    secondary.id,
  ].filter((id, i, arr) => arr.indexOf(id) === i);

  // Prefer better location data from primary; fill gaps from secondary.
  const loc = { ...merged.location };
  const other = secondary.location ?? {};
  if (!loc.psgc && other.psgc) {
    loc.psgc = other.psgc;
    loc.municipality = other.municipality ?? loc.municipality;
    loc.matchMethod = other.matchMethod ?? loc.matchMethod;
    loc.confidence = other.confidence ?? loc.confidence;
  }
  if (!loc.municipality && other.municipality) {
    loc.municipality = other.municipality;
  }
  merged.location = loc;

  return merged;
}

export function isDuplicateFestival(a, b) {
  return (
    namesAreDuplicates(a.name, b.name) && locationsOverlap(a.location, b.location)
  );
}

/**
 * Deduplicates a list of geocoded festival records.
 */
export function dedupeFestivals(festivals) {
  const kept = [];
  const removed = [];

  for (const festival of festivals) {
    const dupIdx = kept.findIndex((existing) =>
      isDuplicateFestival(existing, festival)
    );

    if (dupIdx === -1) {
      kept.push(festival);
      continue;
    }

    const primary = pickPrimary(kept[dupIdx], festival);
    const secondary = primary.id === kept[dupIdx].id ? festival : kept[dupIdx];
    kept[dupIdx] = mergeFestivalRecords(primary, secondary);
    removed.push({
      keptId: kept[dupIdx].id,
      removedId: secondary.id,
      name: secondary.name,
    });
  }

  return { festivals: kept, removed };
}

/**
 * Merges seed and TPB festival lists before geocoding (exact name matches only).
 */
export function mergeSeedAndTpb(seedList, tpbList) {
  const mergedSeeds = seedList.map((seed) => ({ ...seed }));
  const seedByName = new Map(
    mergedSeeds.map((f) => [normalizeFestivalName(f.name), f])
  );

  const skippedTpb = [];
  const tpbOnly = [];

  for (const tpb of tpbList) {
    const key = normalizeFestivalName(tpb.name);
    const seed = seedByName.get(key);

    if (seed) {
      if (
        tpb.description &&
        (!seed.description || tpb.description.length > seed.description.length)
      ) {
        seed.description = tpb.description;
      }
      if (!seed.dateVenueRaw && tpb.dateVenueRaw) {
        seed.dateVenueRaw = tpb.dateVenueRaw;
      }
      seed.source = "seed+tpb";
      seed.sourceUrl = tpb.sourceUrl ?? seed.sourceUrl ?? null;
      seed.mergedFromTpbId = tpb.id;
      skippedTpb.push(tpb.name);
    } else {
      tpbOnly.push(tpb);
    }
  }

  return {
    festivals: [...mergedSeeds, ...tpbOnly],
    mergedCount: skippedTpb.length,
    mergedNames: skippedTpb,
  };
}
