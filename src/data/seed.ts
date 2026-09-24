import type { CalculatorData } from '@/types/calculator'

// Innebygd datasett. Brukes når databasen ikke er konfigurert eller ikke svarer,
// og er kilden til supabase/seed.sql (se scripts/generate-seed-sql.ts).
//
// Sammenligningsgrunnlag: livsstilsfotavtrykket til en gjennomsnittlig nordmann
// (Hot or Cool Institute 2025, tabell 3.1): mat 2,1 + bolig 1,0 + transport 2,8
// + varer 0,4 + fritid 1,0 + tjenester 0,5 = 7,8 tonn CO2e per år. Dette er
// utslipp fra det du selv forbruker – offentlig sektor og investeringer er ikke
// med. Faktorene under er valgt slik at et typisk svarsett havner nær 7,8 tonn.
//
// Utregningen bak hver faktor står i kommentaren. Flyfaktorene er uten
// høydeeffekt (ikke-CO2), slik SSB og DEFRA oppgir dem.

const HOC_2025 =
  'https://hotorcool.org/wp-content/uploads/2025/10/A_Climate_for_Sufficiency_report_FULL_REPORT-1.pdf'
const OWID_FOOD = 'https://ourworldindata.org/grapher/ghg-per-kg-poore'
const SSB_TRANSPORT =
  'https://www.ssb.no/transport-og-reiseliv/artikler-og-publikasjoner/mindre-utslipp-fra-veitrafikk-fly-og-tog'
const ICCT_2025 = 'https://theicct.org/publication/electric-cars-life-cycle-analysis-emissions-europe-jul25/'
const DEFRA =
  'https://www.gov.uk/government/collections/government-conversion-factors-for-company-reporting'
const HAFSLUND =
  'https://www.hafslund.no/no/produkter-og-tjenester/fjernvarme/nokkeltall-for-avfallsforbrenning-og-fjernvarmeproduksjon'
const CONCITO_KLAER = 'https://concito.dk/klimapakker/forbrug/toejets-klimaaftryk'
const APPLE_IPHONE =
  'https://www.apple.com/environment/pdf/products/iphone/iPhone_16_and_iPhone_16_Plus_PER_Sept2024.pdf'
const APPLE_MACBOOK = 'https://www.apple.com/environment/pdf/products/notebooks/M3_MacBook_Air_PER_March2024.pdf'
const GRONT_PUNKT = 'https://www.grontpunkt.no/aktuelt/nyheter/samler-inn-for-lite-plastemballasje'

export const seedData: CalculatorData = {
  settings: {
    nationalAverageKg: 7800,
    nationalAverageSource: 'Hot or Cool Institute (2025): livsstilsfotavtrykk for en gjennomsnittlig nordmann',
    nationalAverageSourceUrl: HOC_2025,
    // Tjenester (helse, utdanning, kommunikasjon m.m.) er 0,5 t i snittet og
    // noe den enkelte i liten grad velger selv. Legges til alle.
    baselineKg: 500,
    baselineLabel: 'Tjenester alle bruker (helse, utdanning, kommunikasjon)',
    // IPCC-forenlig tak for livsstilsfotavtrykk i 2035 (1,5 °C), fra samme rapport.
    targetKg: 1100,
    targetLabel: '1,5-gradersmålet 2035',
  },

  categories: [
    { id: 'mat', name: 'Ukentlige matvaner', description: 'Hva du spiser i løpet av en vanlig uke.', color: '#728f3f', sortOrder: 1 },
    { id: 'transport', name: 'Reise og transport', description: 'Hverdagsreiser og ferier.', color: '#3d6b4f', sortOrder: 2 },
    {
      id: 'bolig', name: 'Bolig og energi',
      description: 'Norsk strøm har lave utslipp, så det er mest bygging og vedlikehold av boligen som teller.',
      color: '#a3b85a', sortOrder: 3,
    },
    { id: 'forbruk', name: 'Forbruk og fritid', description: 'Ting du kjøper og hva du gjør på fritiden.', color: '#4f6629', sortOrder: 4 },
    { id: 'avfall', name: 'Daglige rutiner (søppel)', description: 'Avfall og kildesortering.', color: '#7fa37a', sortOrder: 5 },
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
      sourceName: 'Poore & Nemecek (2018) via Our World in Data: storfe 33,3 kg CO2e per kg', sourceUrl: OWID_FOOD, sortOrder: 1,
      easyWinText: 'bytter ut én middag med rødt kjøtt i uka med en vegetarmiddag',
      easyWinUnits: 1, easyWinReplacementId: 'vegetar',
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
      sourceName: 'Poore & Nemecek (2018) via Our World in Data: svin 12,3 og kylling 9,9 kg CO2e per kg', sourceUrl: OWID_FOOD, sortOrder: 2,
      easyWinText: 'bytter ut én kylling- eller svinemiddag i uka med en vegetarmiddag',
      easyWinUnits: 1, easyWinReplacementId: 'vegetar',
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
      sourceName: 'Poore & Nemecek (2018) via Our World in Data: oppdrettsfisk 13,6 kg CO2e per kg', sourceUrl: OWID_FOOD, sortOrder: 3,
      easyWinText: null, easyWinUnits: null, easyWinReplacementId: null,
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
      sourceName: 'Poore & Nemecek (2018) via Our World in Data: tofu 3,2 og grønnsaker ca. 0,5 kg CO2e per kg', sourceUrl: OWID_FOOD, sortOrder: 4,
      easyWinText: null, easyWinUnits: null, easyWinReplacementId: null,
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
      sourceName: 'Poore & Nemecek (2018) via Our World in Data: melk 3,15 og ost 23,9 kg CO2e per kg', sourceUrl: OWID_FOOD, sortOrder: 5,
      easyWinText: 'dropper én porsjon melk, ost eller yoghurt om dagen',
      easyWinUnits: 7, easyWinReplacementId: null,
    },
    {
      // Faktor 1: verdien er kg CO2e per år. Nordmenns kosthold totalt er 2,1 t
      // (Hot or Cool). Middager og meieri over utgjør ca. 1,3 t for et typisk
      // svarsett; resten (ca. 0,8 t) er frokost, lunsj, mellommåltider og drikke.
      id: 'ovrig-mat', categoryId: 'mat', name: 'Frokost, lunsj og snacks',
      question: 'Hvordan er resten av kostholdet ditt (frokost, lunsj, mellommåltider, drikke)?',
      period: 'year', unitLabel: 'kg CO2e', kgCo2ePerUnit: 1,
      choices: [
        { label: 'Mest plantebasert', value: 450 },
        { label: 'Som folk flest', value: 800 },
        { label: 'Mye kjøttpålegg, ost, kaffe og snacks', value: 1200 },
      ],
      tip: null,
      sourceName: 'Hot or Cool Institute (2025): nordmenns kosthold 2,1 t CO2e per år, fratrukket middager og meieri', sourceUrl: HOC_2025, sortOrder: 6,
      easyWinText: null, easyWinUnits: null, easyWinReplacementId: null,
    },

    // --- Transport ---------------------------------------------------------
    {
      // ICCT 2025: 235 g CO2e/km over hele livsløpet (produksjon, drivstoff, kjøring).
      id: 'fossilbil', categoryId: 'transport', name: 'Bensin- eller dieselbil',
      question: 'Hvor mange kilometer kjører du med bensin- eller dieselbil i uka?',
      period: 'week', unitLabel: 'km', kgCo2ePerUnit: 0.235,
      choices: [
        { label: 'Ingen', value: 0 }, { label: 'Litt (ca. 25 km)', value: 25 },
        { label: 'Til og fra jobb (ca. 150 km)', value: 150 }, { label: 'Mye (ca. 400 km)', value: 400 },
      ],
      tip: 'Sykkel eller elsykkel på jobbreisen kutter mye – og er gratis trening.',
      sourceName: 'ICCT (2025): bensinbil 235 g CO2e per km, hele livsløpet', sourceUrl: ICCT_2025, sortOrder: 1,
      easyWinText: 'sykler eller går til jobb én dag i uka i stedet for å kjøre (ca. 30 km tur/retur)',
      easyWinUnits: 30, easyWinReplacementId: null,
    },
    {
      // ICCT 2025: elbil på fornybar strøm 52 g CO2e/km (norsk strøm er ~95 % fornybar).
      id: 'elbil', categoryId: 'transport', name: 'Elbil',
      question: 'Hvor mange kilometer kjører du med elbil i uka?',
      period: 'week', unitLabel: 'km', kgCo2ePerUnit: 0.052,
      choices: [
        { label: 'Ingen', value: 0 }, { label: 'Litt (ca. 25 km)', value: 25 },
        { label: 'Til og fra jobb (ca. 150 km)', value: 150 }, { label: 'Mye (ca. 400 km)', value: 400 },
      ],
      tip: null,
      sourceName: 'ICCT (2025): elbil på fornybar strøm 52 g CO2e per km, hele livsløpet', sourceUrl: ICCT_2025, sortOrder: 2,
      easyWinText: 'sykler til jobb én dag i uka i stedet for å kjøre (ca. 30 km tur/retur)',
      easyWinUnits: 30, easyWinReplacementId: null,
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
      easyWinText: null, easyWinUnits: null, easyWinReplacementId: null,
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
      easyWinText: null, easyWinUnits: null, easyWinReplacementId: null,
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
      sourceName: 'SSB: innenlands luftfart 181 g CO2 per passasjerkm (2019), ca. 1000 km tur/retur', sourceUrl: SSB_TRANSPORT, sortOrder: 5,
      easyWinText: 'tar toget i stedet for fly på én innenlandsreise i året',
      easyWinUnits: 1, easyWinReplacementId: null,
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
      sourceName: 'DEFRA 2024: kortdistanse 0,151 kg CO2e per passasjerkm, ca. 3000 km tur/retur', sourceUrl: DEFRA, sortOrder: 6,
      easyWinText: null, easyWinUnits: null, easyWinReplacementId: null,
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
      sourceName: 'DEFRA 2024: langdistanse 0,117 kg CO2e per passasjerkm, ca. 15 000 km tur/retur', sourceUrl: DEFRA, sortOrder: 7,
      easyWinText: null, easyWinUnits: null, easyWinReplacementId: null,
    },

    // --- Bolig og energi (per år) -----------------------------------------
    {
      // Hot or Cool: boligareal (bygging og vedlikehold) 0,6 t for en nordmann
      // med ca. 55 m² → ca. 11 kg per m². Strøm: ca. 135 kWh/m² × 11,9 g/kWh
      // (NVE 2024) ≈ 1,6 kg per m². Sum ≈ 12,6 kg per m².
      id: 'boligareal', categoryId: 'bolig', name: 'Boligareal',
      question: 'Hvor mange kvadratmeter bolig har du per person i husstanden?',
      period: 'year', unitLabel: 'm²', kgCo2ePerUnit: 12.6,
      choices: [
        { label: 'Under 25 m²', value: 20 }, { label: '25–40 m²', value: 32 },
        { label: '40–60 m²', value: 50 }, { label: 'Over 60 m²', value: 75 },
      ],
      tip: 'Å dele bolig med flere er et av de mest effektive klimatiltakene – utslippene fordeles.',
      sourceName: 'Hot or Cool Institute (2025): boligareal 0,6 t per nordmann; NVE: strøm 11,9 g CO2e/kWh', sourceUrl: HOC_2025, sortOrder: 1,
      easyWinText: null, easyWinUnits: null, easyWinReplacementId: null,
    },
    {
      // Faktor 1: verdien er kg CO2e per år i tillegg til strøm, ved ca. 5000 kWh
      // varme per person. Fjernvarme 20,8 g/kWh (Hafslund 2025). Gass (propan)
      // ca. 0,23 kg/kWh (DEFRA). Olje og parafin er forbudt til oppvarming siden 2020.
      id: 'oppvarming', categoryId: 'bolig', name: 'Oppvarming',
      question: 'Hvordan varmes boligen din hovedsakelig opp?',
      period: 'year', unitLabel: 'kg CO2e', kgCo2ePerUnit: 1,
      choices: [
        { label: 'Strøm (varmepumpe, panelovner, gulvvarme)', value: 0 },
        { label: 'Fjernvarme', value: 100 }, { label: 'Vedfyring', value: 75 },
        { label: 'Gass', value: 1150 },
      ],
      tip: 'Bytt ut gassfyring med varmepumpe – Enova gir støtte.',
      sourceName: 'Hafslund: fjernvarme 20,8 g CO2e/kWh (2025); DEFRA: propan ca. 0,23 kg/kWh; ca. 5000 kWh varme per person', sourceUrl: HAFSLUND, sortOrder: 2,
      easyWinText: null, easyWinUnits: null, easyWinReplacementId: null,
    },

    // --- Forbruk og fritid -------------------------------------------------
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
      easyWinText: 'kjøper ett nytt klesplagg mindre i måneden',
      easyWinUnits: 1, easyWinReplacementId: null,
    },
    {
      id: 'mobil', categoryId: 'forbruk', name: 'Ny mobil eller nettbrett',
      question: 'Hvor mange nye mobiler eller nettbrett kjøper du i året?',
      period: 'year', unitLabel: 'enhet', kgCo2ePerUnit: 56,
      choices: [
        { label: 'Ingen', value: 0 }, { label: 'Én hvert 3. år', value: 0.33 },
        { label: 'Én i året', value: 1 }, { label: '2 eller flere', value: 2.5 },
      ],
      tip: 'Å bruke mobilen ett år ekstra er et av de enkleste kuttene.',
      sourceName: 'Apple Product Environmental Report: iPhone 16 (128 GB) 56 kg CO2e', sourceUrl: APPLE_IPHONE, sortOrder: 2,
      easyWinText: 'bruker mobilen ett år lenger før du bytter',
      easyWinUnits: 0.5, easyWinReplacementId: null,
    },
    {
      id: 'pc', categoryId: 'forbruk', name: 'Ny PC',
      question: 'Hvor ofte kjøper du ny PC?',
      period: 'year', unitLabel: 'PC', kgCo2ePerUnit: 158,
      choices: [
        { label: 'Sjeldnere enn hvert 5. år', value: 0.15 }, { label: 'Hvert 3.–4. år', value: 0.3 },
        { label: 'Annethvert år', value: 0.5 }, { label: 'Hvert år', value: 1 },
      ],
      tip: null,
      sourceName: 'Apple Product Environmental Report: MacBook Air M3 158 kg CO2e', sourceUrl: APPLE_MACBOOK, sortOrder: 3,
      easyWinText: null, easyWinUnits: null, easyWinReplacementId: null,
    },
    {
      // Faktor 1: verdien er kg CO2e per år. Fritid (kultur, hobby, restaurant,
      // hotell) er 1,0 t for en gjennomsnittlig nordmann.
      id: 'fritid', categoryId: 'forbruk', name: 'Fritid, restaurant og hotell',
      question: 'Hvor mye bruker du på restaurant, hotell, hobbyer og opplevelser, sammenlignet med folk flest?',
      period: 'year', unitLabel: 'kg CO2e', kgCo2ePerUnit: 1,
      choices: [
        { label: 'Mye mindre', value: 400 }, { label: 'Omtrent som folk flest', value: 1000 },
        { label: 'Mer', value: 1500 }, { label: 'Mye mer', value: 2200 },
      ],
      tip: null,
      sourceName: 'Hot or Cool Institute (2025): fritid 1,0 t CO2e per nordmann per år', sourceUrl: HOC_2025, sortOrder: 4,
      easyWinText: null, easyWinUnits: null, easyWinReplacementId: null,
    },

    // --- Avfall ------------------------------------------------------------
    {
      // Ca. 4 kg per pose × 0,51 kg fossil CO2 per kg brent avfall.
      id: 'restavfall', categoryId: 'avfall', name: 'Restavfall',
      question: 'Hvor mange ganger i uka tar du ut en full pose restavfall?',
      period: 'week', unitLabel: 'pose', kgCo2ePerUnit: 2.0,
      choices: [
        { label: '1 gang', value: 1 }, { label: '2 ganger', value: 2 },
        { label: '3–4 ganger', value: 3.5 }, { label: '5 eller flere', value: 6 },
      ],
      tip: null,
      sourceName: 'Hafslund (Klemetsrud/Haraldrud 2025): 0,51 t fossil CO2 per tonn avfall; ca. 4 kg per pose', sourceUrl: HAFSLUND, sortOrder: 1,
      easyWinText: 'sorterer ut nok matavfall og plast til én pose restavfall mindre i uka',
      easyWinUnits: 1, easyWinReplacementId: null,
    },
    {
      // Faktor 1: verdien er ekstra kg CO2e per år. Nordmenn bruker ca. 18 kg
      // plastemballasje i året (Grønt Punkt). Brent i stedet for gjenvunnet gir
      // ca. 2,7 kg fossil CO2 per kg → ca. 50 kg.
      id: 'kildesortering', categoryId: 'avfall', name: 'Kildesortering',
      question: 'Kildesorterer du plast, papir, glass og matavfall?',
      period: 'year', unitLabel: 'kg CO2e', kgCo2ePerUnit: 1,
      choices: [
        { label: 'Ja, alt', value: 0 }, { label: 'Delvis', value: 25 }, { label: 'Nei', value: 50 },
      ],
      tip: 'Kildesortering er gratis og tar et par minutter om dagen.',
      sourceName: 'Grønt Punkt: ca. 18 kg plastemballasje per person i året; ca. 2,7 kg CO2 per kg plast som brennes', sourceUrl: GRONT_PUNKT, sortOrder: 2,
      easyWinText: 'begynner å sortere plast, papir, glass og matavfall',
      easyWinUnits: 50, easyWinReplacementId: null,
    },
  ],
}
