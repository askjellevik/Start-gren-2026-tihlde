import { RotateCcw, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { AnimatedNumber } from '@/components/ui/animated-number'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useCalculatorData } from '@/hooks/useCalculatorData'
import { buildMethodColors } from '@/lib/calculator/colors'
import { findEasyWin, type EasyWin } from '@/lib/calculator/easyWin'
import { computeFootprint, formatKg, type Footprint } from '@/lib/calculator/engine'
import type { Answers } from '@/types/calculator'
import { AverageNote } from './AverageNote'
import { DonutChart } from './DonutChart'
import { FlyingChips, type FlyingChip } from './FlyingChips'
import { MethodPicker } from './MethodPicker'
import { OilTank } from './OilTank'

/** Popupen åpnes like etter klikk, mens oljen fortsatt stiger bak den. */
const DIALOG_DELAY_MS = 500
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
  const [snapshot, setSnapshot] = useState<{ footprint: Footprint; easyWin: EasyWin | null } | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const dialogTimer = useRef<number | undefined>(undefined)
  const highlightTimer = useRef<number | undefined>(undefined)
  const donutRef = useRef<HTMLDivElement>(null)
  const tankRef = useRef<HTMLElement>(null)
  const calcAreaRef = useRef<HTMLDivElement>(null)
  const [showFloatingBar, setShowFloatingBar] = useState(false)

  // Viser den flytende «Regn ut»-linjen bare når knappen i kortet ikke er synlig.
  useEffect(() => {
    const node = calcAreaRef.current
    if (!node) return
    const observer = new IntersectionObserver(([entry]) => setShowFloatingBar(!entry.isIntersecting))
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
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
  const snapshotStale = snapshot !== null && snapshot.footprint.totalKg !== footprint.totalKg

  function handleAnswer(methodId: string, choiceIndex: number, event: MouseEvent<HTMLButtonElement>) {
    const method = data.methods.find((m) => m.id === methodId)
    if (!method) return
    const next = { ...answers, [methodId]: choiceIndex }
    setAnswers(next)
    // Løfter biten i diagrammet et øyeblikk.
    setHighlightId(methodId)
    window.clearTimeout(highlightTimer.current)
    highlightTimer.current = window.setTimeout(() => setHighlightId(null), 650)

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
    setSnapshot({ footprint, easyWin: findEasyWin(data, answers) })
    // På store skjermer står tanken ved siden av knappen; på mobil scroller vi dit.
    if (window.matchMedia('(max-width: 1023px)').matches) {
      tankRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' })
    }
    // Oljen stiger med en gang; popupen kommer kort etter mens oljen fortsatt stiger.
    window.clearTimeout(dialogTimer.current)
    dialogTimer.current = window.setTimeout(() => setDialogOpen(true), reduceMotion ? 0 : DIALOG_DELAY_MS)
  }

  function handleReset() {
    window.clearTimeout(dialogTimer.current)
    setAnswers({})
    setSnapshot(null)
    setActiveMethodId(null)
    setHighlightId(null)
  }

  const progress = footprint.answeredCount / Math.max(1, footprint.methodCount)

  return (
    <div className="space-y-6">
      <Card aria-labelledby="inputs-heading" className="p-5 sm:p-7">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <StepHeading step={1} id="inputs-heading" title="Fortell om hverdagen din">
            Velg en kategori og svar på spørsmålene. Du kan hoppe fritt mellom dem.
          </StepHeading>
          <div className="flex items-center gap-3 text-sm">
            <div className="w-36">
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-accent to-primary"
                  initial={false}
                  animate={{ width: `${progress * 100}%` }}
                  transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                />
              </div>
              <span className="mt-1 block text-xs text-muted-foreground">
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
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card aria-labelledby="donut-heading" className="p-5 sm:p-7">
          <StepHeading step={2} id="donut-heading" title="Dine utslipp">
            Oppdateres mens du svarer. De største bitene er verstingene dine.
          </StepHeading>
          <div className="mt-6">
            <DonutChart ref={donutRef} footprint={footprint} colors={colors} highlightId={highlightId} />
          </div>

          <div ref={calcAreaRef} className="mt-7 border-t border-border/70 pt-6">
            <Button
              size="lg"
              className="btn-shine h-13 w-full rounded-xl text-base font-bold shadow-lift transition-transform hover:-translate-y-0.5"
              onClick={handleCalculate}
            >
              <Sparkles /> Regn ut min bærekraftsscore
            </Button>
            {footprint.answeredCount < footprint.methodCount && (
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Ubesvarte spørsmål teller som null utslipp.
              </p>
            )}
          </div>
        </Card>

        <Card
          ref={tankRef}
          aria-labelledby="tank-heading"
          className="scroll-mt-6 bg-gradient-to-b from-secondary to-card p-5 sm:p-7"
        >
          <StepHeading step={3} id="tank-heading" title="I forhold til snittet">
            Oransje strek er snittet for en nordmann, grønn er{' '}
            {data.settings.targetLabel?.toLowerCase() ?? 'klimamålet'}.
          </StepHeading>
          {snapshotStale && (
            <p className="mt-3 rounded-lg bg-background/80 p-2 text-xs ring-1 ring-border">
              Du har endret svar. Trykk «Regn ut» igjen for å oppdatere tanken.
            </p>
          )}
          <div className="mt-4">
            <OilTank
              result={
                snapshot ? { totalKg: snapshot.footprint.totalKg, baselineKg: snapshot.footprint.baselineKg } : null
              }
              averageKg={data.settings.nationalAverageKg}
              targetKg={data.settings.targetKg}
            />
          </div>
          <AverageNote settings={data.settings} className="mt-4" />
        </Card>
      </div>

      {/* Flytende oppsummering når «Regn ut»-knappen er utenfor skjermen */}
      <AnimatePresence>
        {showFloatingBar && footprint.answeredCount > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="fixed inset-x-0 bottom-4 z-30 flex justify-center px-4"
          >
            <div className="flex items-center gap-4 rounded-full border border-white/40 bg-primary/90 py-2 pr-2 pl-5 text-primary-foreground shadow-lift backdrop-blur-md">
              <span className="text-sm">
                Dine valg:{' '}
                <AnimatedNumber value={footprint.personalKg} format={formatKg} className="font-black tabular-nums" />
              </span>
              <Button size="sm" variant="secondary" className="rounded-full font-bold" onClick={handleCalculate}>
                Regn ut
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <SourcesSection data={data} />

      {snapshot && (
        <ScoreDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          footprint={snapshot.footprint}
          settings={data.settings}
          easyWin={snapshot.easyWin}
        />
      )}
      <FlyingChips chips={chips} onDone={(key) => setChips((c) => c.filter((x) => x.key !== key))} />
    </div>
  )
}

function StepHeading({ step, id, title, children }: { step: number; id: string; title: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span
        aria-hidden
        className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-accent to-primary text-sm font-black text-primary-foreground shadow-lift"
      >
        {step}
      </span>
      <div>
        <h2 id={id} className="text-xl font-black tracking-tight text-primary sm:text-2xl">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground">{children}</p>
      </div>
    </div>
  )
}
