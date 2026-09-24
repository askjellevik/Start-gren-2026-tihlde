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

// --- Oljesøl ------------------------------------------------------------------

/** Y-koordinaten til fremre del av toppkanten ved en gitt x. */
const rimFrontY = (x: number) => TOP + RY * Math.sqrt(Math.max(0, 1 - ((x - CX) / RX) ** 2))
const clampX = (x: number) => Math.min(Math.max(x, LEFT), RIGHT)

const SPILL_L = LEFT - 4
const SPILL_R = RIGHT + 4

/** Fingre av olje som renner ned: posisjon over bredden (0–1) og lengde i px. */
const DRIPS = [
  { at: 1.0, len: 285 },
  { at: 0.86, len: 205 },
  { at: 0.71, len: 120 },
  { at: 0.57, len: 170 },
  { at: 0.43, len: 88 },
  { at: 0.28, len: 190 },
  { at: 0.14, len: 110 },
  { at: 0.0, len: 245 },
].map((d) => {
  const x = SPILL_L + 4 + (SPILL_R - SPILL_L - 8) * d.at
  return { x, tipY: rimFrontY(clampX(x)) + d.len }
})

const fmt = (n: number) => n.toFixed(1)

/** Glatt kurve gjennom punktene (Catmull-Rom → Bézier). */
function smoothThrough(points: [number, number][]): string {
  let d = ''
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += ` C${fmt(c1[0])},${fmt(c1[1])} ${fmt(c2[0])},${fmt(c2[1])} ${fmt(p2[0])},${fmt(p2[1])}`
  }
  return d
}

/** Oljefilmen på forsiden av glasset: følger kanten øverst, fingre nederst. */
const SPILL_SHEET = (() => {
  const top: string[] = []
  for (let i = 0; i <= 28; i++) {
    const x = SPILL_L + ((SPILL_R - SPILL_L) * i) / 28
    top.push(`${fmt(x)},${fmt(rimFrontY(clampX(x)) - 6)}`)
  }
  // Nederkant fra høyre mot venstre: smal hals, rund tupp, grunt dalsøkk mellom.
  const bottom: [number, number][] = [[SPILL_R, rimFrontY(RIGHT) + 30]]
  DRIPS.forEach((d, i) => {
    bottom.push([d.x + 6, d.tipY - 16], [d.x, d.tipY], [d.x - 6, d.tipY - 16])
    const next = DRIPS[i + 1]
    if (next) {
      const mid = (d.x + next.x) / 2
      bottom.push([mid, rimFrontY(clampX(mid)) + 38])
    }
  })
  bottom.push([SPILL_L, rimFrontY(LEFT) + 30])
  return `M${top.join('L')} L${fmt(bottom[0][0])},${fmt(bottom[0][1])}${smoothThrough(bottom)} Z`
})()

const SPILL_DEPTH = Math.max(...DRIPS.map((d) => d.tipY)) - TOP + 30
const LONGEST_DRIPS = [...DRIPS].sort((a, b) => b.tipY - a.tipY).slice(0, 3)
/** Dråpe med spissen opp, sentrert i (0, 0). */
const DROP = 'M0,-9 C2.5,-4 6,0 6,4 A6,6 0 1 1 -6,4 C-6,0 -2.5,-4 0,-9 Z'

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
            <stop offset="0" stopColor="#3f5220" />
            <stop offset="0.3" stopColor="#9ab563" />
            <stop offset="0.55" stopColor="#728f3f" />
            <stop offset="1" stopColor="#34451b" />
          </linearGradient>
          <radialGradient id="floor-shadow">
            <stop offset="0.4" stopColor="rgb(42 78 42)" stopOpacity="0.28" />
            <stop offset="1" stopColor="rgb(42 78 42)" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="spill-body" x1="0" x2="1">
            <stop offset="0" stopColor="#0d0c0a" />
            <stop offset="0.22" stopColor="#3f3a33" />
            <stop offset="0.4" stopColor="#1c1a17" />
            <stop offset="0.85" stopColor="#141210" />
            <stop offset="1" stopColor="#2e2a25" />
          </linearGradient>
          <linearGradient id="spill-shine" x1="0" x2="1">
            <stop offset="0.14" stopColor="white" stopOpacity="0" />
            <stop offset="0.2" stopColor="white" stopOpacity="0.28" />
            <stop offset="0.26" stopColor="white" stopOpacity="0" />
            <stop offset="0.86" stopColor="white" stopOpacity="0" />
            <stop offset="0.9" stopColor="white" stopOpacity="0.12" />
            <stop offset="0.94" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="puddle" cx="0.45" cy="0.4" r="0.6">
            <stop offset="0" stopColor="#3a352f" />
            <stop offset="0.6" stopColor="#171513" />
            <stop offset="0.88" stopColor="#0d0c0a" stopOpacity="0.9" />
            <stop offset="1" stopColor="#0d0c0a" stopOpacity="0" />
          </radialGradient>
          <clipPath id="spill-shape">
            <path d={SPILL_SHEET} />
            {DRIPS.map((d) => (
              <circle key={d.x} cx={d.x} cy={d.tipY - 4} r={7} />
            ))}
          </clipPath>
          <clipPath id="spill-reveal">
            <motion.rect
              x={0}
              y={TOP - 40}
              width={W}
              initial={{ height: 0 }}
              animate={{ height: result && overflowing ? SPILL_DEPTH + 40 : 0 }}
              transition={{
                delay: reduceMotion ? 0 : FILL_DURATION - 0.1,
                duration: reduceMotion ? 0 : 2.2,
                ease: [0.25, 0.7, 0.35, 1],
              }}
            />
          </clipPath>
          <clipPath id="tank-inside">
            <path d={`${band(TOP, BOTTOM)} M${LEFT},${TOP} A${RX},${RY} 0 0 1 ${RIGHT},${TOP} Z`} />
          </clipPath>
        </defs>

        {/* Skygge på gulvet */}
        <ellipse cx={CX} cy={BOTTOM + 30} rx={RX * 1.6} ry={RY * 1.6} fill="url(#floor-shadow)" />
        {result && overflowing && (
          <g>
            <motion.ellipse
              cx={CX + 6}
              cy={BOTTOM + 26}
              fill="url(#puddle)"
              initial={{ rx: RX * 0.9, ry: 4 }}
              animate={{ rx: RX * 1.85, ry: 14 }}
              transition={{ delay: reduceMotion ? 0 : FILL_DURATION + 1.3, duration: reduceMotion ? 0 : 3, ease: 'easeOut' }}
            />
            <motion.ellipse
              cx={CX - 30}
              cy={BOTTOM + 22}
              fill="white"
              opacity={0.12}
              initial={{ rx: 0, ry: 0 }}
              animate={{ rx: 34, ry: 3 }}
              transition={{ delay: reduceMotion ? 0 : FILL_DURATION + 2, duration: reduceMotion ? 0 : 2 }}
            />
          </g>
        )}

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
        <ellipse cx={CX} cy={TOP - 4} rx={RX} ry={RY} fill="none" stroke="#b5cc86" strokeWidth={1.5} opacity={0.7} />
        <path
          d={`M${LEFT - 8},${BOTTOM - 6} A${RX + 8},${RY + 2} 0 0 0 ${RIGHT + 8},${BOTTOM - 6} L${RIGHT + 8},${BOTTOM + 14} A${RX + 8},${RY + 2} 0 0 1 ${LEFT - 8},${BOTTOM + 14} Z`}
          fill="url(#metal)"
        />

        {/* Oljen renner over kanten: menisk på toppen, film med dråpefingre
            nedover glasset og dråper som faller i en pytt. */}
        {result && overflowing && (
          <g>
            <g clipPath="url(#spill-reveal)">
              <g clipPath="url(#spill-shape)">
                <rect
                  x={SPILL_L - 10}
                  y={TOP - 20}
                  width={SPILL_R - SPILL_L + 20}
                  height={SPILL_DEPTH + 30}
                  fill="url(#spill-body)"
                />
                <rect
                  x={SPILL_L - 10}
                  y={TOP - 20}
                  width={SPILL_R - SPILL_L + 20}
                  height={SPILL_DEPTH + 30}
                  fill="url(#spill-shine)"
                />
              </g>
            </g>
            <motion.ellipse
              cx={CX}
              cy={TOP - 5}
              rx={RX + 6}
              fill="url(#oil-surface)"
              initial={{ ry: 0 }}
              animate={{ ry: RY + 7 }}
              transition={{ delay: reduceMotion ? 0 : FILL_DURATION - 0.25, duration: 0.45, ease: 'easeOut' }}
            />
            <motion.ellipse
              cx={CX - 20}
              cy={TOP - 11}
              fill="white"
              opacity={0.22}
              initial={{ rx: 0, ry: 0 }}
              animate={{ rx: 20, ry: 4 }}
              transition={{ delay: reduceMotion ? 0 : FILL_DURATION + 0.1, duration: 0.4 }}
            />
            {!reduceMotion &&
              LONGEST_DRIPS.map((d, i) => (
                <motion.path
                  key={d.x}
                  d={DROP}
                  fill="#161412"
                  initial={{ x: d.x, y: d.tipY, opacity: 0, scaleY: 0.6 }}
                  animate={{ y: [d.tipY + 2, BOTTOM + 22], opacity: [0, 1, 1, 0], scaleY: [0.6, 1.35, 1] }}
                  transition={{
                    delay: FILL_DURATION + 2.2 + i * 0.7,
                    duration: 0.9,
                    ease: 'easeIn',
                    repeat: Infinity,
                    repeatDelay: 1.6 + i * 0.5,
                  }}
                />
              ))}
          </g>
        )}
      </svg>

      <figcaption className="mt-2 max-w-xs text-center text-sm" aria-live="polite">
        {result ? (
          <>
            <span className="block text-3xl font-black tracking-tight text-primary-ink">{formatKg(total)}</span>
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
