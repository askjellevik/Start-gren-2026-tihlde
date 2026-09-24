import type { CalculatorData } from '@/types/calculator'
import { PERIOD_LABEL } from '@/lib/calculator/engine'

// "Kilder og metode": viser hvor hvert tall kommer fra.
export function SourcesSection({ data }: { data: CalculatorData }) {
  const { settings } = data
  return (
    <details className="group rounded-lg border bg-card p-5">
      <summary className="cursor-pointer font-bold text-primary">Kilder og metode</summary>
      <div className="mt-4 space-y-4 text-sm">
        <p>
          Alle svar regnes om til kilo CO₂-ekvivalenter per år. Snittet for en nordmann er{' '}
          <strong>{Math.round(settings.nationalAverageKg / 100) / 10} tonn</strong>{' '}
          <SourceLink name={settings.nationalAverageSource} url={settings.nationalAverageSourceUrl} />.
          I tillegg til dine valg får alle et felles utslipp på{' '}
          <strong>{Math.round(settings.baselineKg / 100) / 10} tonn</strong> ({settings.baselineLabel.toLowerCase()}),
          fordi dette er en del av snittet uansett hvordan du lever.
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
