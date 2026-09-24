# Bærekraftskalkulator for Cultura Bank

Et verktøy der du svarer på spørsmål om mat, reiser, bolig, forbruk og avfall og ser
klimafotavtrykket ditt sammenlignet med en gjennomsnittlig nordmann.

- **Sektordiagram** som oppdateres live mens du svarer
- **Oljetank** som fylles når du trykker «Regn ut min bærekraftsscore» – streken er snittet
- **Bærekraftsscore 1–10**, med «Klimaversting» for score 1–2 og tips til de største kildene
- **Adminpanel** (`/admin`) der forhåndsdefinerte admins kan legge til, endre og slette utslippsmetoder

Ingen svar lagres. All utregning skjer i nettleseren.

## Kom i gang

Krever Node 22.18+, pnpm og (for databasen) Docker.

```bash
pnpm install
pnpm dev            # http://localhost:5173
```

Uten databasen bruker kalkulatoren det innebygde datasettet (`src/data/seed.ts`).
Alt fungerer da unntatt adminpanelet.

### Med lokal database

```bash
npx supabase start          # starter Postgres + Auth i Docker, kjører migrering og seed
npx supabase status         # viser URL og anon-nøkkel
cp .env.example .env.local  # lim inn URL (http://127.0.0.1:54321) og ANON_KEY
pnpm db:verify-rls          # sjekker at tilgangskontrollen holder
```

## Mappestruktur

```
src/
├── App.tsx                     Rammen: header, footer, ruting mellom kalkulator og /admin
├── components/
│   ├── calculator/             Alt kunden ser
│   │   ├── Calculator.tsx        Holder svarene og kobler delene sammen
│   │   ├── MethodPicker.tsx      Nedtrekksmenyer til venstre, svaralternativer til høyre
│   │   ├── DonutChart.tsx        Sektordiagrammet (live)
│   │   ├── OilTank.tsx           Oljetanken (oppdateres kun ved «Regn ut»)
│   │   ├── ScoreDialog.tsx       Popup med score 1–10
│   │   ├── FlyingChips.tsx       Animasjon: valget «flyr» inn i diagrammet
│   │   └── SourcesSection.tsx    «Kilder og metode»
│   ├── admin/                  Adminpanelet (lastes kun på /admin)
│   │   ├── AdminPanel.tsx        Innlogging og tilgangssjekk
│   │   ├── AdminDashboard.tsx    Faner: metoder, kategorier, innstillinger
│   │   └── *Form.tsx             Skjemaene for å legge til/redigere
│   └── ui/                     Gjenbrukbare byggeklosser (knapp, skjemafelt)
├── data/seed.ts                Utslippsfaktorene med kilder. Innebygd reserve + kilde til seed.sql
├── hooks/useCalculatorData.ts  Henter data fra databasen, faller tilbake til seed
├── lib/
│   ├── calculator/             Ren beregningslogikk (ingen React) – med tester
│   │   ├── engine.ts             Regner om til kg CO₂e per år
│   │   ├── score.ts              Score 1–10
│   │   └── colors.ts             Farger per utslippsmetode
│   ├── admin/                  API-kall og skjemavalidering for adminpanelet
│   ├── dataSource.ts           Leser fra Supabase og mapper til appens typer
│   ├── supabaseClient.ts       Supabase-klienten (null hvis ikke konfigurert)
│   └── config.ts               Miljøvariabler
└── types/
    ├── calculator.ts           Appens domenetyper
    ├── database.ts             Radtyper
    └── database.generated.ts   Generert fra databaseskjemaet
supabase/
├── config.toml                 Lokal Supabase (selvregistrering av)
├── migrations/                 Tabeller, constraints, RLS, revisjonslogg
└── seed.sql                    AUTOGENERERT fra src/data/seed.ts
scripts/
├── generate-seed-sql.ts        pnpm db:seed-sql
└── verify-rls.ts               pnpm db:verify-rls
```

## Slik regnes det

1. Hvert svar er et **antall per periode** (f.eks. 3 middager per uke).
2. Antall × **kg CO₂e per enhet** × perioder per år (uke 52, måned 12, år 1) = kg per år.
3. Totalen er summen av dine valg + **felles utslipp** (5,6 tonn: offentlig sektor og
   investeringer, som alle har uansett livsstil).
4. Totalen sammenlignes med **snittet på 13 tonn** (Miljødirektoratet, forbruksbasert, 2020).
5. **Score** = 5,5 − 4,5 × log₂(total / snitt), avrundet og begrenset til 1–10.
   Halvparten av snittet gir 10, likt snittet gir 6, dobbelt så mye gir 1.

Alle faktorer og kilder står i `src/data/seed.ts` og vises i appen under «Kilder og metode».

## Sikkerhet

- **Tilgangskontrollen ligger i databasen (Row Level Security)**, ikke i frontend.
  «Admin?»-knappen er bare en snarvei. Alle kan lese kalkulatordata, bare brukere i
  tabellen `admins` kan endre.
- **Ingen selvregistrering.** Admins opprettes manuelt (se under).
- **Constraints** i databasen avviser ugyldige verdier (negative tall, ikke-https-lenker osv.).
- **Revisjonslogg**: alle endringer lagres i `audit_log` med hvem og når.
- **Sikkerhetshoder** (CSP, HSTS m.m.) settes i `vercel.json`.
- `pnpm db:verify-rls` prøver å lese/skrive som anonym, vanlig bruker og admin.

## Produksjonsoppsett (Supabase + Vercel)

1. Opprett et Supabase-prosjekt (velg EU-region, f.eks. Stockholm eller Frankfurt).
2. **Authentication → Sign In / Providers**: slå av «Allow new users to sign up».
3. Kjør migrering og seed:
   ```bash
   npx supabase link --project-ref <ref>
   npx supabase db push --include-seed
   ```
4. Opprett admin: **Authentication → Users → Add user** (e-post + sterkt passord),
   og kjør i SQL-editoren:
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'admin@eksempel.no';
   ```
5. I Vercel: legg inn `VITE_SUPABASE_URL` og `VITE_SUPABASE_ANON_KEY` (Project Settings → API).
6. Legg inn produksjonsdomenet under **Authentication → URL Configuration**.

## Scripts

| Kommando | Hva den gjør |
|---|---|
| `pnpm dev` | Utviklingsserver |
| `pnpm build` | Typesjekk + produksjonsbygg |
| `pnpm test` | Enhetstester (beregning og validering) |
| `pnpm lint` | oxlint |
| `pnpm db:seed-sql` | Genererer `supabase/seed.sql` fra `src/data/seed.ts` |
| `pnpm db:verify-rls` | Tester tilgangskontrollen mot lokal Supabase |
