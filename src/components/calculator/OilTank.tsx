import { motion, useReducedMotion } from 'motion/react'
import { formatKg } from '@/lib/calculator/engine'

export interface TankResult {
  totalKg: number
  baselineKg: number
}

interface OilTankProps {
  /** null = ikke regnet ut ennå. Tanken oppdateres kun ved "Regn ut". */
  result: TankResult | null
  averageKg: number
}

// Geometri (SVG-enheter)
const W = 200
const H = 440
const TUBE_X = 50
const TUBE_W = 100
const TOP = 30
const BOTTOM = 420
const INNER_H = BOTTOM - TOP
/** Tanken rommer 1,5 × snittet. Mer enn det renner over. */
const CAPACITY = 1.5

/** Sekunder oljen bruker på å stige. Brukes også til å time score-popupen. */
export const FILL_DURATION = 1.8

// Søyle formet som et oljerør. Streken er snittet for en nordmann; oljen er
// ditt fotavtrykk. Mer enn snittet → over streken, mer enn tanken → renner over.
export function OilTank({ result, averageKg }: OilTankProps) {
  const reduceMotion = useReducedMotion()
  const maxKg = averageKg * CAPACITY
  const levelY = (kg: number) => BOTTOM - Math.min(kg / maxKg, 1) * INNER_H
  const averageY = levelY(averageKg)

  const total = result?.totalKg ?? 0
  const baseline = result?.baselineKg ?? 0
  const oilY = levelY(total)
  const sharedY = levelY(baseline)
  const overAverage = total > averageKg
  const overflowing = total > maxKg
  const diff = total - averageKg

  const fill = reduceMotion
    ? { duration: 0 }
    : { duration: FILL_DURATION, ease: [0.22, 1, 0.36, 1] as const }

  // Bølge: to perioder bredere enn røret, flyttes sidelengs i loop.
  const wave = `M0 8 Q 25 0 50 8 T 100 8 T 150 8 T 200 8 T 250 8 V ${INNER_H + 20} H 0 Z`

  const description = result
    ? `Ditt fotavtrykk er ${formatKg(total)} per år. Snittet er ${formatKg(averageKg)}. ` +
      (overAverage
        ? `Du ligger ${formatKg(diff)} over snittet.`
        : `Du ligger ${formatKg(-diff)} under snittet.`)
    : 'Tanken fylles når du trykker «Regn ut min bærekraftsscore».'

  return (
    <figure className="flex flex-col items-center">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-[26rem] w-auto" role="img" aria-label={description}>
        <defs>
          <clipPath id="tube-inner">
            <rect x={TUBE_X} y={TOP} width={TUBE_W} height={INNER_H} rx={TUBE_W / 2} />
            <rect x={TUBE_X} y={TOP} width={TUBE_W} height={INNER_H / 2} />
          </clipPath>
          <linearGradient id="oil" x1="0" x2="1">
            <stop offset="0" stopColor="var(--oil)" />
            <stop offset="0.35" stopColor="var(--oil-shine)" />
            <stop offset="1" stopColor="var(--oil)" />
          </linearGradient>
          <linearGradient id="glass" x1="0" x2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="0.2" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="0.8" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0.25" />
          </linearGradient>
        </defs>

        {/* Rørets bakside */}
        <rect x={TUBE_X} y={TOP} width={TUBE_W} height={INNER_H} rx={TUBE_W / 2} fill="var(--muted)" />
        <rect x={TUBE_X} y={TOP} width={TUBE_W} height={INNER_H / 2} fill="var(--muted)" />

        <g clipPath="url(#tube-inner)">
          {/* Dine utslipp med bølgende overflate */}
          <motion.g
            initial={{ y: BOTTOM + 10 }}
            animate={{ y: result ? oilY - 8 : BOTTOM + 10 }}
            transition={fill}
          >
            <motion.path
              d={wave}
              fill="url(#oil)"
              initial={{ x: TUBE_X - 100 }}
              animate={reduceMotion ? { x: TUBE_X - 100 } : { x: [TUBE_X - 100, TUBE_X] }}
              transition={{ duration: 2.4, ease: 'linear', repeat: Infinity }}
            />
          </motion.g>
          {/* Felles utslipp i bunnen */}
          <motion.rect
            x={TUBE_X}
            width={TUBE_W}
            fill="var(--oil-shared)"
            initial={false}
            animate={{ y: result ? sharedY : BOTTOM, height: result ? BOTTOM - sharedY : 0 }}
            transition={fill}
          />
          {/* Delen over snittet farges rødlig */}
          {result && overAverage && (
            <motion.rect
              x={TUBE_X}
              y={oilY}
              width={TUBE_W}
              height={averageY - oilY}
              fill="var(--danger)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.35 }}
              transition={{ delay: reduceMotion ? 0 : FILL_DURATION, duration: 0.6 }}
            />
          )}
        </g>

        {/* Glass og kant */}
        <rect x={TUBE_X} y={TOP} width={TUBE_W} height={INNER_H} rx={TUBE_W / 2} fill="url(#glass)" />
        <path
          d={`M${TUBE_X} ${TOP} V ${BOTTOM - TUBE_W / 2} A ${TUBE_W / 2} ${TUBE_W / 2} 0 0 0 ${TUBE_X + TUBE_W} ${BOTTOM - TUBE_W / 2} V ${TOP}`}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={5}
          strokeLinecap="round"
        />
        <line x1={TUBE_X - 8} x2={TUBE_X + TUBE_W + 8} y1={TOP} y2={TOP} stroke="var(--primary)" strokeWidth={5} strokeLinecap="round" />

        {/* Snittstreken */}
        <line
          x1={TUBE_X - 14}
          x2={TUBE_X + TUBE_W + 14}
          y1={averageY}
          y2={averageY}
          stroke="var(--average-line)"
          strokeWidth={3}
          strokeDasharray="8 5"
        />
        <text x={TUBE_X + TUBE_W + 16} y={averageY - 4} fontSize={12} fontWeight={700} fill="var(--average-line)">
          Snitt
        </text>
        <text x={TUBE_X + TUBE_W + 16} y={averageY + 11} fontSize={11} fill="var(--average-line)">
          {formatKg(averageKg)}
        </text>

        {/* Oljen renner over kanten og nedover utsiden av røret */}
        {result && overflowing && (
          <g>
            <motion.ellipse
              cx={W / 2}
              cy={TOP}
              rx={TUBE_W / 2 + 6}
              fill="var(--oil)"
              initial={{ ry: 0 }}
              animate={{ ry: 9 }}
              transition={{ delay: reduceMotion ? 0 : FILL_DURATION - 0.2, duration: 0.4 }}
            />
            {[
              `M${TUBE_X - 2} ${TOP} Q ${TUBE_X - 12} ${TOP + 10} ${TUBE_X - 8} ${TOP + 40} V ${BOTTOM - 120}`,
              `M${TUBE_X + TUBE_W + 2} ${TOP} Q ${TUBE_X + TUBE_W + 12} ${TOP + 10} ${TUBE_X + TUBE_W + 8} ${TOP + 40} V ${BOTTOM - 180}`,
            ].map((d, i) => (
              <motion.path
                key={d}
                d={d}
                fill="none"
                stroke="var(--oil)"
                strokeWidth={6}
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: reduceMotion ? 0 : FILL_DURATION + i * 0.3, duration: reduceMotion ? 0 : 1.6, ease: 'easeIn' }}
              />
            ))}
            {!reduceMotion &&
              [TUBE_X - 8, TUBE_X + TUBE_W + 8].map((x, i) => (
                <motion.circle
                  key={x}
                  cx={x}
                  r={5}
                  fill="var(--oil)"
                  initial={{ cy: BOTTOM - 150, opacity: 0 }}
                  animate={{ cy: [BOTTOM - 150 + i * -60, BOTTOM + 10], opacity: [1, 1, 0] }}
                  transition={{ delay: FILL_DURATION + 1.6 + i * 0.4, duration: 1, ease: 'easeIn', repeat: Infinity, repeatDelay: 0.8 }}
                />
              ))}
          </g>
        )}
      </svg>

      <figcaption className="mt-3 max-w-xs text-center text-sm" aria-live="polite">
        {result ? (
          <>
            <span className="block text-2xl font-black text-primary">{formatKg(total)}</span>
            <span className={overAverage ? 'font-bold text-danger' : 'font-bold text-accent'}>
              {overAverage ? `${formatKg(diff)} over snittet` : `${formatKg(-diff)} under snittet`}
            </span>
            {overflowing && <span className="block text-danger">Tanken renner over!</span>}
            <span className="mt-2 flex items-center justify-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span aria-hidden className="size-2.5 rounded-sm bg-oil-shared" /> Felles
              </span>
              <span className="flex items-center gap-1">
                <span aria-hidden className="size-2.5 rounded-sm bg-oil" /> Dine valg
              </span>
            </span>
          </>
        ) : (
          <span className="text-muted-foreground">{description}</span>
        )}
      </figcaption>
    </figure>
  )
}
