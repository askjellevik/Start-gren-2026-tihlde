import type { CalculatorData } from '@/types/calculator'

// Innebygd datasett. Brukes når databasen ikke er konfigurert eller ikke svarer,
// og er kilden til supabase/seed.sql (se scripts/generate-seed-sql.ts).
//
// Faktorene er hentet fra kildene som står på hver metode (per september 2026).
// Der kilden oppgir kg per kg mat eller gram per km, er regnestykket skrevet i
// kommentaren. Flyfaktorene er uten høydeeffekt (ikke-CO2), slik SSB og DEFRA
// oppgir dem – reell klimaeffekt kan være nær dobbelt så høy.

const OWID_FOOD = 'https://ourworldindata.org/environmental-impacts-of-food'
const MDIR_FORBRUK =
  'https://www.miljodirektoratet.no/aktuelt/fagmeldinger/2024/januar-2024/utslipp-av-klimagasser-fra-norsk-forbruk-er-beregnet/'
const SSB_TRANSPORT =
  'https://www.ssb.no/transport-og-reiseliv/artikler-og-publikasjoner/mindre-utslipp-fra-veitrafikk-fly-og-tog'
const SSB_BIL =
  'https://www.ssb.no/transport-og-reiseliv/artikler-og-publikasjoner/mindre-utslipp-per-kjorte-kilometer'
const DEFRA =
  'https://www.gov.uk/government/collections/government-conversion-factors-for-company-reporting'
const NVE_STROM = 'https://www.nve.no/energi/energisystem/energibruk/stroemdeklarasjoner/'
const CONCITO_KLAER = 'https://concito.dk/klimapakker/forbrug/toejets-klimaaftryk'
const MDIR_AVFALL =
  'https://www.miljodirektoratet.no/ansvarsomrader/klima/klimakvoter/avfallsforbrenningsanlegg/'

export const seedData: CalculatorData = {
  settings: {
    // 70 mill. tonn / innbyggere = 13 tonn CO2e per person (forbruksbasert, 2020).
    nationalAverageKg: 13000,
    nationalAverageSource: 'Miljødirektoratet: utslipp fra norsk forbruk (2020-tall, publisert 2024)',
    nationalAverageSourceUrl: MDIR_FORBRUK,
    // Offentlig sektor (~10 %) + investeringer i bygg og infrastruktur (~33 %)
    // av 13 tonn ≈ 5,6 tonn. Dette "har" alle, uansett livsstil.
    baselineKg: 5600,
    baselineLabel: 'Felles utslipp (offentlige tjenester, bygg og infrastruktur)',
  },

  categories: [
    { id: 'mat', name: 'Ukentlige matvaner', description: 'Hva du spiser i løpet av en vanlig uke.', color: '#728f3f', sortOrder: 1 },
    { id: 'transport', name: 'Reise og transport', description: 'Hverdagsreiser og ferier.', color: '#c46a2b', sortOrder: 2 },
    {
      id: 'bolig', name: 'Bolig og energi',
      description: 'Norsk strøm har svært lave utslipp, så boligen teller lite. Bygging og materialer ligger i felles utslipp.',
      color: '#3f6f8f', sortOrder: 3,
    },
    { id: 'forbruk', name: 'Forbruk og shopping', description: 'Ting du kjøper og tjenester du bruker.', color: '#8a5a9e', sortOrder: 4 },
    { id: 'avfall', name: 'Daglige rutiner (søppel)', description: 'Avfall og kildesortering.', color: '#8a7a5a', sortOrder: 5 },
  ],

  methods: [
    // --- Mat (per uke). Én middag = ca. 150 g kjøtt/fisk. ------------------
    {
      // Storfe fra melkekubesetning 33,3 kg/kg × 0,15 kg. Det meste av norsk
      // storfekjøtt kommer fra melkekyr; lam (39,7 kg/kg) gir ca. 6 kg.
      id: 'rodt-kjott', categoryId: 'mat', name: 'Rødt kjøtt',
      question: 'Hvor mange middager med storfe eller lam spiser du i uka?',
      period: 'week', unitLabel: 'middag', kgCo2ePerUnit: 5.0,
      choices: [
        { label: 'Aldri', value: 0 }, { label: '1 gang', value: 1 },
        { label: '2 ganger', value: 2 }, { label: '3 ganger', value: 3 }, { label: '4 eller flere', value: 5 },
      ],
      tip: 'Bytt én rødt kjøtt-middag i uka med kylling, fisk eller bønner – det sparer rundt 250 kg i året.',
      sourceName: 'Our World in Data / Poore & Nemecek (2018): storfe 33,3 kg CO2e per kg', sourceUrl: OWID_FOOD, sortOrder: 1,
    },
    {
      // Snitt av svin 12,3 og kylling 9,9 kg/kg × 0,15 kg.
      id: 'hvitt-kjott', categoryId: 'mat', name: 'Kylling og svin',
      question: 'Hvor mange middager med kylling eller svin spiser du i uka?',
      period: 'week', unitLabel: 'middag', kgCo2ePerUnit: 1.7,
      choices: [
        { label: 'Aldri', value: 0 }, { label: '1–2 ganger', value: 1.5 },
        { label: '3–4 ganger', value: 3.5 }, { label: '5 eller flere', value: 6 },
      ],
      tip: null,
      sourceName: 'Our World in Data / Poore & Nemecek (2018): svin 12,3 og kylling 9,9 kg CO2e per kg', sourceUrl: OWID_FOOD, sortOrder: 2,
    },
    {
      // Oppdrettsfisk 13,6 kg/kg × 0,15 kg (globalt snitt; norsk laks ligger lavere).
      id: 'fisk', categoryId: 'mat', name: 'Fisk og sjømat',
      question: 'Hvor mange middager med fisk spiser du i uka?',
      period: 'week', unitLabel: 'middag', kgCo2ePerUnit: 2.0,
      choices: [
        { label: 'Aldri', value: 0 }, { label: '1 gang', value: 1 },
        { label: '2 ganger', value: 2 }, { label: '3 eller flere', value: 3.5 },
      ],
      tip: null,
      sourceName: 'Our World in Data / Poore & Nemecek (2018): oppdrettsfisk 13,6 kg CO2e per kg', sourceUrl: OWID_FOOD, sortOrder: 3,
    },
    {
      // Tofu 3,2 kg/kg × 0,15 kg + ca. 0,2 kg grønnsaker à 0,5 kg/kg.
      id: 'vegetar', categoryId: 'mat', name: 'Vegetarmiddager',
      question: 'Hvor mange vegetar- eller veganmiddager spiser du i uka?',
      period: 'week', unitLabel: 'middag', kgCo2ePerUnit: 0.6,
      choices: [
        { label: 'Ingen', value: 0 }, { label: '1–2', value: 1.5 },
        { label: '3–4', value: 3.5 }, { label: '5 eller flere', value: 6 },
      ],
      tip: null,
      sourceName: 'Our World in Data / Poore & Nemecek (2018): tofu 3,2 og grønnsaker ca. 0,5 kg CO2e per kg', sourceUrl: OWID_FOOD, sortOrder: 4,
    },
    {
      // Glass melk 0,25 kg × 3,15 = 0,79; 30 g ost × 23,9 = 0,72.
      id: 'meieri', categoryId: 'mat', name: 'Meieriprodukter',
      question: 'Hvor mange porsjoner melk, ost eller yoghurt får du i deg i uka?',
      period: 'week', unitLabel: 'porsjon', kgCo2ePerUnit: 0.75,
      choices: [
        { label: 'Nesten ingen', value: 1 }, { label: '1 om dagen', value: 7 },
        { label: '2 om dagen', value: 14 }, { label: '3 eller flere om dagen', value: 24 },
      ],
      tip: 'Havre- og soyadrikk har rundt en tredjedel av utslippene til kumelk.',
      sourceName: 'Our World in Data / Poore & Nemecek (2018): melk 3,15 og ost 23,9 kg CO2e per kg', sourceUrl: OWID_FOOD, sortOrder: 5,
    },

    // --- Transport ---------------------------------------------------------
    {
      // SSB: bensin 96 og diesel 85 g per personkm ved 1,7 personer per bil
      // ≈ 150 g per kjørte km. + ca. 40 g/km for produksjon av bilen.
      id: 'fossilbil', categoryId: 'transport', name: 'Bensin- eller dieselbil',
      question: 'Hvor mange kilometer kjører du med bensin- eller dieselbil i uka?',
      period: 'week', unitLabel: 'km', kgCo2ePerUnit: 0.19,
      choices: [
        { label: 'Ingen', value: 0 }, { label: 'Litt (ca. 25 km)', value: 25 },
        { label: 'Til og fra jobb (ca. 150 km)', value: 150 }, { label: 'Mye (ca. 400 km)', value: 400 },
      ],
      tip: 'Samkjøring, kollektiv eller elbil på jobbreisen kutter mye.',
      sourceName: 'SSB: ca. 150 g CO2 per kjørte km (bensin/diesel) + produksjon av bil', sourceUrl: SSB_BIL, sortOrder: 1,
    },
    {
      // Produksjon inkl. batteri ca. 65 g/km over bilens levetid
      // + 0,18 kWh/km × 11,9 g/kWh (NVE 2024) ≈ 2 g/km.
      id: 'elbil', categoryId: 'transport', name: 'Elbil',
      question: 'Hvor mange kilometer kjører du med elbil i uka?',
      period: 'week', unitLabel: 'km', kgCo2ePerUnit: 0.07,
      choices: [
        { label: 'Ingen', value: 0 }, { label: 'Litt (ca. 25 km)', value: 25 },
        { label: 'Til og fra jobb (ca. 150 km)', value: 150 }, { label: 'Mye (ca. 400 km)', value: 400 },
      ],
      tip: null,
      sourceName: 'NVE: norsk strøm 11,9 g CO2e/kWh (2024) + produksjon av bil og batteri', sourceUrl: NVE_STROM, sortOrder: 2,
    },
    {
      id: 'buss', categoryId: 'transport', name: 'Buss',
      question: 'Hvor mange kilometer reiser du med buss i uka?',
      period: 'week', unitLabel: 'km', kgCo2ePerUnit: 0.059,
      choices: [
        { label: 'Ingen', value: 0 }, { label: 'Litt (ca. 20 km)', value: 20 },
        { label: 'Til og fra jobb (ca. 100 km)', value: 100 }, { label: 'Mye (ca. 300 km)', value: 300 },
      ],
      tip: null,
      sourceName: 'SSB: buss 59 g CO2 per passasjerkm (2019)', sourceUrl: SSB_TRANSPORT, sortOrder: 3,
    },
    {
      id: 'tog', categoryId: 'transport', name: 'Tog, T-bane og trikk',
      question: 'Hvor mange kilometer reiser du med tog, T-bane eller trikk i uka?',
      period: 'week', unitLabel: 'km', kgCo2ePerUnit: 0.006,
      choices: [
        { label: 'Ingen', value: 0 }, { label: 'Litt (ca. 20 km)', value: 20 },
        { label: 'Til og fra jobb (ca. 100 km)', value: 100 }, { label: 'Mye (ca. 300 km)', value: 300 },
      ],
      tip: null,
      sourceName: 'SSB: jernbane 5,8 g CO2 per passasjerkm (2019)', sourceUrl: SSB_TRANSPORT, sortOrder: 4,
    },
    {
      id: 'sykkel-gange', categoryId: 'transport', name: 'Sykkel og gange',
      question: 'Hvor mange kilometer sykler eller går du i uka?',
      period: 'week', unitLabel: 'km', kgCo2ePerUnit: 0,
      choices: [
        { label: 'Under 5 km', value: 3 }, { label: '5–20 km', value: 12 },
        { label: '20–50 km', value: 35 }, { label: 'Over 50 km', value: 60 },
      ],
      tip: null,
      sourceName: 'Regnes som utslippsfritt', sourceUrl: null, sortOrder: 5,
    },
    {
      // 181 g per passasjerkm × ca. 1000 km tur/retur (f.eks. Oslo–Trondheim).
      id: 'fly-innland', categoryId: 'transport', name: 'Innenlandsfly',
      question: 'Hvor mange tur/retur-flyreiser innenlands tar du i året?',
      period: 'year', unitLabel: 'tur/retur', kgCo2ePerUnit: 180,
      choices: [
        { label: 'Ingen', value: 0 }, { label: '1–2', value: 1.5 },
        { label: '3–5', value: 4 }, { label: '6 eller flere', value: 8 },
      ],
      tip: 'Tog mellom de største byene har en brøkdel av utslippene til fly.',
      sourceName: 'SSB: innenlands luftfart 181 g CO2 per passasjerkm (2019), ca. 1000 km tur/retur', sourceUrl: SSB_TRANSPORT, sortOrder: 6,
    },
    {
      // 0,151 kg per passasjerkm × ca. 3000 km tur/retur (f.eks. Oslo–Berlin/Roma).
      id: 'fly-europa', categoryId: 'transport', name: 'Flyreiser i Europa',
      question: 'Hvor mange tur/retur-flyreiser i Europa tar du i året?',
      period: 'year', unitLabel: 'tur/retur', kgCo2ePerUnit: 450,
      choices: [
        { label: 'Ingen', value: 0 }, { label: '1', value: 1 },
        { label: '2–3', value: 2.5 }, { label: '4 eller flere', value: 5 },
      ],
      tip: 'Én Europa-tur mindre i året sparer nesten et halvt tonn.',
      sourceName: 'DEFRA 2024: kortdistanse 0,151 kg CO2e per passasjerkm, ca. 3000 km tur/retur', sourceUrl: DEFRA, sortOrder: 7,
    },
    {
      // 0,117 kg per passasjerkm × ca. 15 000 km tur/retur (f.eks. Oslo–New York/Bangkok).
      id: 'fly-lang', categoryId: 'transport', name: 'Langdistansefly',
      question: 'Hvor mange tur/retur-reiser utenfor Europa tar du i året?',
      period: 'year', unitLabel: 'tur/retur', kgCo2ePerUnit: 1750,
      choices: [
        { label: 'Ingen', value: 0 }, { label: '1', value: 1 },
        { label: '2', value: 2 }, { label: '3 eller flere', value: 3.5 },
      ],
      tip: 'Én langdistansereise gir mer utslipp enn et helt års middager.',
      sourceName: 'DEFRA 2024: langdistanse 0,117 kg CO2e per passasjerkm, ca. 15 000 km tur/retur', sourceUrl: DEFRA, sortOrder: 8,
    },

    // --- Bolig og energi (per år) -----------------------------------------
    {
      // Ca. 135 kWh per m² per år (SSB: ca. 16 000 kWh per husholdning)
      // × 11,9 g CO2e/kWh (NVE 2024) ≈ 1,6 kg per m².
      id: 'boligareal', categoryId: 'bolig', name: 'Strøm i boligen',
      question: 'Hvor mange kvadratmeter bolig har du per person i husstanden?',
      period: 'year', unitLabel: 'm²', kgCo2ePerUnit: 1.6,
      choices: [
        { label: 'Under 25 m²', value: 20 }, { label: '25–40 m²', value: 32 },
        { label: '40–60 m²', value: 50 }, { label: 'Over 60 m²', value: 75 },
      ],
      tip: null,
      sourceName: 'NVE: 11,9 g CO2e per kWh (2024), ca. 135 kWh per m² per år', sourceUrl: NVE_STROM, sortOrder: 1,
    },
    {
      // Faktor 1: verdien i hvert valg er kg CO2e per år i tillegg til strøm.
      // Oljefyr er forbudt i Norge siden 2020 og er derfor ikke med.
      id: 'oppvarming', categoryId: 'bolig', name: 'Oppvarming',
      question: 'Hvordan varmes boligen din hovedsakelig opp?',
      period: 'year', unitLabel: 'kg CO2e', kgCo2ePerUnit: 1,
      choices: [
        { label: 'Strøm (varmepumpe, panelovner, gulvvarme)', value: 0 },
        { label: 'Fjernvarme', value: 100 }, { label: 'Vedfyring', value: 75 },
        { label: 'Gass eller parafin', value: 1250 },
      ],
      tip: 'Bytt ut gass eller parafin med varmepumpe – Enova gir støtte.',
      sourceName: 'Anslag: ca. 5000 kWh varme per person; gass ca. 0,25 kg CO2e/kWh', sourceUrl: null, sortOrder: 2,
    },

    // --- Forbruk -----------------------------------------------------------
    {
      id: 'klaer', categoryId: 'forbruk', name: 'Nye klær',
      question: 'Hvor mange nye klesplagg kjøper du i måneden?',
      period: 'month', unitLabel: 'plagg', kgCo2ePerUnit: 10,
      choices: [
        { label: 'Ingen / bruktkjøp', value: 0 }, { label: '1', value: 1 },
        { label: '2–4', value: 3 }, { label: '5 eller flere', value: 6 },
      ],
      tip: 'Bruktkjøp og reparasjon gir nesten null ekstra utslipp.',
      sourceName: 'CONCITO: t-skjorte ca. 7, jeans 11–20 kg CO2e per plagg', sourceUrl: CONCITO_KLAER, sortOrder: 1,
    },
    {
      id: 'elektronikk', categoryId: 'forbruk', name: 'Elektronikk',
      question: 'Hvor mange nye mobiler, PC-er eller nettbrett kjøper du i året?',
      period: 'year', unitLabel: 'enhet', kgCo2ePerUnit: 150,
      choices: [
        { label: 'Ingen', value: 0 }, { label: '1', value: 1 },
        { label: '2', value: 2 }, { label: '3 eller flere', value: 4 },
      ],
      tip: 'Å bruke mobilen ett år ekstra er et av de enkleste kuttene.',
      sourceName: 'Produksjon: mobil 80–110 kg, bærbar PC 200–350 kg CO2e (produsenters livsløpsanalyser)', sourceUrl: null, sortOrder: 2,
    },
    {
      id: 'storre-innkjop', categoryId: 'forbruk', name: 'Møbler og hvitevarer',
      question: 'Hvor mange større innkjøp (møbler, hvitevarer) gjør du i året?',
      period: 'year', unitLabel: 'innkjøp', kgCo2ePerUnit: 200,
      choices: [
        { label: 'Ingen', value: 0 }, { label: '1', value: 1 },
        { label: '2–3', value: 2.5 }, { label: '4 eller flere', value: 5 },
      ],
      tip: null,
      sourceName: 'Anslag fra livsløpsanalyser (sofa ca. 100–200, kjøleskap ca. 200–400 kg CO2e)', sourceUrl: null, sortOrder: 3,
    },
    {
      // Husholdningenes andel (~6,5 t) delt på forbruk per person gir ca. 0,02 kg
      // per krone i snitt; tjenester ligger lavere enn varer.
      id: 'tjenester', categoryId: 'forbruk', name: 'Fritid, restaurant og tjenester',
      question: 'Hvor mye bruker du på fritid, restaurantbesøk og tjenester i måneden?',
      period: 'month', unitLabel: 'kr', kgCo2ePerUnit: 0.015,
      choices: [
        { label: 'Under 1 000 kr', value: 500 }, { label: '1 000–3 000 kr', value: 2000 },
        { label: '3 000–6 000 kr', value: 4500 }, { label: 'Over 6 000 kr', value: 8000 },
      ],
      tip: null,
      sourceName: 'Utledet fra Miljødirektoratet: husholdningers utslipp per forbrukskrone', sourceUrl: MDIR_FORBRUK, sortOrder: 4,
    },

    // --- Avfall ------------------------------------------------------------
    {
      // Ca. 4 kg per pose × ca. 0,5 kg fossil CO2 per kg brent restavfall.
      id: 'restavfall', categoryId: 'avfall', name: 'Restavfall',
      question: 'Hvor mange ganger i uka tar du ut en full pose restavfall?',
      period: 'week', unitLabel: 'pose', kgCo2ePerUnit: 2.0,
      choices: [
        { label: '1 gang', value: 1 }, { label: '2 ganger', value: 2 },
        { label: '3–4 ganger', value: 3.5 }, { label: '5 eller flere', value: 6 },
      ],
      tip: null,
      sourceName: 'Miljødirektoratet (avfallsforbrenning): ca. 0,5 kg CO2 per kg restavfall, ca. 4 kg per pose', sourceUrl: MDIR_AVFALL, sortOrder: 1,
    },
    {
      // Faktor 1: verdien er ekstra kg CO2e per år. Ca. 25 kg plastemballasje
      // per person × ca. 2,7 kg CO2 per kg plast som brennes i stedet for å gjenvinnes.
      id: 'kildesortering', categoryId: 'avfall', name: 'Kildesortering',
      question: 'Kildesorterer du plast, papir, glass og matavfall?',
      period: 'year', unitLabel: 'kg CO2e', kgCo2ePerUnit: 1,
      choices: [
        { label: 'Ja, alt', value: 0 }, { label: 'Delvis', value: 35 }, { label: 'Nei', value: 70 },
      ],
      tip: 'Kildesortering er gratis og tar et par minutter om dagen.',
      sourceName: 'Anslag: ca. 25 kg plast per person, ca. 2,7 kg CO2 per kg plast som brennes', sourceUrl: null, sortOrder: 2,
    },
  ],
}
