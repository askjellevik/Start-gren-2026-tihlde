import { motion, useReducedMotion } from 'motion/react'
import { Dialog } from 'radix-ui'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatKg, type Footprint } from '@/lib/calculator/engine'
import { isKlimaversting, scoreHeadline, sustainabilityScore } from '@/lib/calculator/score'
import { cn } from '@/lib/utils'

interface ScoreDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  footprint: Footprint
  averageKg: number
}

// Popup med bærekraftsscore 1–10 og de største utslippskildene med tips.
export function ScoreDialog({ open, onOpenChange, footprint, averageKg }: ScoreDialogProps) {
  const reduceMotion = useReducedMotion()
  const score = sustainabilityScore(footprint.totalKg, averageKg)
  const versting = isKlimaversting(score)
  const diffPct = Math.round((footprint.totalKg / averageKg - 1) * 100)
  const worst = footprint.methods.slice(0, 3)

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 z-50 max-h-[90svh] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl bg-background p-6 shadow-2xl data-[state=open]:animate-in data-[state=open]:zoom-in-95 data-[state=open]:fade-in-0 sm:p-8"
        >
          <Dialog.Close className="absolute top-4 right-4 rounded-md p-1 text-muted-foreground hover:bg-muted" aria-label="Lukk">
            <X className="size-5" />
          </Dialog.Close>

          <Dialog.Title className="text-sm font-bold tracking-wide text-muted-foreground uppercase">
            Din bærekraftsscore
          </Dialog.Title>

          <div className="mt-4 flex items-end gap-4">
            <motion.span
              initial={reduceMotion ? false : { scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 14 }}
              className={cn('text-7xl leading-none font-black', versting ? 'text-danger' : 'text-primary')}
            >
              {score}
            </motion.span>
            <span className="pb-2 text-lg text-muted-foreground">av 10</span>
          </div>

          {/* Skala 1–10 */}
          <div className="mt-4 flex gap-1" aria-hidden>
            {Array.from({ length: 10 }, (_, i) => (
              <motion.span
                key={i}
                initial={reduceMotion ? false : { scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ delay: reduceMotion ? 0 : 0.05 * i }}
                className={cn(
                  'h-2.5 flex-1 origin-bottom rounded-full',
                  i < score ? (versting ? 'bg-danger' : 'bg-accent') : 'bg-muted',
                )}
              />
            ))}
          </div>

          <p className={cn('mt-5 text-2xl font-black', versting ? 'text-danger' : 'text-primary')}>
            {scoreHeadline(score)}
          </p>
          <Dialog.Description className="mt-1">
            Fotavtrykket ditt er <strong>{formatKg(footprint.totalKg)}</strong> per år, som er{' '}
            <strong>{Math.abs(diffPct)} %</strong> {diffPct >= 0 ? 'over' : 'under'} snittet for en
            nordmann ({formatKg(averageKg)}).
          </Dialog.Description>

          {versting && (
            <p className="mt-4 rounded-lg bg-danger/10 p-3 text-sm text-danger">
              Du er i klimaverstingklassen – men det betyr bare at du har mye å spare. Se de største
              kildene under.
            </p>
          )}

          {worst.length > 0 && (
            <div className="mt-6">
              <h3 className="font-bold text-primary">Dine største utslippskilder</h3>
              <ol className="mt-2 space-y-3">
                {worst.map(({ method, kgPerYear }, i) => (
                  <li key={method.id} className="rounded-lg bg-muted p-3">
                    <div className="flex justify-between gap-2 font-bold">
                      <span>
                        {i + 1}. {method.name}
                      </span>
                      <span className="tabular-nums">{formatKg(kgPerYear)}</span>
                    </div>
                    {method.tip && <p className="mt-1 text-sm text-muted-foreground">{method.tip}</p>}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {footprint.answeredCount < footprint.methodCount && (
            <p className="mt-4 text-xs text-muted-foreground">
              Du har svart på {footprint.answeredCount} av {footprint.methodCount} spørsmål. Ubesvarte
              spørsmål teller som null utslipp.
            </p>
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
