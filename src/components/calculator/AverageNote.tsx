import { Info } from 'lucide-react'
import { formatKg } from '@/lib/calculator/engine'
import { cn } from '@/lib/utils'
import type { CalculatorSettings } from '@/types/calculator'

// Forklarer hva «snittet» faktisk måler, så ingen tror det er Norges
// totale utslipp delt på innbyggere.
export function AverageNote({ settings, className }: { settings: CalculatorSettings; className?: string }) {
  return (
    <p className={cn('flex gap-2 text-xs text-muted-foreground', className)}>
      <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
      <span>
        <strong className="font-bold">Om snittet:</strong> {formatKg(settings.nationalAverageKg)} er
        livsstilsfotavtrykket til en gjennomsnittlig nordmann – utslipp fra det man selv spiser,
        reiser, bor i og kjøper. Offentlig sektor, veier og bygg, og Norges olje- og gassproduksjon
        er ikke med. Tallene er avrundede anslag.
      </span>
    </p>
  )
}
