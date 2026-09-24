import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import { useEffect } from 'react'
import { Dialog } from 'radix-ui'
import { Snowflake, X } from 'lucide-react'
import { AnimatedNumber } from '@/components/ui/animated-number'
import { Button } from '@/components/ui/button'
import type { EasyWin } from '@/lib/calculator/easyWin'
import { formatKg, type Footprint } from '@/lib/calculator/engine'
import { formatArea, seaIceM2, shareOfBudget } from '@/lib/calculator/equivalents'
import { isKlimaversting, scoreHeadline, sustainabilityScore } from '@/lib/calculator/score'
import { cn } from '@/lib/utils'
import type { CalculatorSettings } from '@/types/calculator'

interface ScoreDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  footprint: Footprint
  settings: CalculatorSettings
  easyWin: EasyWin | null
}

// Popup med bærekraftsscore 1–10 og ett enkelt grep. Detaljene står i sektordiagrammet.
export function ScoreDialog({ open, onOpenChange, footprint, settings, easyWin }: ScoreDialogProps) {
  const averageKg = settings.nationalAverageKg
  const score = sustainabilityScore(footprint.totalKg, averageKg)
  const versting = isKlimaversting(score)
  const diffPct = Math.round((footprint.totalKg / averageKg - 1) * 100)

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 z-50 max-h-[90svh] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl bg-background p-6 shadow-2xl ring-1 ring-border/60 data-[state=open]:animate-in data-[state=open]:zoom-in-95 data-[state=open]:fade-in-0 sm:p-8"
        >
          <Dialog.Close className="absolute top-4 right-4 rounded-md p-1 text-muted-foreground hover:bg-muted" aria-label="Lukk">
            <X className="size-5" />
          </Dialog.Close>

          <Dialog.Title className="text-center text-xs font-bold tracking-wider text-muted-foreground uppercase">
            Din bærekraftsscore
          </Dialog.Title>

          <ScoreGauge score={score} versting={versting} />

          <p className={cn('mt-1 text-center text-2xl font-black', versting ? 'text-danger' : 'text-primary')}>
            {scoreHeadline(score)}
          </p>
          <Dialog.Description className="mt-1 text-center">
            Fotavtrykket ditt er <strong>{formatKg(footprint.totalKg)}</strong> per år, som er{' '}
            <strong>{Math.abs(diffPct)} %</strong> {diffPct >= 0 ? 'over' : 'under'} snittet for en
            nordmann ({formatKg(averageKg)}).
          </Dialog.Description>

          {easyWin && (
            <div className="mt-5 flex gap-3 rounded-2xl bg-gradient-to-br from-accent/15 via-accent/5 to-sky-100/60 p-4 ring-1 ring-accent/30">
              <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-xl bg-card shadow-soft">
                <Snowflake className="size-5 text-sky-600" />
              </span>
              <p>
                <span className="block text-sm font-bold text-primary">Et enkelt grep</span>
                Dersom du bare {easyWin.text}, sparer du{' '}
                <strong className="text-primary">{formatKg(easyWin.savingKg)}</strong> i året.
                <span className="mt-2 block text-sm">
                  Hvert år redder det omtrent{' '}
                  <strong>{formatArea(seaIceM2(easyWin.savingKg))} arktisk sommeris</strong> –
                  isbjørnens jaktområde
                  {settings.targetKg ? (
                    <>
                      {' '}– og tilsvarer {shareOfBudget(easyWin.savingKg, settings.targetKg)} det hver av oss
                      kan slippe ut i året for å nå {settings.targetLabel?.toLowerCase() ?? 'klimamålet'}.
                    </>
                  ) : (
                    '.'
                  )}
                </span>
              </p>
            </div>
          )}

          <Dialog.Close asChild>
            <Button className="mt-6 w-full" size="lg">
              Se tanken
            </Button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// Halvsirkel-måler: buen fylles fra rødt (1) til grønt (10) opp til scoren,
// mens tallet teller opp.
const GAUGE_R = 88
const GAUGE_ARC = `M${120 - GAUGE_R},120 A${GAUGE_R},${GAUGE_R} 0 0 1 ${120 + GAUGE_R},120`
const GAUGE_EASE = [0.22, 1, 0.36, 1] as const
const formatScore = (n: number) => String(Math.round(n))

function ScoreGauge({ score, versting }: { score: number; versting: boolean }) {
  const reduceMotion = useReducedMotion()
  const fraction = score / 10
  const duration = reduceMotion ? 0 : 1

  // Knotten følger buen: vi animerer andelen og regner ut punktet.
  const progress = useMotionValue(0)
  useEffect(() => {
    const controls = animate(progress, fraction, { duration, ease: GAUGE_EASE })
    return () => controls.stop()
  }, [progress, fraction, duration])
  const knobX = useTransform(progress, (p) => 120 + GAUGE_R * Math.cos(Math.PI * (1 - p)))
  const knobY = useTransform(progress, (p) => 120 - GAUGE_R * Math.sin(Math.PI * (1 - p)))

  return (
    <div className="relative mx-auto mt-2 w-full max-w-[16rem]">
      <svg viewBox="0 0 240 132" className="w-full" aria-hidden>
        <defs>
          <linearGradient id="gauge-fill" x1="0" x2="1">
            <stop offset="0" stopColor="var(--danger)" />
            <stop offset="0.45" stopColor="#d9a53b" />
            <stop offset="1" stopColor="var(--accent)" />
          </linearGradient>
        </defs>
        <path d={GAUGE_ARC} fill="none" stroke="var(--muted)" strokeWidth={18} strokeLinecap="round" />
        <motion.path
          d={GAUGE_ARC}
          fill="none"
          stroke="url(#gauge-fill)"
          strokeWidth={18}
          strokeLinecap="round"
          style={{ pathLength: progress }}
        />
        <motion.circle
          r={11}
          fill="white"
          stroke={versting ? 'var(--danger)' : 'var(--primary)'}
          strokeWidth={4}
          style={{ cx: knobX, cy: knobY }}
        />
      </svg>
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
        <span className={cn('text-6xl leading-none font-black tabular-nums', versting ? 'text-danger' : 'text-primary')}>
          <AnimatedNumber value={score} from={0} format={formatScore} duration={duration} />
        </span>
        <span className="text-sm text-muted-foreground">av 10</span>
      </div>
    </div>
  )
}
