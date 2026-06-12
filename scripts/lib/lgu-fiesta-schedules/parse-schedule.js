const MONTHS = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

export function parseMonthDayRange(token) {
  const m = String(token)
    .trim()
    .match(/^([A-Za-z]{3,9})\s+(\d{1,2})\s*-\s*(\d{1,2})$/i);
  if (!m) return null;
  const month = MONTHS[m[1].slice(0, 3).toLowerCase()];
  if (!month) return null;
  return { month, dayStart: Number(m[2]), dayEnd: Number(m[3]) };
}

/** "Brgy. Cabawa - Dapa" or "Agpangi, Naval – Feast of ..." */
export function parseBarangayMuniLine(line) {
  let s = String(line).trim().replace(/^[-•*]\s*/, "");
  s = s.replace(/\s*[–—-]\s*[^,]+$/i, ""); // drop patron suffix after em dash
  s = s.replace(/\s*–\s*.+$/, "");

  const brgyDash = s.match(/^(?:Brgy\.?|Barangay)\s*(.+?)\s*[-–]\s*(.+)$/i);
  if (brgyDash) {
    return { barangay: brgyDash[1].trim(), municipality: brgyDash[2].trim() };
  }

  const comma = s.match(/^Sitio\s+(.+?),\s*(.+?),\s*(.+)$/i);
  if (comma) {
    return {
      barangay: comma[1].trim(),
      municipality: comma[3].trim(),
      sitio: true,
    };
  }

  const simple = s.match(/^([^,]+),\s*([^,]+)$/);
  if (simple) {
    return { barangay: simple[1].trim(), municipality: simple[2].trim() };
  }

  return null;
}

export function parseSiargaoFiestaBlock(text) {
  const entries = [];
  const monthRe =
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})-(\d{1,2})\b/gi;
  let match;
  let lastDate = null;
  const chunks = text.replace(/\s+/g, " ").trim();

  // Split on date tokens while keeping them
  const parts = chunks.split(/(?=\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}-\d{1,2}\b)/i);
  for (const part of parts) {
    const dateMatch = part.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})-(\d{1,2})\s*/i);
    if (!dateMatch) continue;
    const month = MONTHS[dateMatch[1].slice(0, 3).toLowerCase()];
    const dayStart = Number(dateMatch[2]);
    const dayEnd = Number(dateMatch[3]);
    lastDate = { month, dayStart, dayEnd };

    const rest = part.slice(dateMatch[0].length);
    const segments = rest.split(/Brgy\.|(?=Brgy\.)|(?=\b(?:DAPA|PILAR|DEL CARMEN|GENERAL LUNA|BURGOS|SOCORRO|STA\.? MONICA|SAN ISIDRO|SAN BENITO)\b)/i);

    for (const seg of segments) {
      const brgyMatch = seg.match(/Brgy\.?\s*([^-]+?)\s*-\s*([^A-Z]+|Dapa|Del Carmen|Pilar|Gen\. Luna|Burgos|Socorro|Sta\. Monica|San Isidro|San Benito)/i);
      if (brgyMatch) {
        entries.push({
          ...lastDate,
          barangay: brgyMatch[1].trim(),
          municipality: normalizeSiargaoMuni(brgyMatch[2]),
          dateSource: "lgu-siargao-islands",
        });
        continue;
      }

      const muniOnly = seg.match(
        /^(DAPA|PILAR|DEL CARMEN|GENERAL LUNA|BURGOS|SOCORRO|STA\.?\s*MONICA|SAN ISIDRO|SAN BENITO)\s*(.*)$/i
      );
      if (muniOnly && !/Brgy/i.test(seg)) {
        const muni = normalizeSiargaoMuni(muniOnly[1]);
        const tail = muniOnly[2]?.trim();
        if (tail && /poblacion/i.test(tail)) {
          entries.push({
            ...lastDate,
            barangay: "Poblacion",
            municipality: muni,
            dateSource: "lgu-siargao-islands",
            note: tail,
          });
        } else if (muni) {
          entries.push({
            ...lastDate,
            barangay: null,
            municipality: muni,
            municipalWide: true,
            dateSource: "lgu-siargao-islands",
          });
        }
      }
    }
  }

  // Second pass: explicit "Brgy. X - Y" patterns anywhere
  const brgyRe =
    /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})-(\d{1,2})\s+Brgy\.?\s*([^-]+?)\s*-\s*([^A-Z\n]+|Dapa|Del Carmen|Pilar|Gen\. Luna|Burgos|Socorro|Sta\. Monica|San Isidro|San Benito)/gi;
  while ((match = brgyRe.exec(chunks)) !== null) {
    entries.push({
      month: MONTHS[match[1].slice(0, 3).toLowerCase()],
      dayStart: Number(match[2]),
      dayEnd: Number(match[3]),
      barangay: match[4].trim(),
      municipality: normalizeSiargaoMuni(match[5]),
      dateSource: "lgu-siargao-islands",
    });
  }

  return dedupeEntries(entries);
}

function normalizeSiargaoMuni(name) {
  const n = String(name).trim();
  const map = {
    dapa: "Dapa",
    pilar: "Pilar",
    "del carmen": "Del Carmen",
    "gen. luna": "General Luna",
    "general luna": "General Luna",
    burgos: "Burgos",
    socorro: "Socorro",
    "sta. monica": "Santa Monica (Sapao)",
    "sta monica": "Santa Monica (Sapao)",
    "san isidro": "San Isidro",
    "san benito": "San Benito",
  };
  return map[n.toLowerCase()] ?? n;
}

function dedupeEntries(entries) {
  const seen = new Set();
  const out = [];
  for (const e of entries) {
    if (!e.month || !e.barangay) continue;
    const key = `${e.municipality}|${e.barangay}|${e.month}|${e.dayStart}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out;
}

const GMA_BARANGAY_ALIASES = {
  "poblacion 1": "Barangay 1 Poblacion (Area I)",
  "poblacion 2": "Barangay 2 Poblacion",
  "poblacion 3": "Barangay 3 Poblacion",
  "poblacion 4": "Barangay 4 Poblacion",
  "poblacion 5": "Barangay 5 Poblacion",
  "n virata": "Nicolasa Virata (San Jose)",
  "t tiago": "Tiniente Tiago",
  "f reyes": "Francisco Reyes",
  "g de jesus": "Gregoria De Jesus",
  "g maderan": "Gavino Maderan",
  "f calimag": "Fiorello Calimag (Area C)",
  "b tirona": "Benjamin Tirona (Area D)",
  "m dacon": "Macario Dacon",
  "e malia": "Epifanio Malia",
  "jp elises": "Koronel Jose P. Elises (Area E)",
  "m memije": "Marcelino Memije",
  "r cruz sr": "Ramon Cruz (Area J)",
  "b pulido": "Bernardo Pulido (Area H)",
  "j lumbreras": "Jacinto Lumbreras",
  "s delas alas": "Severino De Las Alas",
  "p granados": "Pantaleon Granados (Area G)",
  "san gabriel": "San Gabriel (Area K)",
  "san jose": "San Jose",
};

function mapGmaBarangay(name) {
  const key = String(name ?? "")
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim();
  return GMA_BARANGAY_ALIASES[key] ?? name.trim();
}

/** GMA Cavite: "May 1 San Jose Manggagawa Barangay San Jose" */
export function parseGmaFiestaBlock(text) {
  const entries = [];
  const monthRe =
    /^(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})(?:-(\d{1,2}))?\s+(.+)$/i;

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const m = line.match(monthRe);
    if (!m) continue;

    const month = MONTHS[m[1].slice(0, 3).toLowerCase()];
    const dayStart = Number(m[2]);
    const dayEnd = m[3] ? Number(m[3]) : dayStart;
    const tail = m[4];

    const brgyMatch = tail.match(/Barangay\s+(.+)$/i);
    if (!brgyMatch) continue;

    entries.push({
      month,
      dayStart,
      dayEnd: dayEnd !== dayStart ? dayEnd : undefined,
      barangay: mapGmaBarangay(brgyMatch[1]),
      municipality: "Gen. Mariano Alvarez",
      dateSource: "lgu-gma-cavite",
    });
  }

  return dedupeEntries(entries);
}

export function parseBiliranAprilBlock(text) {
  const entries = [];
  const blocks = text.split(/(?=(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}-\d{1,2})/i);
  for (const block of blocks) {
    const dateMatch = block.match(
      /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})-(\d{1,2})/i
    );
    if (!dateMatch) continue;
    const month = MONTHS[dateMatch[1].slice(0, 3).toLowerCase()];
    const dayStart = Number(dateMatch[2]);
    const dayEnd = Number(dateMatch[3]);
    const body = block.slice(dateMatch[0].length).trim();
    const parsed = parseBarangayMuniLine(body);
    if (!parsed) continue;
    entries.push({
      month,
      dayStart,
      dayEnd,
      barangay: parsed.barangay,
      municipality: parsed.municipality,
      dateSource: "lgu-biliran-island",
    });
  }
  return dedupeEntries(entries);
}

/** "April 1-2 Ali-is" lines from Bayawan City tourism page. */
export function parseBayawanFiestaBlock(text) {
  const entries = [];
  const lineRe =
    /^(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})(?:-(\d{1,2}))?\s+(.+)$/i;

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const m = line.match(lineRe);
    if (!m) continue;

    const month = MONTHS[m[1].slice(0, 3).toLowerCase()];
    const dayStart = Number(m[2]);
    const dayEnd = m[3] ? Number(m[3]) : dayStart;

    entries.push({
      month,
      dayStart,
      dayEnd: dayEnd !== dayStart ? dayEnd : undefined,
      barangay: m[4].trim(),
      municipality: "City of Bayawan",
      dateSource: "lgu-bayawan-city",
    });
  }

  return dedupeEntries(entries);
}

export function parseBiliranMayBlock(text) {
  const entries = [];
  const blocks = text.split(/(?=May\s+\d{1,2}-\d{1,2})/i);
  for (const block of blocks) {
    const dateMatch = block.match(/^May\s+(\d{1,2})-(\d{1,2})/i);
    if (!dateMatch) continue;
    const month = 5;
    const dayStart = Number(dateMatch[1]);
    const dayEnd = Number(dateMatch[2]);
    const lines = block.split("\n").slice(1);
    for (const line of lines) {
      const parsed = parseBarangayMuniLine(line);
      if (!parsed) continue;
      entries.push({
        month,
        dayStart,
        dayEnd,
        barangay: parsed.barangay,
        municipality: parsed.municipality,
        dateSource: "lgu-biliran-latagaw",
      });
    }
  }
  return dedupeEntries(entries);
}
