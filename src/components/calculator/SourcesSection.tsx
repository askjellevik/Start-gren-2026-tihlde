import type { CalculatorData } from '@/types/calculator'
import { formatKg, PERIOD_LABEL } from '@/lib/calculator/engine'

// "Kilder og metode": viser hvor hvert tall kommer fra.
export function SourcesSection({ data }: { data: CalculatorData }) {
  const { settings } = data
  return (
    <details className="group rounded-lg border bg-card p-5">
      <summary className="cursor-pointer font-bold text-primary">Kilder og metode</summary>
      <div className="mt-4 space-y-4 text-sm">
        <p>
          Alle svar regnes om til kilo CO₂-ekvivalenter per år og sammenlignes med{' '}
          <strong>livsstilsfotavtrykket</strong> til en gjennomsnittlig nordmann:{' '}
          <strong>{formatKg(settings.nationalAverageKg)}</strong>{' '}
          <SourceLink name={settings.nationalAverageSource} url={settings.nationalAverageSourceUrl} />.
          Det er utslippene fra det du selv spiser, reiser, bor og kjøper – ikke offentlig sektor
          eller investeringer i veier og bygg.
          {settings.baselineKg > 0 && (
            <>
              {' '}Alle får i tillegg <strong>{formatKg(settings.baselineKg)}</strong> for{' '}
              {settings.baselineLabel.toLowerCase()}, som er vanskelig å påvirke selv.
            </>
          )}
          {settings.targetKg && (
            <>
              {' '}Den grønne streken i tanken viser {settings.targetLabel?.toLowerCase() ?? 'klimamålet'}:{' '}
              <strong>{formatKg(settings.targetKg)}</strong> per person.
            </>
          )}
        </p>
        <p className="text-muted-foreground">
          Du ser kanskje også tallene 8 og 13 tonn. 8 tonn er Norges utslipp innenfor landets grenser
          delt på antall innbyggere, inkludert olje- og gassproduksjon for eksport. 13 tonn er alt
          forbruk i Norge inkludert offentlig sektor og investeringer. Ingen av dem måler det én
          person selv kan påvirke, så vi bruker livsstilsfotavtrykket.
        </p>
        <p className="text-muted-foreground">
          Tallene er avrundede gjennomsnitt og gir et omtrentlig bilde, ikke et nøyaktig
          klimaregnskap. Flyreiser er regnet uten høydeeffekt, så de reelle klimaeffektene er
          trolig større. Ingen svar lagres – alt regnes ut i nettleseren din.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] text-left">
            <thead className="text-xs text-muted-foreground uppercase">
              <tr>
                <th className="py-2 pr-3">Utslippsmetode</th>
                <th className="py-2 pr-3">Faktor</th>
                <th className="py-2">Kilde</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.methods.map((m) => (
                <tr key={m.id}>
                  <td className="py-2 pr-3">{m.name}</td>
                  <td className="py-2 pr-3 whitespace-nowrap tabular-nums">
                    {m.kgCo2ePerUnit.toLocaleString('nb-NO')} kg per {m.unitLabel}
                    <span className="block text-xs text-muted-foreground">{PERIOD_LABEL[m.period]}</span>
                  </td>
                  <td className="py-2">
                    <SourceLink name={m.sourceName} url={m.sourceUrl} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </details>
  )
}

function SourceLink({ name, url }: { name: string | null; url: string | null }) {
  if (!name) return null
  // Kun https-lenker vises som lenker (databasen håndhever det samme).
  if (url && url.startsWith('https://')) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2">
        ({name})
      </a>
    )
  }
  return <span className="text-muted-foreground">({name})</span>
}
