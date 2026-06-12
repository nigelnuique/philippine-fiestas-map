/**
 * Manual location hints for festivals that fail automatic venue parsing.
 * Keys are normalized festival names (see normalizeFestivalName in dedupe-festivals.js).
 */

/** Municipality name aliases → canonical name in philippines-json-maps */
export const CITY_ALIASES = {
  baliuag: "City of Baliwag",
  baliwag: "City of Baliwag",
  legaspi: "City of Legazpi",
  "legaspi city": "City of Legazpi",
  legazpi: "City of Legazpi",
  "legazpi city": "City of Legazpi",
  lsabela: "City of Isabela",
  "lsabela city": "City of Isabela",
  "isabela city": "City of Isabela",
  butuan: "Butuan City",
  "general santos": "General Santos City",
  "gensan": "General Santos City",
  miagao: "Miagao",
  "miag-ao": "Miagao",
  guiuan: "Guiuan",
  homonhon: "Guiuan",
  angeles: "Angeles City",
  clark: "Angeles City",
  "clark special economic zone": "Angeles City",
  "clark freeport": "Angeles City",
  "cagayan de oro": "Cagayan de Oro City",
  "cdo": "Cagayan de Oro City",
  "provincial capitol ground": "Cagayan de Oro City",
  bacolod: "Bacolod City",
  davao: "Davao City",
  zamboanga: "Zamboanga City",
  iloilo: "Iloilo City",
  "roxas city": "Roxas City",
  naga: "Naga City",
  "naga city": "Naga City",
  "pilgrim city of naga": "Naga City",
  dipolog: "Dipolog City",
  calbayog: "Calbayog City",
  masbate: "Masbate City",
  gingoog: "Gingoog City",
  kidapawan: "Kidapawan City",
  tangub: "Tangub City",
  pagadian: "Pagadian City",
  tacloban: "Tacloban City",
  ormoc: "Ormoc City",
  "san fernando": "City of San Fernando",
  "city of san fernando": "City of San Fernando",
  mandaue: "Mandaue City",
  "mandaue city": "Mandaue City",
  "city of mandaue": "Mandaue City",
  "lapu-lapu": "Lapu-Lapu City",
  "lapu lapu": "Lapu-Lapu City",
  "lapu-lapu city": "Lapu-Lapu City",
  "city of lapu-lapu": "Lapu-Lapu City",
  "city of lapu-lapu (opon)": "Lapu-Lapu City",
  "vigan": "City of Vigan",
  "vigan city": "City of Vigan",
  "ilagan": "City of Ilagan",
  "ilagan city": "City of Ilagan",
  "lake sebu": "Lake Sebu",
  "lapuyan": "Lapuyan",
  "limketkai atrium": "Cagayan de Oro City",
  "limketkai": "Cagayan de Oro City",
  "cebu city": "Cebu City",
  "city of cebu": "Cebu City",
  tagbilaran: "City of Tagbilaran",
  "tagbilaran city": "City of Tagbilaran",
  "city of tagbilaran": "City of Tagbilaran",
  "cotabato city": "City of Cotabato",
  cotabato: "City of Cotabato",
  samal: "Island Garden City of Samal",
  "island garden city of samal": "Island Garden City of Samal",
};

/** PSGC / legacy spellings → canonical municipality name in the index */
export const MUNICIPALITY_ALIASES = {
  "pio v corpuz": "Pio V. Corpus",
  "pio v corpuz limbuhan": "Pio V. Corpus",
  "pres carlos p garcia": "President Carlos P. Garcia",
  "pres carlos p garcia pitogo": "President Carlos P. Garcia",
  "bacungan leon t postigo": "Leon T. Postigo",
  bumbaran: "Amai Manabilang",
  "city of sto tomas": "City of Sto. Tomas",
  "sto tomas": "City of Sto. Tomas",
  pinamungajan: "Pinamungajan",
  pinamungahan: "Pinamungajan",
};

export function resolveMunicipalityAlias(name) {
  if (!name) return null;
  const key = String(name)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[()]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return MUNICIPALITY_ALIASES[key] ?? null;
}

/** Region text aliases → adm1 PSGC */
export const REGION_ALIASES = {
  "region ix": 900000000,
  "region 9": 900000000,
  "zamboanga peninsula": 900000000,
  "region xii": 1200000000,
  "region 12": 1200000000,
  "soccsksargen": 1200000000,
  "cordillera administrative region": 1700000000,
  "cordillera": 1700000000,
  "caraga": 1300000000,
  "region xiii": 1300000000,
  "car": 1700000000,
  "ncr": 1600000000,
  "metro manila": 1600000000,
  "national capital region": 1600000000,
};

/**
 * Per-festival location hints when venue text is missing or unusable.
 * municipality + province are matched via the normal lookup pipeline.
 */
export const FESTIVAL_LOCATION_HINTS = {
  "ibalong festival": { municipality: "City of Legazpi", province: "Albay" },
  "island garden city of samal festival": {
    municipality: "Island Garden City of Samal",
    province: "Davao del Norte",
  },
  "pangapog festival": {
    municipality: "Island Garden City of Samal",
    province: "Davao del Norte",
  },
  "p gsalabuk festival": {
    municipality: "Zamboanga City",
    province: "Zamboanga del Sur",
  },
  "pgsalabuk festival": {
    municipality: "Zamboanga City",
    province: "Zamboanga del Sur",
  },
  "diyandi festival sa iligan": { municipality: "Iligan City", province: "Lanao del Norte" },
  "diyandi festival": { municipality: "Iligan City", province: "Lanao del Norte" },
  "kalilangan festival": { municipality: "General Santos City", province: "South Cotabato" },
  "mutya ng caraga": { municipality: "Butuan City", province: "Agusan del Norte" },
  "first easter mass celebration": { municipality: "Butuan City", province: "Agusan del Norte" },
  "abayan festival": { municipality: "Butuan City", province: "Agusan del Norte" },
  "kahimoan abayan festival": { municipality: "Butuan City", province: "Agusan del Norte" },
  "pasayahan sa lucena": { municipality: "Lucena City", province: "Quezon" },
  "sibit sibit festival": { municipality: "Olongapo City", province: "Zambales" },
  "angeles lenten rites": { municipality: "Angeles City", province: "Pampanga" },
  "kuyamis festival": { municipality: "Cagayan de Oro City", province: "Misamis Oriental" },
  "higalaay festival": { municipality: "Cagayan de Oro City", province: "Misamis Oriental" },
  "kumbira": { municipality: "Cagayan de Oro City", province: "Misamis Oriental" },
  "kumbira culinary show and live competitions": {
    municipality: "Cagayan de Oro City",
    province: "Misamis Oriental",
  },
  "bambanti festival": { municipality: "City of Ilagan", province: "Isabela" },
  "kannawidan ylocos festival": { municipality: "City of Vigan", province: "Ilocos Sur" },
  "tboli tribal festival": { municipality: "Lake Sebu", province: "South Cotabato" },
  "kamgbegu festival fest of the harvest": { municipality: "Lapuyan", province: "Zamboanga del Sur" },
  "kamgbegu festival": { municipality: "Lapuyan", province: "Zamboanga del Sur" },
  "niyogyugan festival": { municipality: "Lucena City", province: "Quezon" },
  "paraw regatta": { municipality: "Iloilo City", province: "Iloilo" },
  "peñafrancia festival": { municipality: "Naga City", province: "Camarines Sur" },
  "pe afrancia festival": { municipality: "Naga City", province: "Camarines Sur" },
  "lanzones festival": { municipality: "Mambajao", province: "Camiguin" },
  "lami lamihan festival": { municipality: "Lamitan City", province: "Basilan" },
  "carrera habagat": { municipality: "General Luna", province: "Surigao del Norte" },
  "maniambus festival": { municipality: "City of Escalante", province: "Negros Occidental" },
  "manlambus festival": { municipality: "City of Escalante", province: "Negros Occidental" },
  "balayong festival": { municipality: "Puerto Princesa City", province: "Palawan" },
  "apayao province foundation": { municipality: "Kabugao", province: "Apayao" },
  "san jose fiesta": { municipality: "Nabunturan", province: "Davao de Oro" },
  "kisi kisi festival": { municipality: "Silay City", province: "Negros Occidental" },
  "aklan day celebration": { municipality: "Kalibo", province: "Aklan" },
  "lenten week pagpapako": { municipality: "Baler", province: "Aurora" },
  "araw ng kagitingan": { municipality: "Pilar", province: "Bataan" },
  "sunggod ta kamanga": { municipality: "Malaybalay City", province: "Bukidnon" },
  "sakayan festival": { municipality: "City of Isabela", province: "Basilan" },
  "lambat festival": { municipality: "Pioduran", province: "Albay" },
  "salakayan festival": { municipality: "Miagao", province: "Iloilo" },
  "hot air balloon clark festival": { municipality: "Angeles City", province: "Pampanga" },
  "homonhon landing anniversary": { municipality: "Guiuan", province: "Eastern Samar" },
  "baliuag lenten procession": { municipality: "City of Baliwag", province: "Bulacan" },
  "buntal hat festival": { municipality: "City of Baliwag", province: "Bulacan" },
  "d dalaylay festival": { municipality: "Jalajala", province: "Rizal" },
  "cordillera day": { municipality: "Baguio City", province: "Benguet" },
  "day ang di onga festival": { municipality: "Baguio City", province: "Benguet" },
  "hanging of the green": { municipality: "Zamboanga City", province: "Zamboanga del Sur" },
  "feast of the immaculate concepcion": {
    municipality: "Puerto Princesa City",
    province: "Palawan",
  },
  "feast of the immaculate conception": {
    municipality: "Puerto Princesa City",
    province: "Palawan",
  },
  "puerto princesa foundation day": {
    municipality: "Puerto Princesa City",
    province: "Palawan",
  },
  "kamarikutan pagdiwata arts festival": {
    municipality: "Puerto Princesa City",
    province: "Palawan",
  },
  "cimarrones festival": { municipality: "Pili", province: "Camarines Sur" },
  "eid al fitr": { regionPsgc: 1200000000 },
  "pintaflores": { municipality: "San Carlos City", province: "Negros Occidental" },
  "wow araw ng caraga": { regionPsgc: 1300000000 },
  "caraga anniversary": { regionPsgc: 1300000000 },
  "pasalamat festival": { municipality: "City of Pagadian", province: "Zamboanga del Sur" },
  "festival of lights music": { municipality: "Tangub City", province: "Misamis Occidental" },
  "feast of saint john the baptist lechon festival": {
    municipality: "Calapan City",
    province: "Oriental Mindoro",
  },
  "mantawi festival": { municipality: "Mandaue City", province: "Cebu" },
  "kadaugan sa mactan": { municipality: "Lapu-Lapu City", province: "Cebu" },
  "virgen de la regla festival": { municipality: "Lapu-Lapu City", province: "Cebu" },
  "virgin of the rule fiesta": { municipality: "Lapu-Lapu City", province: "Cebu" },
  "sandugo festival": { municipality: "City of Tagbilaran", province: "Bohol" },
  "mandaue charter day celebration": { municipality: "Mandaue City", province: "Cebu" },
  "karanowan fish tival": { municipality: "Bato", province: "Camarines Sur" },
  "mahaguyog festival": { municipality: "Sto. Tomas", province: "Batangas" },
  "anibina bulawanun festival": { municipality: "Nabunturan", province: "Davao de Oro" },
  "isla carahan festival": { municipality: "Caramoan", province: "Camarines Sur" },
  "alinao festival": { municipality: "Malinao", province: "Albay" },
  "bantayog festival": { municipality: "Daet", province: "Camarines Norte" },
  "alinsangan bowa bowahan festival": { municipality: "Nabua", province: "Camarines Sur" },
  "hibok hibok festival": { municipality: "Mambajao", province: "Camiguin" },
  "panaad": { municipality: "Mambajao", province: "Camiguin" },
  "abaca festival": { municipality: "Virac", province: "Catanduanes" },
  "catandungan festival": { municipality: "Virac", province: "Catanduanes" },
  "paskuhan sa barangay": { municipality: "Cebu City", province: "Cebu" },
  "pasko sa tanjay festival": { municipality: "Tanjay City", province: "Negros Oriental" },
  "paraw regatta festival": { municipality: "Iloilo City", province: "Iloilo" },
  "kanlungan festival": { municipality: "Calamba City", province: "Laguna" },
  "leyte gulf landing anniversary": { municipality: "Palo", province: "Leyte" },
  "pamuhuan festival": { municipality: "Pinamungajan", province: "Cebu" },
  "dayaw dalan festival": { municipality: "San Jacinto", province: "Masbate" },
  "virgen milagrosa festival": { municipality: "Badoc", province: "Ilocos Norte" },
  "manggahan festival": { municipality: "Jordan", province: "Guimaras" },
  "ammungan festival": { municipality: "Bayombong", province: "Nueva Vizcaya" },
  "kabasan festival": { municipality: "Nabunturan", province: "Davao de Oro" },
  "kalayaan festival": { municipality: "Trece Martires City", province: "Cavite" },
  "rizal province foundation day": { municipality: "Antipolo City", province: "Rizal" },
  "araw ng agusan del sur": { municipality: "Prosperidad", province: "Agusan del Sur" },
  "araw ng agusan del norte": { municipality: "Butuan City", province: "Agusan del Norte" },
  "white nights festival": { municipality: "Tagum City", province: "Davao del Norte" },
  "pista ng kalikasan": { municipality: "Puerto Princesa City", province: "Palawan" },
  "payuhwan festival batanes day": { municipality: "Basco", province: "Batanes" },
  "payuhwan festival": { municipality: "Basco", province: "Batanes" },
  "naligayan festival": { municipality: "Cabadbaran City", province: "Agusan del Norte" },
  "kadagayaan festival": { municipality: "Tagum City", province: "Davao del Norte" },
  "buganihan festival": { municipality: "Nabunturan", province: "Davao de Oro" },
  "saint james the apostle fiesta": { municipality: "Compostela", province: "Davao de Oro" },
  "anniversary of battle of paye": { municipality: "Boac", province: "Marinduque" },
  "madyaw hugyaw samal festival": { municipality: "Island Garden City of Samal", province: "Davao del Norte" },
  "negros occidental provincial tourism week": { municipality: "Bacolod City", province: "Negros Occidental" },
  "agal agal festival": { municipality: "Bongao", province: "Tawi-Tawi" },
  "tamaraw festival": { municipality: "Mamburao", province: "Occidental Mindoro" },
  "negros day": { municipality: "Bacolod City", province: "Negros Occidental" },
  "visayas mindanao drum and bugle corps": { municipality: "Cagayan de Oro City", province: "Misamis Oriental" },
  "benguet foundation day": { municipality: "La Trinidad", province: "Benguet" },
  "tan ok ni ilocano festival of festivals": { municipality: "Laoag City", province: "Ilocos Norte" },
  "pas ungko s g mis occ": { municipality: "Oroquieta City", province: "Misamis Occidental" },
  "pasungko s g mis occ": { municipality: "Oroquieta City", province: "Misamis Occidental" },
  "pasungko sg mis occ": { municipality: "Oroquieta City", province: "Misamis Occidental" },
  "davao gulf regatta": { municipality: "Mati", province: "Davao Oriental" },
};

/** National / regionwide events — no municipality polygon */
export const NATIONAL_FESTIVALS = new Set([
  "feast of the santo nino",
  "holy week",
  "unesco iti world theater week",
]);

export function normalizeFestivalKey(name) {
  return String(name)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[''`]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function resolveAliasMunicipality(name) {
  if (!name) return null;
  const key = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  return CITY_ALIASES[key] ?? CITY_ALIASES[key.replace(/\s+city$/, "")] ?? null;
}

export function inferMunicipalityFromFestivalName(name) {
  const norm = normalizeFestivalKey(name);
  const patterns = [
    /island garden city of samal/,
    /city of ([a-z\s]+) festival/,
    /([a-z\s]+) city festival/,
    /festival (?:of|sa|in) ([a-z\s]+)/,
  ];
  for (const pat of patterns) {
    const m = norm.match(pat);
    if (m?.[1]) return m[1].trim();
  }
  if (norm.includes("samal")) return "Island Garden City of Samal";
  return null;
}

export function getFestivalLocationHint(festival) {
  const key = normalizeFestivalKey(festival.name);
  if (FESTIVAL_LOCATION_HINTS[key]) return FESTIVAL_LOCATION_HINTS[key];
  if (NATIONAL_FESTIVALS.has(key)) return { national: true };
  return null;
}

export function getRegionFromText(text) {
  if (!text) return null;
  const norm = text.toLowerCase();
  const aliases = Object.entries(REGION_ALIASES).sort((a, b) => b[0].length - a[0].length);
  for (const [alias, psgc] of aliases) {
    const pattern = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (pattern.test(norm)) return psgc;
  }
  const regionMatch = norm.match(/region\s+([ixv0-9]+)/i);
  if (regionMatch) {
    const roman = regionMatch[1].toLowerCase();
    const map = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12, xiii: 13 };
    if (map[roman]) {
      const keys = Object.keys(REGION_ALIASES).filter((k) => k.includes(`region ${roman}`));
      if (keys[0]) return REGION_ALIASES[keys[0]];
    }
  }
  return null;
}
