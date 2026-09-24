# Bærekraftskalkulator for Cultura Bank

Et verktøy der du svarer på spørsmål om mat, reiser, bolig, forbruk og avfall og ser
klimafotavtrykket ditt sammenlignet med en gjennomsnittlig nordmann.

- **Kategoriene låses opp én etter én**: neste kategori vises når alle spørsmålene i den forrige er besvart
- **Sektordiagram** som oppdateres live mens du svarer
- **Oljetank** som fylles når du trykker «Regn ut min bærekraftsscore» – streken er snittet
- **Bærekraftsscore 1–10**, med «Klimaversting» for score 1–2 og tips til de største kildene
- **Et enkelt grep**: det ene tiltaket som sparer deg mest, satt i kontekst (tapt havis og klimabudsjett)
- **Adminpanel** (`/admin`) der forhåndsdefinerte admins kan legge til, endre og slette utslippsmetoder,
  kategorier og innstillinger

Ingen svar lagres. All utregning skjer i nettleseren.

## Kom i gang

Krever Node 22.18+ og pnpm.

```bash
pnpm install
cp .env.example .env.local   # fyll inn URL og anon-nøkkel
pnpm dev                     
```

`.env.local` peker på Supabase-prosjektet i skyen (**Project Settings → API**):

```
VITE_SUPABASE_URL=https://<ref>.supabase.co      # kun basis-URL, IKKE /rest/v1/ på slutten
VITE_SUPABASE_ANON_KEY=<anon/publishable key>    # offentlig med vilje, beskyttet av RLS
```

Merk: lokal utvikling bruker da **samme database som den publiserte siden**. Endringer du gjør
i adminpanelet på `localhost` er synlige for alle.

Uten `.env.local` bruker kalkulatoren det innebygde datasettet (`src/data/seed.ts`).
Alt fungerer da unntatt adminpanelet.

### Valgfritt: lokal database i Docker

Vil du teste uten å røre produksjonsdatabasen, kan du kjøre Supabase lokalt (krever Docker):

```bash
npx supabase start          # starter Postgres + Auth i Docker, kjører migrering og seed
npx supabase status         # viser URL (http://127.0.0.1:54321) og anon-nøkkel til .env.local
pnpm db:verify-rls          # sjekker at tilgangskontrollen holder (kun mot lokal database)
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
│   │   ├── ScoreDialog.tsx       Popup med score 1–10 og «Et enkelt grep»
│   │   ├── AverageNote.tsx       Forklarer hva snittet måler
│   │   ├── FlyingChips.tsx       Animasjon: valget «flyr» inn i diagrammet
│   │   └── SourcesSection.tsx    «Kilder og metode»
│   ├── admin/                  Adminpanelet (lastes kun på /admin)
│   │   ├── AdminPanel.tsx        Innlogging og tilgangssjekk
│   │   ├── AdminDashboard.tsx    Faner: metoder, kategorier, innstillinger
│   │   └── *Form.tsx             Skjemaene for å legge til/redigere
│   └── ui/                     Gjenbrukbare byggeklosser (knapp, kort, skjemafelt, animert tall)
├── data/seed.ts                Utslippsfaktorene med kilder. Innebygd reserve + kilde til seed.sql
├── hooks/useCalculatorData.ts  Henter data fra databasen, faller tilbake til seed
├── lib/
│   ├── calculator/             Ren beregningslogikk (ingen React) – med tester
│   │   ├── engine.ts             Regner om til kg CO₂e per år
│   │   ├── score.ts              Score 1–10
│   │   ├── easyWin.ts            Finner «Et enkelt grep»
│   │   ├── equivalents.ts        Setter besparelsen i kontekst (havis, klimabudsjett)
│   │   ├── progress.ts           Hvilke kategorier som er låst opp
│   │   └── colors.ts             Farger per utslippsmetode (nyanser av kategorifargen)
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
└── seed.sql                    AUTOGENERERT fra src/data/seed.ts (kjøres kun ved oppretting)
public/                         Favicon (samme filer som cultura.no)
scripts/
├── generate-seed-sql.ts        pnpm db:seed-sql
└── verify-rls.ts               pnpm db:verify-rls
```

## Slik regnes det

1. Hvert svar er et **antall per periode** (f.eks. 3 middager per uke).
2. Antall × **kg CO₂e per enhet** × perioder per år (uke 52, måned 12, år 1) = kg per år.
3. Totalen er summen av dine valg + et **fast tillegg på 0,5 tonn** for tjenester alle bruker
   (helse, utdanning, kommunikasjon).
4. Totalen sammenlignes med **livsstilsfotavtrykket til en gjennomsnittlig nordmann: 7,8 tonn**
   (Hot or Cool Institute 2025: mat 2,1 · bolig 1,0 · transport 2,8 · varer 0,4 · fritid 1,0 ·
   tjenester 0,5). Tanken viser også **1,5-gradersmålet for 2035: 1,1 tonn**.
5. **Score** = 5,5 − 4,5 × log₂(total / snitt), avrundet og begrenset til 1–10.
   Halvparten av snittet gir 10, likt snittet gir 6, dobbelt så mye gir 1.
6. **Et enkelt grep**: popupen viser det grepet som sparer brukeren mest, f.eks. «Dersom du bare
   tar én kjøretur mindre til jobb i uka …, sparer du 367 kg i året». Hver metode kan ha en slik
   tekst, et antall enheter og en erstatning (rødt kjøtt → vegetar). Utslippet fra erstatningen
   trekkes fra, og man kan aldri kutte mer enn man gjør i dag (`src/lib/calculator/easyWin.ts`).

Flyreiser regnes uten høydeeffekt (ikke-CO₂), slik SSB og DEFRA oppgir dem.

**Hvorfor ikke 8 eller 13 tonn?** 8 tonn er Norges territorielle utslipp (44,6 mill. tonn i 2024,
SSB) delt på innbyggere – inkludert olje- og gassproduksjon for eksport, men uten import.
13 tonn er alt forbruk inkludert offentlig sektor og investeringer (Miljødirektoratet).
Ingen av dem måler det én person påvirker, så de passer ikke som sammenligning i en
personlig kalkulator.

Alle faktorer og kilder står i `src/data/seed.ts` og vises i appen under «Kilder og metode».
En test (`engine.test.ts`) sjekker at et typisk svarsett havner nær 7,8 tonn.

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
   Sett også minste passordlengde (**Authentication → Policies**) – `config.toml` gjelder kun lokalt.
3. Kjør migrering og seed:
   ```bash
   npx supabase login
   npx supabase link --project-ref <ref>     # spør etter databasepassordet
   npx supabase db push --include-seed
   ```
4. Opprett en admin (se [Admin-brukere](#admin-brukere)).
5. Importer repoet i Vercel (**Add New → Project**). Vite oppdages automatisk.
   Legg inn miljøvariablene under **Settings → Environment Variables** for Production:
   - `VITE_SUPABASE_URL` = `https://<ref>.supabase.co` (uten `/rest/v1/`)
   - `VITE_SUPABASE_ANON_KEY` = anon-nøkkelen

   Verdiene bygges inn i koden, så etter en endring må du **deploye på nytt**
   (Deployments → ⋯ → Redeploy, uten byggcache). De trenger ikke være «Sensitive» –
   de er synlige i nettleseren uansett. `service_role`-nøkkelen skal **aldri** inn her.
6. Legg inn produksjonsdomenet under **Authentication → URL Configuration**.

**Deploy:** push til `main` går til produksjon. Andre grener får en egen forhåndsvisnings-URL.
På Vercel Hobby blokkeres deploy av private repoer når siste commit er skrevet av noen som ikke
har tilgang til Vercel-prosjektet. Løsning: merge med `git merge --no-ff` (merge-commiten blir
din), eller en tom commit: `git commit --allow-empty -m "chore: deploy"`.

## Data i databasen

Kalkulatoren leser kategorier, utslippsmetoder (med farger, tips og «Et enkelt grep») og
innstillinger fra Supabase. `src/data/seed.ts` brukes bare hvis databasen ikke svarer.

**`seed.sql` kjøres bare én gang, når databasen opprettes.** Endrer du `seed.ts`/`seed.sql`
senere, kommer endringen *ikke* automatisk inn i en database som allerede har data. Gjør heller
endringer slik:

- **Innhold** (tall, tekster, farger): i adminpanelet. Dette er måten banken skal bruke.
- **Skjema** (nye kolonner, tabeller): i en **ny** fil i `supabase/migrations/`, og kjør
  `npx supabase db push`. Rediger aldri en migrering som allerede er kjørt.
- **Før lansering, uten ekte data:** `npx supabase db reset --linked` sletter hele databasen og
  kjører migrering og seed på nytt. Admin-raden (og muligens admin-brukeren) må da legges inn
  igjen. Ikke bruk dette etter at admins har begynt å endre verdier – endringene forsvinner.

## Admin-brukere

Det finnes ingen selvregistrering og ingen e-postutsending (ingen SMTP), så admins
administreres i Supabase-dashbordet.

**Legg til admin**
1. **Authentication → Users → Add user → Create new user**: e-post + sterkt passord,
   kryss av **Auto Confirm User**.
2. I **SQL Editor**:
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'admin@eksempel.no';
   ```

**Fjern admin:** `delete from public.admins where user_id = (select id from auth.users where email = '…');`
Slett eventuelt brukeren under Authentication → Users.

**Nytt passord** (glemt passord – «Send password recovery» virker ikke uten SMTP):
```sql
update auth.users
set encrypted_password = extensions.crypt('NyttSterktPassord', extensions.gen_salt('bf'))
where email = 'admin@eksempel.no';
```
Gi passordet til brukeren på en trygg måte.

**«Feil e-post eller passord»** vises uansett årsak. Sjekk at brukeren finnes og er bekreftet,
at den har en rad i `admins`, og at `VITE_SUPABASE_URL` er uten `/rest/v1/`. Den egentlige feilen
står i DevTools → Network (`token?grant_type=password`).

## Scripts

| Kommando | Hva den gjør |
|---|---|
| `pnpm dev` | Utviklingsserver |
| `pnpm build` | Typesjekk + produksjonsbygg |
| `pnpm test` | Enhetstester (beregning og validering) |
| `pnpm lint` | oxlint |
| `pnpm db:seed-sql` | Genererer `supabase/seed.sql` fra `src/data/seed.ts` |
| `pnpm db:verify-rls` | Tester tilgangskontrollen mot lokal Supabase (krever Docker) |

## Før overlevering til banken

Per nå kjører prosjektet på gratisplaner og personlige kontoer. For varig drift bør man:

- eie GitHub-repoet, Vercel-prosjektet, Supabase-prosjektet og domenet selv
- bruke Vercel Pro (Eller en liknende, passende host) og betalt Supabase
  (gratisprosjekter pauses ved lite aktivitet – kalkulatoren faller da stille tilbake til `seed.ts`)
- vurdere tofaktor (MFA) for admins og egen SMTP service for passordtilbakestilling
