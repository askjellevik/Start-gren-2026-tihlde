import { RotateCcw } from 'lucide-react'
import { useMemo, useRef, useState, type MouseEvent } from 'react'
import { useReducedMotion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { useCalculatorData } from '@/hooks/useCalculatorData'
import { buildMethodColors } from '@/lib/calculator/colors'
import { computeFootprint, type Footprint } from '@/lib/calculator/engine'
import type { Answers } from '@/types/calculator'
import { DonutChart } from './DonutChart'
import { FlyingChips, type FlyingChip } from './FlyingChips'
import { MethodPicker } from './MethodPicker'
import { FILL_DURATION, OilTank } from './OilTank'
import { ScoreDialog } from './ScoreDialog'
import { SourcesSection } from './SourcesSection'

// Kundevisning: all utregning skjer lokalt i klienten, ingen persondata lagres.
export function Calculator() {
  const { data } = useCalculatorData()
  const reduceMotion = useReducedMotion()

  const [answers, setAnswers] = useState<Answers>({})
  const [activeMethodId, setActiveMethodId] = useState<string | null>(null)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const [chips, setChips] = useState<FlyingChip[]>([])
  // Tanken og scoren bruker et øyeblikksbilde fra sist man trykket "Regn ut".
  const [snapshot, setSnapshot] = useState<Footprint | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const dialogTimer = useRef<number | undefined>(undefined)
  const donutRef = useRef<HTMLDivElement>(null)
  const tankRef = useRef<HTMLDivElement>(null)
  const chipKey = useRef(0)

  const colors = useMemo(() => buildMethodColors(data), [data])
  const footprint = useMemo(() => computeFootprint(data, answers), [data, answers])
  // Spørsmålene i rekkefølge: kategori for kategori.
  const orderedMethods = useMemo(
    () => data.categories.flatMap((c) => data.methods.filter((m) => m.categoryId === c.id)),
    [data],
  )
  const activeId = activeMethodId && data.methods.some((m) => m.id === activeMethodId)
    ? activeMethodId
    : (orderedMethods[0]?.id ?? null)
  const snapshotStale = snapshot !== null && snapshot.totalKg !== footprint.totalKg

  function handleAnswer(methodId: string, choiceIndex: number, event: MouseEvent<HTMLButtonElement>) {
    const method = data.methods.find((m) => m.id === methodId)
    if (!method) return
    const next = { ...answers, [methodId]: choiceIndex }
    setAnswers(next)
    setHighlightId(methodId)

    // Merkelapp som flyr inn i diagrammet
    const target = donutRef.current?.getBoundingClientRect()
    const from = event.currentTarget.getBoundingClientRect()
    if (!reduceMotion && target && method.kgCo2ePerUnit > 0 && method.choices[choiceIndex]?.value > 0) {
      const key = ++chipKey.current
      setChips((c) => [
        ...c,
        {
          key,
          label: `${method.name}: ${method.choices[choiceIndex].label}`,
          color: colors.get(methodId) ?? 'var(--primary)',
          from: { x: from.left + 12, y: from.top + from.height / 2 - 12 },
          to: { x: target.left + target.width / 2 - 20, y: target.top + target.height / 2 - 12 },
        },
      ])
    }

    // Gå videre til neste ubesvarte spørsmål
    const start = orderedMethods.findIndex((m) => m.id === methodId)
    const nextMethod = [...orderedMethods.slice(start + 1), ...orderedMethods.slice(0, start)].find(
      (m) => next[m.id] === undefined,
    )
    if (nextMethod) {
      window.setTimeout(() => setActiveMethodId(nextMethod.id), reduceMotion ? 0 : 450)
    }
  }

  function handleCalculate() {
    setSnapshot(footprint)
    tankRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' })
    // Popupen kommer når oljen har steget ferdig.
    window.clearTimeout(dialogTimer.current)
    dialogTimer.current = window.setTimeout(
      () => setDialogOpen(true),
      reduceMotion ? 0 : FILL_DURATION * 1000 + 400,
    )
  }

  function handleReset() {
    window.clearTimeout(dialogTimer.current)
    setAnswers({})
    setSnapshot(null)
    setActiveMethodId(null)
    setHighlightId(null)
  }

  const progress = Math.round((footprint.answeredCount / Math.max(1, footprint.methodCount)) * 100)

  return (
    <div className="space-y-6">
      <section aria-labelledby="inputs-heading" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="inputs-heading" className="text-2xl font-black text-primary">
              1. Fortell om hverdagen din
            </h2>
            <p className="text-muted-foreground">
              Velg en kategori til venstre og svar på spørsmålene til høyre.
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="w-32">
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-xs text-muted-foreground">
                {footprint.answeredCount} av {footprint.methodCount} besvart
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleReset} disabled={footprint.answeredCount === 0}>
              <RotateCcw /> Nullstill
            </Button>
          </div>
        </div>
        <MethodPicker
          data={data}
          answers={answers}
          colors={colors}
          activeMethodId={activeId}
          onSelectMethod={setActiveMethodId}
          onAnswer={handleAnswer}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-labelledby="donut-heading" className="rounded-lg border bg-card p-5 md:p-6">
          <h2 id="donut-heading" className="text-2xl font-black text-primary">
            2. Dine utslipp
          </h2>
          <p className="mb-5 text-muted-foreground">
            Oppdateres mens du svarer. De største sektorene er verstingene dine.
          </p>
          <DonutChart ref={donutRef} footprint={footprint} colors={colors} highlightId={highlightId} />

          <div className="mt-6 border-t pt-5">
            <Button size="lg" className="h-12 w-full text-base font-bold" onClick={handleCalculate}>
              Regn ut min bærekraftsscore
            </Button>
            {footprint.answeredCount < footprint.methodCount && (
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Ubesvarte spørsmål teller som null utslipp.
              </p>
            )}
          </div>
        </section>

        <section
          ref={tankRef}
          aria-labelledby="tank-heading"
          className="rounded-lg border bg-secondary p-5 md:p-6"
        >
          <h2 id="tank-heading" className="text-2xl font-black text-primary">
            3. Mot snittet
          </h2>
          <p className="mb-2 text-sm text-muted-foreground">
            Den oransje streken er snittet for en nordmann, den grønne er{' '}
            {data.settings.targetLabel?.toLowerCase() ?? 'klimamålet'}.
          </p>
          {snapshotStale && (
            <p className="mb-2 rounded-md bg-background p-2 text-xs">
              Du har endret svar. Trykk «Regn ut» igjen for å oppdatere tanken.
            </p>
          )}
          <OilTank
            result={snapshot ? { totalKg: snapshot.totalKg, baselineKg: snapshot.baselineKg } : null}
            averageKg={data.settings.nationalAverageKg}
            targetKg={data.settings.targetKg}
          />
        </section>
      </div>

      <SourcesSection data={data} />

      {snapshot && (
        <ScoreDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          footprint={snapshot}
          averageKg={data.settings.nationalAverageKg}
        />
      )}
      <FlyingChips chips={chips} onDone={(key) => setChips((c) => c.filter((x) => x.key !== key))} />
    </div>
  )
}
