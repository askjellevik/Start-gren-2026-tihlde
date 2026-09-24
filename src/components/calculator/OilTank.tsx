import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import { useEffect } from 'react'
import { formatKg } from '@/lib/calculator/engine'

export interface TankResult {
  totalKg: number
  baselineKg: number
}

interface OilTankProps {
  /** null = ikke regnet ut ennå. Tanken oppdateres kun ved "Regn ut". */
  result: TankResult | null
  averageKg: number
  /** Valgfritt klimamål, vises som egen strek. */
  targetKg?: number | null
}

// Geometri for en glassylinder sett litt ovenfra (SVG-enheter).
const W = 280
const H = 480
const CX = W / 2
const RX = 58 // sylinderens radius
const RY = 15 // hvor flat ellipsen i topp og bunn er
const LEFT = CX - RX
const RIGHT = CX + RX
const TOP = 52
const BOTTOM = 420
const INNER_H = BOTTOM - TOP
/** Tanken rommer 1,5 × snittet. Mer enn det renner over. */
const CAPACITY = 1.5
/** Sekunder oljen bruker på å stige. */
const FILL_DURATION = 1.2

/** Forsiden av et sylinderstykke mellom to høyder (øvre og nedre kant følger ellipsen). */
function band(yTop: number, yBottom: number): string {
  if (yBottom - yTop < 0.5) return ''
  return (
    `M${LEFT},${yTop} A${RX},${RY} 0 0 0 ${RIGHT},${yTop} ` +
    `L${RIGHT},${yBottom} A${RX},${RY} 0 0 1 ${LEFT},${yBottom} Z`
  )
}

/** Bakre og fremre halvdel av en ellipse rundt sylinderen. */
const backHalf = (y: number) => `M${LEFT},${y} A${RX},${RY} 0 0 1 ${RIGHT},${y}`
const frontHalf = (y: number) => `M${LEFT},${y} A${RX},${RY} 0 0 0 ${RIGHT},${y}`

// Søyle formet som en oljetank i glass. Oransje strek er snittet for en
// nordmann, grønn er klimamålet. Oljen er ditt fotavtrykk; over snittet farges
// den rødlig, og mer enn tanken rommer renner over kanten.
export function OilTank({ result, averageKg, targetKg }: OilTankProps) {
  const reduceMotion = useReducedMotion()
  const maxKg = averageKg * CAPACITY
  const levelY = (kg: number) => BOTTOM - Math.min(Math.max(kg, 0) / maxKg, 1) * INNER_H
  const averageY = levelY(averageKg)
  const targetY = targetKg ? levelY(targetKg) : null

  const total = result?.totalKg ?? 0
  const baseline = result?.baselineKg ?? 0
  const overAverage = total > averageKg
  const overflowing = total > maxKg
  const diff = total - averageKg

  // Nivåene animeres som tall, og formene regnes ut fra dem hver frame.
  const oilY = useMotionValue(BOTTOM)
  const sharedY = useMotionValue(BOTTOM)
  useEffect(() => {
    const opts = reduceMotion ? { duration: 0 } : { duration: FILL_DURATION, ease: [0.22, 1, 0.36, 1] as const }
    const a = animate(oilY, result ? levelY(total) : BOTTOM, opts)
    const b = animate(sharedY, result ? levelY(baseline) : BOTTOM, opts)
    return () => {
      a.stop()
      b.stop()
    }
    // levelY avhenger bare av averageKg
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, total, baseline, averageKg, reduceMotion])

  const oilBody = useTransform([oilY, sharedY], ([o, s]: number[]) => band(o, s))
  const sharedBody = useTransform(sharedY, (s) => band(s, BOTTOM))
  const surfaceY = useTransform(oilY, (o) => o)
  const overTint = useTransform(oilY, (o) => (o < averageY ? band(o, averageY) : ''))
  const hasOil = total > 0

  const description = result
    ? `Ditt fotavtrykk er ${formatKg(total)} per år. Snittet er ${formatKg(averageKg)}. ` +
      (overAverage ? `Du ligger ${formatKg(diff)} over snittet.` : `Du ligger ${formatKg(-diff)} under snittet.`) +
      (targetKg ? ` Klimamålet er ${formatKg(targetKg)}.` : '')
    : 'Tanken fylles når du trykker «Regn ut min bærekraftsscore».'

  return (
    <figure className="flex flex-col items-center">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-[27rem] w-auto overflow-visible" role="img" aria-label={description}>
        <defs>
          {/* Lys og skygge rundt sylinderen */}
          <linearGradient id="glass-back" x1="0" x2="1">
            <stop offset="0" stopColor="#e9e3dc" />
            <stop offset="0.5" stopColor="#faf7f4" />
            <stop offset="1" stopColor="#ded7cf" />
          </linearGradient>
          <linearGradient id="oil-body" x1="0" x2="1">
            <stop offset="0" stopColor="#0f0e0c" />
            <stop offset="0.28" stopColor="#4a453d" />
            <stop offset="0.45" stopColor="#2a2723" />
            <stop offset="1" stopColor="#0f0e0c" />
          </linearGradient>
          <linearGradient id="shared-body" x1="0" x2="1">
            <stop offset="0" stopColor="#6f6a60" />
            <stop offset="0.3" stopColor="#a8a296" />
            <stop offset="1" stopColor="#66615a" />
          </linearGradient>
          <radialGradient id="oil-surface" cx="0.4" cy="0.35" r="0.8">
            <stop offset="0" stopColor="#6d665b" />
            <stop offset="1" stopColor="#1d1b18" />
          </radialGradient>
          <linearGradient id="glass-shine" x1="0" x2="1">
            <stop offset="0" stopColor="white" stopOpacity="0" />
            <stop offset="0.12" stopColor="white" stopOpacity="0.55" />
            <stop offset="0.22" stopColor="white" stopOpacity="0.05" />
            <stop offset="0.8" stopColor="white" stopOpacity="0" />
            <stop offset="0.92" stopColor="white" stopOpacity="0.25" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="metal" x1="0" x2="1">
            <stop offset="0" stopColor="#1f3a1f" />
            <stop offset="0.3" stopColor="#4d7a47" />
            <stop offset="0.55" stopColor="#2a4e2a" />
            <stop offset="1" stopColor="#173017" />
          </linearGradient>
          <radialGradient id="floor-shadow">
            <stop offset="0.4" stopColor="rgb(42 78 42)" stopOpacity="0.28" />
            <stop offset="1" stopColor="rgb(42 78 42)" stopOpacity="0" />
          </radialGradient>
          <clipPath id="tank-inside">
            <path d={`${band(TOP, BOTTOM)} M${LEFT},${TOP} A${RX},${RY} 0 0 1 ${RIGHT},${TOP} Z`} />
          </clipPath>
        </defs>

        {/* Skygge på gulvet */}
        <ellipse cx={CX} cy={BOTTOM + 30} rx={RX * 1.6} ry={RY * 1.6} fill="url(#floor-shadow)" />

        {/* Baksiden av glasset */}
        <path d={band(TOP, BOTTOM)} fill="url(#glass-back)" />
        <ellipse cx={CX} cy={TOP} rx={RX} ry={RY} fill="#e2dbd3" />

        {/* Bakre halvdel av strekene synes gjennom glasset */}
        <path d={backHalf(averageY)} fill="none" stroke="var(--average-line)" strokeWidth={2} strokeDasharray="5 5" opacity={0.5} />
        {targetY !== null && (
          <path d={backHalf(targetY)} fill="none" stroke="var(--accent)" strokeWidth={2} strokeDasharray="3 5" opacity={0.5} />
        )}

        {/* Væsken */}
        <g clipPath="url(#tank-inside)">
          <motion.path d={oilBody} fill="url(#oil-body)" />
          <motion.path d={sharedBody} fill="url(#shared-body)" />
          <motion.path d={overTint} fill="var(--danger)" opacity={0.3} />
          {hasOil && (
            <motion.ellipse
              cx={CX}
              cy={surfaceY}
              rx={RX}
              fill="url(#oil-surface)"
              initial={{ ry: RY }}
              animate={reduceMotion ? { ry: RY } : { ry: [RY, RY - 3, RY] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
          {/* Bobler som stiger gjennom oljen */}
          {hasOil && !reduceMotion &&
            [
              { x: -26, r: 3, d: 0 },
              { x: 12, r: 2, d: 0.9 },
              { x: 30, r: 2.5, d: 1.7 },
              { x: -6, r: 1.8, d: 2.4 },
            ].map((b) => (
              <motion.circle
                key={b.x}
                cx={CX + b.x}
                r={b.r}
                fill="white"
                initial={{ cy: BOTTOM, opacity: 0 }}
                animate={{ cy: [BOTTOM - 10, levelY(total) + 12], opacity: [0, 0.35, 0] }}
                transition={{ delay: FILL_DURATION + b.d, duration: 2.8, repeat: Infinity, ease: 'easeIn' }}
              />
            ))}
        </g>

        {/* Fremre halvdel av strekene, med etiketter */}
        <path d={frontHalf(averageY)} fill="none" stroke="var(--average-line)" strokeWidth={3} strokeDasharray="8 5" />
        <text x={RIGHT + 16} y={averageY + RY - 4} fontSize={13} fontWeight={800} fill="var(--average-line)">
          Snitt
        </text>
        <text x={RIGHT + 16} y={averageY + RY + 11} fontSize={11} fill="var(--average-line)">
          {formatKg(averageKg)}
        </text>
        {targetY !== null && targetKg && (
          <g>
            <path d={frontHalf(targetY)} fill="none" stroke="var(--accent)" strokeWidth={3} strokeDasharray="3 4" />
            <text x={LEFT - 16} y={targetY + RY - 4} fontSize={13} fontWeight={800} fill="var(--accent)" textAnchor="end">
              Mål
            </text>
            <text x={LEFT - 16} y={targetY + RY + 11} fontSize={11} fill="var(--accent)" textAnchor="end">
              {formatKg(targetKg)}
            </text>
          </g>
        )}

        {/* Glassets refleksjoner og kant */}
        <path d={band(TOP, BOTTOM)} fill="url(#glass-shine)" pointerEvents="none" />
        <path
          d={`M${LEFT},${TOP} L${LEFT},${BOTTOM} A${RX},${RY} 0 0 0 ${RIGHT},${BOTTOM} L${RIGHT},${TOP}`}
          fill="none"
          stroke="rgb(42 78 42 / 0.35)"
          strokeWidth={2}
        />
        <ellipse cx={CX} cy={TOP} rx={RX} ry={RY} fill="none" stroke="rgb(42 78 42 / 0.5)" strokeWidth={2} />

        {/* Metallring øverst og sokkel nederst */}
        <path d={band(TOP - 4, TOP + 8)} fill="url(#metal)" />
        <ellipse cx={CX} cy={TOP - 4} rx={RX} ry={RY} fill="none" stroke="#6f9a66" strokeWidth={1.5} opacity={0.7} />
        <path
          d={`M${LEFT - 8},${BOTTOM - 6} A${RX + 8},${RY + 2} 0 0 0 ${RIGHT + 8},${BOTTOM - 6} L${RIGHT + 8},${BOTTOM + 14} A${RX + 8},${RY + 2} 0 0 1 ${LEFT - 8},${BOTTOM + 14} Z`}
          fill="url(#metal)"
        />

        {/* Oljen renner over kanten og nedover utsiden */}
        {result && overflowing && (
          <g>
            <motion.ellipse
              cx={CX}
              cy={TOP - 6}
              rx={RX + 4}
              fill="#1d1b18"
              initial={{ ry: 0 }}
              animate={{ ry: RY + 4 }}
              transition={{ delay: reduceMotion ? 0 : FILL_DURATION - 0.2, duration: 0.4 }}
            />
            {[
              `M${LEFT - 2},${TOP} Q ${LEFT - 12} ${TOP + 12} ${LEFT - 6} ${TOP + 50} V ${BOTTOM - 140}`,
              `M${RIGHT + 2},${TOP} Q ${RIGHT + 12} ${TOP + 12} ${RIGHT + 6} ${TOP + 50} V ${BOTTOM - 200}`,
              `M${CX + 20},${TOP + RY} Q ${CX + 24} ${TOP + 40} ${CX + 22} ${TOP + 90}`,
            ].map((d, i) => (
              <motion.path
                key={d}
                d={d}
                fill="none"
                stroke="#1d1b18"
                strokeWidth={i === 2 ? 5 : 7}
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: reduceMotion ? 0 : FILL_DURATION + i * 0.25, duration: reduceMotion ? 0 : 1.4, ease: 'easeIn' }}
              />
            ))}
            {!reduceMotion &&
              [LEFT - 6, RIGHT + 6].map((x, i) => (
                <motion.circle
                  key={x}
                  cx={x}
                  r={5}
                  fill="#1d1b18"
                  initial={{ cy: BOTTOM - 150, opacity: 0 }}
                  animate={{ cy: [BOTTOM - 150 + i * -60, BOTTOM + 20], opacity: [1, 1, 0] }}
                  transition={{ delay: FILL_DURATION + 1.4 + i * 0.4, duration: 1, ease: 'easeIn', repeat: Infinity, repeatDelay: 0.8 }}
                />
              ))}
          </g>
        )}
      </svg>

      <figcaption className="mt-2 max-w-xs text-center text-sm" aria-live="polite">
        {result ? (
          <>
            <span className="block text-3xl font-black tracking-tight text-primary">{formatKg(total)}</span>
            <span className={overAverage ? 'font-bold text-danger' : 'font-bold text-accent'}>
              {overAverage ? `${formatKg(diff)} over snittet` : `${formatKg(-diff)} under snittet`}
            </span>
            {overflowing && <span className="block text-danger">Tanken renner over!</span>}
            <span className="mt-2 flex items-center justify-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span aria-hidden className="size-2.5 rounded-sm bg-oil-shared" /> Faste tjenester
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
