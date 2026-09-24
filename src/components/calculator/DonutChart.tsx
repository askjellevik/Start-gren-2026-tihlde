import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { forwardRef } from 'react'
import { formatKg, type Footprint } from '@/lib/calculator/engine'

interface DonutChartProps {
  footprint: Footprint
  colors: Map<string, string>
  /** Metoden som sist fikk et svar – pulserer i diagrammet. */
  highlightId: string | null
}

const SIZE = 220
const RADIUS = 80
const STROKE = 34
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

// Sektordiagram over dine utslippsmetoder. Oppdateres live; nye sektorer
// "spretter" inn. Felles utslipp er ikke med her – de vises i tanken.
export const DonutChart = forwardRef<HTMLDivElement, DonutChartProps>(function DonutChart(
  { footprint, colors, highlightId },
  ref,
) {
  const reduceMotion = useReducedMotion()
  const { methods, personalKg } = footprint

  // Hver sektor starter der den forrige sluttet.
  const segments = methods.map(({ method, kgPerYear }, i) => {
    const lengthOf = (kg: number) => (personalKg > 0 ? (kg / personalKg) * CIRCUMFERENCE : 0)
    const offset = methods.slice(0, i).reduce((sum, m) => sum + lengthOf(m.kgPerYear), 0)
    return { method, kgPerYear, length: lengthOf(kgPerYear), offset }
  })

  const spring = reduceMotion ? { duration: 0 } : { type: 'spring' as const, stiffness: 120, damping: 18 }

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
      <div ref={ref} className="relative shrink-0">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          width={SIZE}
          height={SIZE}
          role="img"
          aria-label={
            methods.length
              ? `Sektordiagram: ${methods.map((m) => `${m.method.name} ${formatKg(m.kgPerYear)}`).join(', ')}`
              : 'Sektordiagram uten data ennå'
          }
        >
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="var(--muted)"
            strokeWidth={STROKE}
          />
          <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
            <AnimatePresence initial={false}>
              {segments.map(({ method, length, offset }) => (
                <motion.circle
                  key={method.id}
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={RADIUS}
                  fill="none"
                  style={{ stroke: colors.get(method.id), transformOrigin: 'center' }}
                  strokeWidth={STROKE}
                  initial={{ strokeDasharray: `0 ${CIRCUMFERENCE}`, strokeDashoffset: -offset, scale: 1.12 }}
                  animate={{
                    strokeDasharray: `${length} ${CIRCUMFERENCE - length}`,
                    strokeDashoffset: -offset,
                    scale: highlightId === method.id && !reduceMotion ? [1.12, 1] : 1,
                  }}
                  exit={{ strokeDasharray: `0 ${CIRCUMFERENCE}`, opacity: 0 }}
                  transition={spring}
                />
              ))}
            </AnimatePresence>
          </g>
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xs text-muted-foreground">Dine valg</span>
          <motion.span
            key={Math.round(personalKg / 10)}
            initial={reduceMotion ? false : { scale: 1.15 }}
            animate={{ scale: 1 }}
            className="text-2xl font-black text-primary"
          >
            {formatKg(personalKg)}
          </motion.span>
          <span className="text-xs text-muted-foreground">per år</span>
        </div>
      </div>

      <ul className="w-full min-w-0 space-y-1.5 text-sm" aria-label="Forklaring">
        <AnimatePresence initial={false}>
          {segments.map(({ method, kgPerYear }) => (
            <motion.li
              layout={!reduceMotion}
              key={method.id}
              initial={reduceMotion ? false : { opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <span
                aria-hidden
                className="size-3 shrink-0 rounded-sm"
                style={{ background: colors.get(method.id) }}
              />
              <span className="min-w-0 flex-1 truncate">{method.name}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {formatKg(kgPerYear)}
              </span>
              <span className="w-10 shrink-0 text-right font-bold tabular-nums">
                {Math.round((kgPerYear / personalKg) * 100)}%
              </span>
            </motion.li>
          ))}
        </AnimatePresence>
        {segments.length === 0 && (
          <li className="text-muted-foreground">
            Svar på spørsmålene, så dukker utslippene dine opp her.
          </li>
        )}
      </ul>
    </div>
  )
})
