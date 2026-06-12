/**
 * Curated descriptions for major Philippine festivals.
 * Sourced from DOT/TPB materials, Wikipedia, and official festival sites.
 * Applied in build-dataset.js so they override short seed or scraped blurbs.
 */

function normalizeKey(name) {
  return String(name ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[''`]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** @type {Record<string, string>} */
export const MAJOR_FESTIVAL_DESCRIPTIONS_BY_ID = {
  "seed-sinulog-festival":
    "Held every third Sunday of January in Cebu City, Sinulog is among the largest religious and cultural festivals in the Philippines, honoring the Santo Niño (Child Jesus). The name comes from the Cebuano sinulog dance — two steps forward, one step back — evoking the rhythm of the sea and originally performed as a prayer before the image at the Basilica Minore del Santo Niño. Highlights include the fluvial parade along the Mactan Channel on the Saturday before the feast, the solemn reenactment of the first baptism, and the Grand Parade of competing contingents in vivid costumes. Often called the “Grandest Festival in the Philippines,” Sinulog draws millions of devotees and spectators each year.",
  "seed-ati-atihan-festival":
    "Ati-Atihan in Kalibo, Aklan is one of the oldest Santo Niño festivals in the country, blending indigenous Ati heritage with Catholic devotion. Participants darken their skin with soot, wear elaborate tribal finery and tasseled headdresses, and dance to relentless drumbeats while chanting “Hala Bira!” and “Viva kay Señor Santo Niño!” The celebration recalls the ancient barter of Panay and the merrymaking of the Ati people, and today ranks alongside Sinulog and Dinagyang as a premier January festival in the Visayas.",
  "seed-dinagyang-festival":
    "Dinagyang — from the Hiligaynon word for merrymaking — transforms Iloilo City every fourth week of January into a thunderous tribute to the Santo Niño. Warrior dancers in soot-blackened bodies, shields, and spears perform choreographed tribal routines at the Iloilo Freedom Grandstand, echoing the Ati-atihan tradition that began when a replica of the Cebu Santo Niño arrived in 1967. The festival also commemorates the legendary purchase of Panay from the Ati chieftain Marikudo, uniting faith, history, and world-class street-dance competition.",
  "seed-feast-of-the-black-nazarene":
    "Every January 9, millions of barefoot devotees converge on Quiapo Church in Manila for the Traslación — the solemn procession of the centuries-old black wooden image of Christ carrying the Cross. Known as the Poong Itim na Nazareno, the statue is believed to grant miracles to the faithful who endure hours of jostling to touch the ropes pulling the andas (carriage). The feast is one of the largest annual religious gatherings in the Catholic world and a defining expression of Filipino popular piety.",
  "seed-panagbenga-festival":
    "Panagbenga — a Kankanaey word meaning “season of blooming” — is Baguio City’s month-long flower festival held every February. Born in 1995 as a way to lift the city after the devastating 1990 Luzon earthquake, it features spectacular floats covered in fresh blooms, street dancers in bahag and floral costumes moving to the Bendian rhythm, and garden shows that celebrate the Cordilleras’ artistry. Today it is one of the Philippines’ most photographed festivals and a symbol of resilience and renewal.",
  "seed-moriones-festival":
    "During Holy Week on the island of Marinduque, townspeople don elaborate Roman centurion masks and armor to reenact the story of Longinus, the blind soldier whose sight was restored by Christ’s blood. The Moriones (from “Moryon,” meaning mask) roam the streets in penitential silence, culminating in the search for Longinus and his conversion. This centuries-old tradition blends folk theater, Lenten devotion, and Marinduque’s unique cultural identity.",
  "seed-pahiyas-festival":
    "Every May 15, Lucban in Quezon Province erupts in color for the San Isidro Pahiyas — widely regarded as the Philippines’ most vibrant harvest festival. Homes along the procession route are draped with brilliant kiping (leaf-shaped rice wafers), fruits, vegetables, and handicrafts in friendly competition for the best décor. The feast honors San Isidro Labrador, patron saint of farmers, and expresses thanksgiving for a bountiful harvest through parades, higantes, and the blessing of decorated houses as the saint’s image passes by.",
  "seed-pintados-kasadyaan-festival":
    "Pintados-Kasadyaan in Tacloban City celebrates Leyte’s warrior past and pre-colonial heritage through body-painted dancers who wear patterns echoing ancient pintados (tattooed warriors). Held in June, the festival merges the Pintados Festival of body art with Kasadyaan (“merriment”), featuring street performances, cultural exhibits, and tributes to the region’s history. It is Eastern Visayas’ signature showcase of identity, resilience, and artistic expression.",
  "seed-sandugo-festival":
    "Sandugo (“one blood”) commemorates the 1565 blood compact between Spanish explorer Miguel López de Legazpi and Bohol chieftain Datu Sikatuna — a pact of friendship sealed with wine and blood. Tagbilaran City marks the event each July with reenactments, street dancing, agro-industrial fairs, and fireworks. The festival celebrates Boholano history and the spirit of unity between cultures.",
  "seed-kadayawan-festival":
    "Kadayawan sa Dabaw, held every August in Davao City, is a thanksgiving festival rooted in the madayaw (“good, valuable, beautiful”) traditions of the city’s 11 indigenous ethnolinguistic groups. It evolved from tribal harvest rituals promoted in the 1970s and the 1986 Apo Duwaling celebration honoring Mount Apo, durian, and the waling-waling orchid. Highlights include the Indak-Indak street-dancing competition, the Pamulak floral float parade, and the Kadayawan Village showcasing Lumad and Moro cultures.",
  "seed-masskara-festival":
    "MassKara — a play on mass (crowd), cara (face), and maskara (mask) — is Bacolod City’s festival of smiling faces every October. Born in 1980 amid the collapse of the sugar industry and the MV Don Juan maritime tragedy, it was conceived as an act of defiance: a declaration that Bacolod would survive hardship with joy. Dancers in radiant smiling masks and sequined costumes fill the streets to Latin beats, earning the city its nickname, the “City of Smiles.”",
  "seed-giant-lantern-festival":
    "San Fernando, Pampanga hosts the Ligligan Parul (Giant Lantern Festival) each December, where barangays compete with enormous parol lanterns up to 18 feet across, their kaleidoscopic patterns choreographed to music. Known as the “Christmas Capital of the Philippines,” the city’s artisans have elevated the humble star lantern into a dazzling electric spectacle that draws visitors from around the country.",
  "seed-mantawi-festival":
    "Mantawi Festival in Mandaue City, Cebu honors the city’s patron St. Joseph with a mid-year cultural summit of trade fairs, street dancing, and performances celebrating Mandaue’s heritage as a center of furniture-making and commerce. The name recalls Mactan’s ancient trade routes, and the festival coincides with the city’s fiesta traditions and the broader Cebuano devotion to the Santo Niño.",
  "seed-kadaugan-sa-mactan":
    "Kadaugan sa Mactan (Victory in Mactan) reenacts the 1521 Battle of Mactan, when Datu Lapu-Lapu and his warriors repelled Ferdinand Magellan’s forces on the shores of Mactan Island. Held in Lapu-Lapu City each April, the festival features beach landing dramatizations, cultural shows, and tributes to the first Filipino hero who resisted foreign domination.",
  "seed-virgen-de-la-regla-festival":
    "The Virgen de la Regla (Our Lady of the Rule) Festival in Lapu-Lapu City centers on a fluvial procession and novena honoring a Marian image venerated since the Spanish era in Opon. Pilgrims and devotees gather each November for the birhen’s feast, blending seafaring tradition, Catholic devotion, and Cebuano coastal culture.",
};

/** Aliases for merged/deduplicated festival IDs and Wikipedia entries */
const NAME_ALIASES = {
  "the dinagyang festival": "dinagyang festival",
  "masskara festival": "masskara festival",
  "pintados kasadyaan festival": "pintados kasadyaan festival",
  "giant lantern festival": "giant lantern festival",
  "ligligan parul": "giant lantern festival",
  "feast of the black nazarene": "feast of the black nazarene",
  "black nazarene": "feast of the black nazarene",
  "kadaugan sa mactan": "kadaugan sa mactan",
  "virgen de la regla festival": "virgen de la regla festival",
  "virgin of the rule fiesta": "virgen de la regla festival",
  "peñafrancia festival": "peñafrancia festival",
  "pe afrancia festival": "peñafrancia festival",
  "paraw regatta festival": "paraw regatta festival",
  "lanzones festival": "lanzones festival",
  "lami lamihan festival": "lami lamihan festival",
};

/** @type {Record<string, string>} — keyed by normalizeKey(name) */
export const MAJOR_FESTIVAL_DESCRIPTIONS_BY_NAME = Object.fromEntries(
  Object.entries({
    "sinulog festival": MAJOR_FESTIVAL_DESCRIPTIONS_BY_ID["seed-sinulog-festival"],
    "ati atihan festival": MAJOR_FESTIVAL_DESCRIPTIONS_BY_ID["seed-ati-atihan-festival"],
    "dinagyang festival": MAJOR_FESTIVAL_DESCRIPTIONS_BY_ID["seed-dinagyang-festival"],
    "feast of the black nazarene": MAJOR_FESTIVAL_DESCRIPTIONS_BY_ID["seed-feast-of-the-black-nazarene"],
    "panagbenga festival": MAJOR_FESTIVAL_DESCRIPTIONS_BY_ID["seed-panagbenga-festival"],
    "moriones festival": MAJOR_FESTIVAL_DESCRIPTIONS_BY_ID["seed-moriones-festival"],
    "pahiyas festival": MAJOR_FESTIVAL_DESCRIPTIONS_BY_ID["seed-pahiyas-festival"],
    "pintados kasadyaan festival": MAJOR_FESTIVAL_DESCRIPTIONS_BY_ID["seed-pintados-kasadyaan-festival"],
    "sandugo festival": MAJOR_FESTIVAL_DESCRIPTIONS_BY_ID["seed-sandugo-festival"],
    "kadayawan festival": MAJOR_FESTIVAL_DESCRIPTIONS_BY_ID["seed-kadayawan-festival"],
    "masskara festival": MAJOR_FESTIVAL_DESCRIPTIONS_BY_ID["seed-masskara-festival"],
    "giant lantern festival": MAJOR_FESTIVAL_DESCRIPTIONS_BY_ID["seed-giant-lantern-festival"],
    "mantawi festival": MAJOR_FESTIVAL_DESCRIPTIONS_BY_ID["seed-mantawi-festival"],
    "kadaugan sa mactan": MAJOR_FESTIVAL_DESCRIPTIONS_BY_ID["seed-kadaugan-sa-mactan"],
    "virgen de la regla festival": MAJOR_FESTIVAL_DESCRIPTIONS_BY_ID["seed-virgen-de-la-regla-festival"],
    "higalaay festival":
      "Higalaay (Friendship) Festival is Cagayan de Oro City’s week-long August celebration, formerly known as Kagay-an Festival. It showcases the city’s heritage through Kumbira culinary events, garden shows, civic parades, and the Hiyas ng Kagay-an beauty pageant — a modern expression of Kagay-anon pride and hospitality in Northern Mindanao.",
    "kaamulan festival":
      "Kaamulan is an ethnic cultural festival in Malaybalay, Bukidnon, held from February to March. Unlike saints’ fiestas, it gathers the seven indigenous tribes of Bukidnon — Bukidnon, Higaonon, Talaandig, Manobo, Matigsalug, Tigwahanon, and Umayamnon — for rituals, street dancing, and a program rooted in the Binukid word dulum or pamuhul, meaning gathering. It is one of the few festivals explicitly organized by and for Lumad communities.",
    "aliwan fiesta":
      "Aliwan Fiesta is a national festival of festivals held annually in Manila, organized by the Manila Broadcasting Company. Regional winners from street-dance and float competitions across the Philippines converge for a grand showdown along Roxas Boulevard, promoting cultural tourism and showcasing the country’s diverse fiesta traditions in a single spectacular weekend.",
    "bambanti festival":
      "Bambanti — Ilocano for “scarecrow” — is Isabela province’s premier festival, held every fourth week of January at the Provincial Capitol grounds in Ilagan City. All 34 municipalities and three cities erect giant scarecrow installations and agri-ecotourism booths celebrating harvest and local identity. Highlights include street dancing, the Bambanti Village exhibit, culinary showcases, and the Festival King and Queen competition.",
    "kannawidan ylocos festival":
      "Kannawidan ‘Ylocos’ is Ilocos Sur’s week-long founding anniversary festival, launched in 2008 to commemorate the 1818 royal decree that split Ilocos into Norte and Sur. Major events take place in Vigan City — including Tamag Grounds street dancing, the period dinner on Calle Crisologo, and cultural programs honoring Ilocano heritage.",
    "tboli tribal festival":
      "Also known as Lemlunay, the T’boli Tribal Festival gathers the major ethnolinguistic groups of South Cotabato every third week of September in Lake Sebu. Dawn rituals, gong music, ethnic dances, and traditional sports celebrate T’boli culture and the legend of Lemlunay — a paradise the people seek to rebuild on earth.",
    "niyogyugan festival":
      "Niyogyugan (“coconut shake”) is Quezon province’s grand coconut festival held each August at the provincial capitol grounds in Lucena City. All municipalities and cities build coconut-themed booths, and the week features street dancing, culinary events, and thanksgiving for the province’s top agricultural crop.",
    "paraw regatta festival":
      "The Paraw Regatta is Asia’s oldest traditional sailing event, held every February in Iloilo City and the Iloilo Strait. Colorful double-outrigger paraw boats race along the coast while the city celebrates its maritime heritage with beach events, cultural shows, and the Dinagyang-related spirit of Ilonggo seafaring pride.",
    "peñafrancia festival":
      "Peñafrancia Festival in Naga City, Camarines Sur, honors Our Lady of Peñafrancia, the Patroness of Bicolandia. The September feast culminates in the fluvial procession along the Naga River as millions of devotees shout “Viva la Virgen!” — one of the largest Marian celebrations in Asia.",
    "hot air balloon clark festival":
      "The Philippine International Hot Air Balloon Fiesta at Clark Freeport Zone in Pampanga gathers pilots from around the world each February for mass ascensions, night glows, and aerial exhibitions. It is the country’s premier aviation-leisure event and a major draw for Central Luzon tourism.",
    "lanzones festival":
      "Lanzones Festival in Mambajao, Camiguin celebrates the island’s sweetest lanzones harvest every October. Street dancing, agri-trade fairs, and the coronation of the Lanzones Queen mark thanksgiving for the fruit that Camiguin is famous for across the Philippines.",
    "lami lamihan festival":
      "Lami-Lamihan Festival in Lamitan, Basilan showcases Yakan and Muslim cultural heritage through traditional music, dance, and crafts. Held in June, it promotes peace and unity while highlighting the province’s unique ethnolinguistic traditions.",
  }).map(([k, v]) => [k, v])
);

export function lookupMajorFestivalDescription(festival) {
  if (!festival) return null;

  if (festival.id && MAJOR_FESTIVAL_DESCRIPTIONS_BY_ID[festival.id]) {
    return MAJOR_FESTIVAL_DESCRIPTIONS_BY_ID[festival.id];
  }

  let key = normalizeKey(festival.name);
  key = NAME_ALIASES[key] ?? key;
  return MAJOR_FESTIVAL_DESCRIPTIONS_BY_NAME[key] ?? null;
}
