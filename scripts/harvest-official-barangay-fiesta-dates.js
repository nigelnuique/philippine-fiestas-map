/**
 * Resumable official-source barangay fiesta date harvester.
 *
 * This intentionally avoids LLM calls. It can survive API rate limits, network
 * failures, and machine restarts because state and candidates are flushed after
 * every attempted page.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const RAW_FILE = path.join(ROOT, "data", "processed", "festivals", "barangay-fiestas-raw.json");
const STATE_FILE = path.join(
  ROOT,
  "data",
  "processed",
  "festivals",
  "official-barangay-fiesta-harvest-state.json"
);
const CANDIDATES_FILE = path.join(
  ROOT,
  "data",
  "processed",
  "festivals",
  "official-barangay-fiesta-candidates.json"
);

const MONTHS = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

const SOURCES = {
  ligao: {
    id: "ligao",
    dateSource: "lgu-ligao-city-barangay-profiles",
    municipality: "City Of Ligao",
    province: "Albay",
    baseUrl: "https://ligaocity.albay.gov.ph",
    urlsFor(row) {
      const barangay = barangayName(row);
      const slug = slugify(stripParenthetical(barangay));
      return [`${this.baseUrl}/barangays/barangay-${slug}-ligao-city/`];
    },
  },
  kabankalan: {
    id: "kabankalan",
    dateSource: "lgu-kabankalan-city-barangay-profiles",
    municipality: "City Of Kabankalan",
    province: "Negros Occidental",
    baseUrl: "https://kabankalancity.gov.ph",
    urlOverrides: {
      "Barangay 1 (Pob.)": ["https://kabankalancity.gov.ph/barangay/barangay-1/"],
      "Barangay 2 (Pob.)": ["https://kabankalancity.gov.ph/barangay/barangay-2/"],
      "Barangay 3 (Pob.)": ["https://kabankalancity.gov.ph/barangay/barangay-3/"],
      "Barangay 4 (Pob.)": ["https://kabankalancity.gov.ph/barangay/barangay-4/"],
      "Barangay 5 (Pob.)": ["https://kabankalancity.gov.ph/barangay/barangay-5/"],
      "Barangay 6 (Pob.)": ["https://kabankalancity.gov.ph/barangay/barangay-6/"],
      "Barangay 7 (Pob.)": ["https://kabankalancity.gov.ph/barangay/barangay-7/"],
      "Barangay 8 (Pob.)": ["https://kabankalancity.gov.ph/barangay/barangay-8/"],
      "Barangay 9 (Pob.)": ["https://kabankalancity.gov.ph/barangay/barangay-9/"],
    },
    urlsFor(row) {
      const barangay = barangayName(row);
      const slug = slugify(stripParenthetical(barangay));
      return [...(this.urlOverrides[barangay] ?? []), `${this.baseUrl}/barangay/barangay-${slug}/`];
    },
  },
  tinambac: {
    id: "tinambac",
    dateSource: "lgu-tinambac-gov-ph-barangay-profiles",
    municipality: "Tinambac",
    province: "Camarines Sur",
    baseUrl: "https://tinambac.gov.ph",
    urlOverrides: {
      "Sagrada (Camp 6)": ["https://tinambac.gov.ph/sagrada-3/"],
    },
    urlsFor(row) {
      const barangay = barangayName(row);
      const base = slugify(stripParenthetical(barangay));
      const candidates = [
        `${this.baseUrl}/${base}/`,
        `${this.baseUrl}/${base}-2/`,
        `${this.baseUrl}/${base}-3/`,
      ];
      return [...(this.urlOverrides[barangay] ?? []), ...candidates];
    },
  },
};

function parseArgs() {
  const args = new Map();
  for (const arg of process.argv.slice(2)) {
    if (!arg.startsWith("--")) continue;
    const [key, value = "true"] = arg.slice(2).split("=");
    args.set(key, value);
  }
  return {
    source: args.get("source") ?? "all",
    maxPages: Number(args.get("max-pages") ?? 200),
    loop: args.get("loop") === "true",
    sleepMs: Number(args.get("sleep-ms") ?? 60_000),
    retryBaseMs: Number(args.get("retry-base-ms") ?? 30_000),
    fetchTimeoutMs: Number(args.get("fetch-timeout-ms") ?? 20_000),
  };
}

function atomicWriteJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`);
  fs.renameSync(tmp, file);
}

function loadJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function barangayName(row) {
  return row.locationText.split(",")[0].trim();
}

function stripParenthetical(value) {
  return value.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeName(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(sta|sto)\b/g, (m) => (m === "sta" ? "santa" : "santo"))
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function slugify(value) {
  return normalizeName(value).replace(/\s+/g, "-");
}

function cleanHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&#8220;|&#8221;|&ldquo;|&rdquo;/g, '"')
    .replace(/&#8217;|&rsquo;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function parseDayRange(raw) {
  const match = String(raw).match(/(\d{1,2})(?:\s*(?:-|to|and)\s*(\d{1,2}))?/i);
  if (!match) return null;
  const dayStart = Number(match[1]);
  const dayEnd = match[2] ? Number(match[2]) : undefined;
  if (dayStart < 1 || dayStart > 31 || (dayEnd && (dayEnd < 1 || dayEnd > 31))) return null;
  return { dayStart, dayEnd };
}

function normalizePatron(value) {
  const cleaned = String(value ?? "")
    .replace(/\s*Fiesta\s*:.*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || undefined;
}

function extractDateFromText(text) {
  const structured = text.match(
    /Patron\s*:\s*([^:]{2,80}?)\s+Fiesta\s*:\s*([A-Za-z]+)\s+(\d{1,2}(?:\s*-\s*\d{1,2})?)/i
  );
  if (structured) {
    const month = MONTHS[structured[2].toLowerCase()];
    const range = parseDayRange(structured[3]);
    if (month && range) {
      return {
        month,
        ...range,
        patronSaint: normalizePatron(structured[1]),
        evidence: structured[0],
      };
    }
  }

  const patterns = [
    /(?:annual\s+)?fiesta(?:\s+celebration)?\s+(?:comes\s+in\s+)?(?:is\s+celebrated\s+)?every\s+(\d{1,2}(?:\s*(?:st|nd|rd|th))?(?:\s*-\s*\d{1,2}(?:\s*(?:st|nd|rd|th))?)?)(?:\s+day)?\s+of\s+([A-Za-z]+)/i,
    /celebrate\s+their\s+fiesta\s+every\s+(\d{1,2}(?:\s*(?:st|nd|rd|th))?(?:\s*-\s*\d{1,2}(?:\s*(?:st|nd|rd|th))?)?)(?:\s+day)?\s+of\s+([A-Za-z]+)/i,
    /Fiesta\s*:\s*([A-Za-z]+)\s+(\d{1,2}(?:\s*-\s*\d{1,2})?)/i,
    /changed\s+to\s+([A-Za-z]+)\s+(\d{1,2}(?:\s*-\s*\d{1,2})?)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const monthRaw = /^[A-Za-z]+$/.test(match[1]) ? match[1] : match[2];
    const dayRaw = /^[A-Za-z]+$/.test(match[1]) ? match[2] : match[1];
    const month = MONTHS[monthRaw.toLowerCase()];
    const range = parseDayRange(dayRaw);
    if (!month || !range) continue;
    return {
      month,
      ...range,
      patronSaint: extractNearbyPatron(text),
      evidence: snippetAround(text, match.index ?? 0),
    };
  }
  return null;
}

function extractNearbyPatron(text) {
  const structured = text.match(/Patron\s*:\s*([^:]{2,80}?)\s+Fiesta\s*:/i);
  if (structured) return normalizePatron(structured[1]);
  const sentence = text.match(/(?:adopted|patron saint is|as our Patron Saint|Patron Saint)\s*,?\s+([^.,;]{2,80})/i);
  return normalizePatron(sentence?.[1]);
}

function snippetAround(text, index) {
  return text.slice(Math.max(0, index - 120), Math.min(text.length, index + 220)).trim();
}

function pageLooksLikeBarangay(text, row) {
  const expected = normalizeName(stripParenthetical(barangayName(row)));
  const explicit = text.match(/Barangay\s*:\s*([A-Z0-9 .'-]+)/i);
  if (explicit && normalizeName(explicit[1]).includes(expected)) return true;
  return normalizeName(text.slice(0, 2500)).includes(expected);
}

async function fetchWithRetry(url, task, options) {
  const headers = {
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "accept-language": "en-US,en;q=0.9",
  };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.fetchTimeoutMs);
  let response;
  try {
    response = await fetch(url, { headers, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
  if (response.status === 429 || response.status >= 500) {
    const retryAfter = Number(response.headers.get("retry-after"));
    const waitMs = Number.isFinite(retryAfter)
      ? retryAfter * 1000
      : options.retryBaseMs * Math.max(1, 2 ** Math.min(task.attempts ?? 0, 6));
    const err = new Error(`HTTP ${response.status}; retry after ${waitMs}ms`);
    err.retryAt = new Date(Date.now() + waitMs).toISOString();
    throw err;
  }
  if (!response.ok) {
    const err = new Error(`HTTP ${response.status}`);
    err.permanent = response.status === 404;
    throw err;
  }
  return response.text();
}

function buildTasks(source, raw, state) {
  for (const row of raw.festivals) {
    if (row.municipality !== source.municipality || row.province !== source.province) continue;
    for (const url of source.urlsFor(row)) {
      const key = `${source.id}|${row.barangayPsgc}|${url}`;
      if (state.tasks[key]) continue;
      state.tasks[key] = {
        key,
        sourceId: source.id,
        barangayPsgc: row.barangayPsgc,
        barangay: barangayName(row),
        municipality: row.municipality,
        province: row.province,
        url,
        status: "pending",
        attempts: 0,
      };
    }
  }
}

function resetStaleRunningTasks(state, staleMs = 5 * 60_000) {
  let reset = 0;
  for (const task of Object.values(state.tasks)) {
    if (task.status !== "running") continue;
    const updatedAt = Date.parse(task.updatedAt ?? "");
    if (Number.isFinite(updatedAt) && Date.now() - updatedAt < staleMs) continue;
    task.status = "retry";
    task.lastError = "stale running task reset after interrupted process";
    task.nextAttemptAt = new Date().toISOString();
    reset++;
  }
  return reset;
}

function candidateKey(candidate) {
  return `${candidate.dateSource}|${candidate.barangayPsgc}|${candidate.month}|${candidate.dayStart}|${candidate.dayEnd ?? ""}`;
}

function upsertCandidate(candidatesDoc, candidate) {
  const key = candidateKey(candidate);
  const index = candidatesDoc.candidates.findIndex((item) => candidateKey(item) === key);
  if (index >= 0) candidatesDoc.candidates[index] = { ...candidatesDoc.candidates[index], ...candidate };
  else candidatesDoc.candidates.push(candidate);
}

function isDue(task) {
  if (task.status === "found" || task.status === "not_found" || task.status === "permanent_error") {
    return false;
  }
  return !task.nextAttemptAt || Date.parse(task.nextAttemptAt) <= Date.now();
}

async function processTask(task, source, rawByPsgc, candidatesDoc, state, options) {
  task.status = "running";
  task.attempts = (task.attempts ?? 0) + 1;
  task.updatedAt = new Date().toISOString();
  atomicWriteJson(STATE_FILE, state);

  try {
    const html = await fetchWithRetry(task.url, task, options);
    const text = cleanHtml(html);
    const row = rawByPsgc.get(task.barangayPsgc);
    const parsed = extractDateFromText(text);
    if (!parsed || !pageLooksLikeBarangay(text, row)) {
      task.status = "not_found";
      task.lastCheckedAt = new Date().toISOString();
      delete task.nextAttemptAt;
      return;
    }

    const candidate = {
      sourceId: source.id,
      dateSource: source.dateSource,
      url: task.url,
      barangayPsgc: task.barangayPsgc,
      barangay: task.barangay,
      municipality: task.municipality,
      province: task.province,
      month: parsed.month,
      dayStart: parsed.dayStart,
      ...(parsed.dayEnd && parsed.dayEnd !== parsed.dayStart ? { dayEnd: parsed.dayEnd } : {}),
      ...(parsed.patronSaint ? { patronSaint: parsed.patronSaint } : {}),
      evidence: parsed.evidence,
      discoveredAt: new Date().toISOString(),
      status: "candidate",
    };
    upsertCandidate(candidatesDoc, candidate);
    candidatesDoc.updatedAt = candidate.discoveredAt;
    atomicWriteJson(CANDIDATES_FILE, candidatesDoc);

    task.status = "found";
    task.foundCandidate = candidateKey(candidate);
    task.lastCheckedAt = candidate.discoveredAt;
    delete task.nextAttemptAt;
  } catch (error) {
    const repeatedForbidden = /^HTTP 403\b/.test(error.message) && (task.attempts ?? 0) >= 3;
    task.status = error.permanent || repeatedForbidden ? "permanent_error" : "retry";
    task.lastError = error.message;
    if (task.status === "retry") task.nextAttemptAt = error.retryAt ?? new Date(Date.now() + options.retryBaseMs).toISOString();
    else delete task.nextAttemptAt;
    task.updatedAt = new Date().toISOString();
  } finally {
    atomicWriteJson(STATE_FILE, state);
  }
}

function summarize(state, candidatesDoc) {
  const counts = {};
  for (const task of Object.values(state.tasks)) {
    counts[task.status] = (counts[task.status] ?? 0) + 1;
  }
  console.log("Official barangay fiesta harvest");
  console.log(`  Tasks: ${Object.values(state.tasks).length}`);
  console.log(`  Candidates: ${candidatesDoc.candidates.length}`);
  for (const [status, count] of Object.entries(counts).sort()) {
    console.log(`  ${status}: ${count}`);
  }
}

async function main() {
  const options = parseArgs();
  const selectedSources =
    options.source === "all"
      ? Object.values(SOURCES)
      : options.source
          .split(",")
          .map((id) => SOURCES[id.trim()])
          .filter(Boolean);
  if (!selectedSources.length) {
    console.error(`Unknown source "${options.source}". Known: all, ${Object.keys(SOURCES).join(", ")}`);
    process.exit(1);
  }
  const selectedSourceIds = new Set(selectedSources.map((source) => source.id));
  const sourceById = new Map(selectedSources.map((source) => [source.id, source]));
  const raw = loadJson(RAW_FILE, null);
  if (!raw?.festivals) {
    console.error(`Missing ${path.relative(ROOT, RAW_FILE)}. Run npm run data:fetch-barangay-fiestas first.`);
    process.exit(1);
  }

  const state = loadJson(STATE_FILE, { version: 1, tasks: {}, updatedAt: null });
  const candidatesDoc = loadJson(CANDIDATES_FILE, { version: 1, candidates: [], updatedAt: null });
  const rawByPsgc = new Map(raw.festivals.map((row) => [row.barangayPsgc, row]));
  const staleReset = resetStaleRunningTasks(state);
  if (staleReset) console.log(`Reset stale running tasks: ${staleReset}`);
  for (const source of selectedSources) buildTasks(source, raw, state);
  state.updatedAt = new Date().toISOString();
  atomicWriteJson(STATE_FILE, state);

  do {
    let processed = 0;
    for (const task of Object.values(state.tasks)) {
      if (!selectedSourceIds.has(task.sourceId) || !isDue(task)) continue;
      const source = sourceById.get(task.sourceId);
      if (!source) continue;
      await processTask(task, source, rawByPsgc, candidatesDoc, state, options);
      processed++;
      if (processed >= options.maxPages) break;
    }
    summarize(state, candidatesDoc);
    if (!options.loop) break;
    if (processed === 0) await new Promise((resolve) => setTimeout(resolve, options.sleepMs));
  } while (options.loop);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
