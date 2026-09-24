import { Check, ChevronDown, ChevronRight } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useRef, useState, type MouseEvent } from 'react'
import { annualKg, formatKg, PERIOD_LABEL } from '@/lib/calculator/engine'
import { cn } from '@/lib/utils'
import type { Answers, CalculatorData } from '@/types/calculator'

interface MethodPickerProps {
  data: CalculatorData
  answers: Answers
  colors: Map<string, string>
  activeMethodId: string | null
  onSelectMethod: (methodId: string) => void
  onAnswer: (methodId: string, choiceIndex: number, event: MouseEvent<HTMLButtonElement>) => void
}

// Venstre: "Utslippsmetoder" → kategorier → metoder (nedtrekksmenyer).
// Høyre: spørsmålet og svaralternativene for valgt metode.
export function MethodPicker({
  data,
  answers,
  colors,
  activeMethodId,
  onSelectMethod,
  onAnswer,
}: MethodPickerProps) {
  const [menuOpen, setMenuOpen] = useState(true)
  const reduceMotion = useReducedMotion()
  const questionRef = useRef<HTMLDivElement>(null)

  // På mobil ligger spørsmålet under menyen, så vi scroller dit ved valg.
  const selectMethod = (id: string) => {
    onSelectMethod(id)
    if (window.matchMedia('(max-width: 767px)').matches) {
      questionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }
  const activeMethod = data.methods.find((m) => m.id === activeMethodId) ?? null
  const [openCategories, setOpenCategories] = useState<Set<string>>(
    () => new Set(activeMethod ? [activeMethod.categoryId] : []),
  )

  const toggleCategory = (id: string) =>
    setOpenCategories((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  // Åpner kategorien når man hopper til et spørsmål i en ny kategori ("neste
  // spørsmål"), men bare ved selve byttet – ellers kan man ikke lukke den igjen.
  const [lastActiveId, setLastActiveId] = useState(activeMethodId)
  if (activeMethodId !== lastActiveId) {
    setLastActiveId(activeMethodId)
    // Hopper man til en ny kategori, lukkes de andre så menyen holder seg kort.
    if (activeMethod && !openCategories.has(activeMethod.categoryId)) {
      setOpenCategories(new Set([activeMethod.categoryId]))
    }
  }

  const activeCategory = data.categories.find((c) => c.id === activeMethod?.categoryId)

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]">
      {/* Venstre: nedtrekksmenyer */}
      <nav
        aria-label="Utslippsmetoder"
        className="self-start overflow-hidden rounded-xl bg-muted/60 ring-1 ring-border/70"
      >
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          aria-expanded={menuOpen}
          className="flex w-full items-center justify-between bg-gradient-to-r from-primary to-primary-strong px-4 py-3 text-left font-bold text-primary-foreground"
        >
          Utslippsmetoder
          <ChevronDown className={cn('size-5 transition-transform duration-300', menuOpen && 'rotate-180')} />
        </button>

        {menuOpen && (
          <ul className="space-y-1 p-2">
            {data.categories.map((category) => {
              const methods = data.methods.filter((m) => m.categoryId === category.id)
              const answered = methods.filter((m) => answers[m.id] !== undefined).length
              const open = openCategories.has(category.id)
              return (
                <li key={category.id}>
                  <button
                    type="button"
                    onClick={() => toggleCategory(category.id)}
                    aria-expanded={open}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-card"
                  >
                    <span
                      aria-hidden
                      className="grid size-7 shrink-0 place-items-center rounded-lg"
                      style={{ backgroundColor: `color-mix(in oklch, ${category.color}, white 80%)` }}
                    >
                      <span className="size-2.5 rounded-full" style={{ backgroundColor: category.color }} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm leading-tight font-bold">{category.name}</span>
                      <span aria-hidden className="mt-1 block h-1 overflow-hidden rounded-full bg-border/70">
                        <span
                          className="block h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${(answered / Math.max(1, methods.length)) * 100}%`,
                            backgroundColor: category.color,
                          }}
                        />
                      </span>
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {answered}/{methods.length}
                    </span>
                    <ChevronRight
                      className={cn('size-4 text-muted-foreground transition-transform', open && 'rotate-90')}
                    />
                  </button>

                  {open && (
                    <ul className="mt-1 mb-2 space-y-0.5 pl-6">
                      {methods.map((method) => {
                        const isActive = method.id === activeMethodId
                        const isAnswered = answers[method.id] !== undefined
                        return (
                          <li key={method.id} className="relative">
                            {isActive && (
                              <motion.span
                                layoutId="active-method"
                                aria-hidden
                                className="absolute inset-0 rounded-lg bg-card shadow-soft ring-1 ring-border/70"
                                transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                              />
                            )}
                            <button
                              type="button"
                              onClick={() => selectMethod(method.id)}
                              aria-current={isActive ? 'true' : undefined}
                              className={cn(
                                'relative flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                                isActive ? 'font-bold text-primary-ink' : 'text-foreground/80 hover:text-foreground',
                              )}
                            >
                              <span className="flex-1">{method.name}</span>
                              {isAnswered && (
                                <span className="grid size-4.5 place-items-center rounded-full bg-accent/15">
                                  <Check aria-label="Besvart" className="size-3 text-accent" strokeWidth={3} />
                                </span>
                              )}
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </nav>

      {/* Høyre: valg */}
      <div
        ref={questionRef}
        className="relative scroll-mt-4 self-start overflow-clip rounded-xl md:sticky md:top-6 bg-gradient-to-br from-card via-card to-secondary/70 p-5 ring-1 ring-border/70 md:p-7"
      >
        {activeCategory && (
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full opacity-20 blur-3xl transition-colors duration-500"
            style={{ backgroundColor: activeCategory.color }}
          />
        )}
        <AnimatePresence mode="wait" initial={false}>
          {activeMethod ? (
            <motion.fieldset
              key={activeMethod.id}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.16 }}
              className="relative"
            >
              <legend className="mb-2 flex items-center gap-2 text-xs font-bold tracking-wider text-muted-foreground uppercase">
                <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: activeCategory?.color }} />
                {activeCategory?.name} · {PERIOD_LABEL[activeMethod.period]}
              </legend>
              <p
                id="method-question"
                className="mb-6 text-xl leading-snug font-black tracking-tight text-primary-ink sm:text-2xl"
              >
                {activeMethod.question}
              </p>
              <div role="radiogroup" aria-labelledby="method-question" className="grid gap-2.5 sm:grid-cols-2">
                {activeMethod.choices.map((choice, index) => {
                  const selected = answers[activeMethod.id] === index
                  const kg = annualKg(activeMethod, index)
                  return (
                    <button
                      key={`${choice.label}-${index}`}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={(e) => onAnswer(activeMethod.id, index, e)}
                      className={cn(
                        'relative flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3.5 text-left transition-all duration-200',
                        selected
                          ? 'border-transparent text-primary-foreground shadow-lift'
                          : 'border-border hover:-translate-y-0.5 hover:border-accent/60 hover:shadow-soft',
                      )}
                    >
                      {selected && (
                        <motion.span
                          layoutId={`choice-${activeMethod.id}`}
                          aria-hidden
                          className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary to-primary-strong"
                          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                        />
                      )}
                      <span className="relative font-bold">{choice.label}</span>
                      <span
                        className={cn(
                          'relative shrink-0 rounded-full px-2 py-0.5 text-xs tabular-nums',
                          selected ? 'bg-white/15 text-primary-foreground' : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {kg > 0 ? `${formatKg(kg)}/år` : 'ingen utslipp'}
                      </span>
                    </button>
                  )
                })}
              </div>
              {activeMethod.sourceName && (
                <p className="mt-5 flex items-start gap-2 text-xs text-muted-foreground">
                  <span
                    aria-hidden
                    className="mt-1 size-2 shrink-0 rounded-full"
                    style={{ background: colors.get(activeMethod.id) }}
                  />
                  Kilde: {activeMethod.sourceName}
                </p>
              )}
            </motion.fieldset>
          ) : (
            <p className="text-muted-foreground">Velg en utslippsmetode i menyen for å starte.</p>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
