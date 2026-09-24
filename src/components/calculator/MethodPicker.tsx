import { Check, ChevronDown, ChevronRight } from 'lucide-react'
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
    if (activeMethod && !openCategories.has(activeMethod.categoryId)) {
      setOpenCategories((prev) => new Set(prev).add(activeMethod.categoryId))
    }
  }

  const activeCategory = data.categories.find((c) => c.id === activeMethod?.categoryId)

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
      {/* Venstre: nedtrekksmenyer */}
      <nav aria-label="Utslippsmetoder" className="self-start rounded-lg border bg-card">
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          aria-expanded={menuOpen}
          className={cn(
            'flex w-full items-center justify-between rounded-t-lg bg-primary px-4 py-3 text-left font-bold text-primary-foreground',
            !menuOpen && 'rounded-b-lg',
          )}
        >
          Utslippsmetoder
          <ChevronDown className={cn('size-5 transition-transform', menuOpen && 'rotate-180')} />
        </button>

        {menuOpen && (
          <ul className="divide-y">
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
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted"
                  >
                    <span
                      aria-hidden
                      className="size-3 shrink-0 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="flex-1 font-bold">{category.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {answered}/{methods.length}
                    </span>
                    <ChevronRight className={cn('size-4 transition-transform', open && 'rotate-90')} />
                  </button>

                  {open && (
                    <ul className="pb-2">
                      {methods.map((method) => {
                        const isActive = method.id === activeMethodId
                        const isAnswered = answers[method.id] !== undefined
                        return (
                          <li key={method.id}>
                            <button
                              type="button"
                              onClick={() => selectMethod(method.id)}
                              aria-current={isActive ? 'true' : undefined}
                              className={cn(
                                'flex w-full items-center gap-2 py-2 pr-4 pl-10 text-left text-sm hover:bg-muted',
                                isActive && 'bg-secondary font-bold text-secondary-foreground',
                              )}
                            >
                              <span className="flex-1">{method.name}</span>
                              {isAnswered && (
                                <Check aria-label="Besvart" className="size-4 text-accent" />
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
      <div ref={questionRef} className="scroll-mt-4 rounded-lg border bg-card p-5 md:p-6">
        {activeMethod ? (
          <fieldset>
            <legend className="mb-1 text-sm font-bold tracking-wide text-muted-foreground uppercase">
              {activeCategory?.name} · {PERIOD_LABEL[activeMethod.period]}
            </legend>
            <p id="method-question" className="mb-5 text-xl font-bold text-primary">
              {activeMethod.question}
            </p>
            <div role="radiogroup" aria-labelledby="method-question" className="grid gap-2 sm:grid-cols-2">
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
                      'flex items-center justify-between gap-3 rounded-lg border-2 px-4 py-3 text-left transition-colors',
                      selected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border hover:border-accent hover:bg-muted',
                    )}
                  >
                    <span className="font-bold">{choice.label}</span>
                    <span
                      className={cn(
                        'shrink-0 text-xs',
                        selected ? 'text-primary-foreground/80' : 'text-muted-foreground',
                      )}
                    >
                      {kg > 0 ? `${formatKg(kg)}/år` : 'ingen utslipp'}
                    </span>
                  </button>
                )
              })}
            </div>
            {activeMethod.sourceName && (
              <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <span
                  aria-hidden
                  className="size-2.5 rounded-full"
                  style={{ background: colors.get(activeMethod.id) }}
                />
                Kilde: {activeMethod.sourceName}
              </p>
            )}
          </fieldset>
        ) : (
          <p className="text-muted-foreground">Velg en utslippsmetode i menyen for å starte.</p>
        )}
      </div>
    </div>
  )
}
