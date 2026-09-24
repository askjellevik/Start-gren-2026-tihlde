import { motion, useReducedMotion, useSpring, useTransform, type MotionValue } from 'motion/react'
import { useEffect, useState, type Ref } from 'react'
import { AnimatedNumber } from '@/components/ui/animated-number'
import { formatKg, type Footprint } from '@/lib/calculator/engine'
import { cn } from '@/lib/utils'

interface DonutChartProps {
  footprint: Footprint
  colors: Map<string, string>
  /** Metoden som sist fikk et svar – løftes kort i diagrammet. */
  highlightId: string | null
  /** Målet for «flyvende» merkelapper. */
  ref?: Ref<HTMLDivElement>
}

// Geometri for en skråstilt, ekstrudert ring (SVG-enheter).
const W = 340
const H = 230
const CX = W / 2
const CY = 100
const RX = 150 // ytre radius, horisontalt
const TILT = 0.55 // hvor flat ellipsen er (1 = rett ovenfra)
const RY = RX * TILT
const RX_IN = 78
const RY_IN = RX_IN * TILT
const DEPTH = 26 // tykkelsen på ringen
const START = -Math.PI / 2 // bakerst på midten
const FULL = Math.PI * 2
const STEPS_PER_RAD = 18

function pointsOnEllipse(rx: number, ry: number, from: number, to: number, dy = 0): string[] {
  const steps = Math.max(2, Math.ceil(Math.abs(to - from) * STEPS_PER_RAD))
  const pts: string[] = []
  for (let i = 0; i <= steps; i++) {
    const a = from + ((to - from) * i) / steps
    pts.push(`${(CX + rx * Math.cos(a)).toFixed(2)},${(CY + ry * Math.sin(a) + dy).toFixed(2)}`)
  }
  return pts
}

function topFace(a0: number, a1: number): string {
  if (a1 - a0 < 0.0005) return ''
  const outer = pointsOnEllipse(RX, RY, a0, a1)
  const inner = pointsOnEllipse(RX_IN, RY_IN, a1, a0)
  return `M${outer.join('L')}L${inner.join('L')}Z`
}

/** Vegg langs en ellipse mellom to vinkler (øverste kant → nederste kant). */
function wall(rx: number, ry: number, a0: number, a1: number): string {
  if (a1 - a0 < 0.0005) return ''
  const top = pointsOnEllipse(rx, ry, a0, a1)
  const bottom = pointsOnEllipse(rx, ry, a1, a0, DEPTH)
  return `M${top.join('L')}L${bottom.join('L')}Z`
}

function clip(a0: number, a1: number, from: number, to: number): [number, number] | null {
  const s = Math.max(a0, from)
  const e = Math.min(a1, to)
  return e > s ? [s, e] : null
}

/** Ytre vegg synes foran (vinkel 0–π), indre vegg synes bak, gjennom hullet. */
function outerWall(a0: number, a1: number): string {
  const front = clip(a0, a1, 0, Math.PI)
  return front ? wall(RX, RY, front[0], front[1]) : ''
}

function innerWall(a0: number, a1: number): string {
  return [clip(a0, a1, START, 0), clip(a0, a1, Math.PI, START + FULL)]
    .map((part) => (part ? wall(RX_IN, RY_IN, part[0], part[1]) : ''))
    .join('')
}

interface Segment {
  id: string
  name: string
  color: string
  kg: number
  a0: number
  a1: number
}

// Én bit av ringen. Start- og sluttvinkel animeres med fjær, så biter vokser
// inn og flytter seg mykt når andre biter endres.
function Slice({
  segment,
  lifted,
  onHover,
}: {
  segment: Segment
  lifted: boolean
  onHover: (id: string | null) => void
}) {
  const reduceMotion = useReducedMotion()
  const spring = reduceMotion ? { duration: 0 } : { stiffness: 140, damping: 22 }
  const a0 = useSpring(segment.a0, spring)
  const a1 = useSpring(segment.a0, spring) // starter med null bredde og vokser
  useEffect(() => {
    a0.set(segment.a0)
    a1.set(segment.a1)
  }, [segment.a0, segment.a1, a0, a1])

  const angles = [a0, a1] as MotionValue<number>[]
  const top = useTransform(angles, ([s, e]: number[]) => topFace(s, e))
  const outer = useTransform(angles, ([s, e]: number[]) => outerWall(s, e))
  const inner = useTransform(angles, ([s, e]: number[]) => innerWall(s, e))

  return (
    <motion.g
      animate={{ y: lifted && !reduceMotion ? -10 : 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      onMouseEnter={() => onHover(segment.id)}
      onMouseLeave={() => onHover(null)}
      className="cursor-pointer"
    >
      <motion.path d={inner} style={{ fill: `color-mix(in oklch, ${segment.color}, black 45%)` }} />
      <motion.path d={outer} style={{ fill: `color-mix(in oklch, ${segment.color}, black 28%)` }} />
      <motion.path
        d={top}
        style={{ fill: segment.color }}
        stroke="white"
        strokeOpacity={0.55}
        strokeWidth={1}
        strokeLinejoin="round"
      />
    </motion.g>
  )
}

// Sektordiagram i 3D over dine utslippsmetoder. Oppdateres live; de største
// bitene er verstingene. Fast tillegg er ikke med her – det vises i tanken.
export function DonutChart({ footprint, colors, highlightId, ref }: DonutChartProps) {
  const reduceMotion = useReducedMotion()
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const { methods, personalKg } = footprint

  const segments: Segment[] = methods.map(({ method, kgPerYear }, i) => {
    const before = methods.slice(0, i).reduce((sum, m) => sum + m.kgPerYear, 0)
    const toAngle = (kg: number) => START + (personalKg > 0 ? (kg / personalKg) * FULL : 0)
    return {
      id: method.id,
      name: method.name,
      color: colors.get(method.id) ?? 'var(--accent)',
      kg: kgPerYear,
      a0: toAngle(before),
      a1: toAngle(before + kgPerYear),
    }
  })

  // Bitene tegnes bakfra og fram, så de fremste havner øverst.
  const drawOrder = [...segments].sort((a, b) => Math.sin((a.a0 + a.a1) / 2) - Math.sin((b.a0 + b.a1) / 2))
  const activeId = hoveredId ?? highlightId

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="text-center sm:text-left">
          <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Dine valg per år</p>
          <AnimatedNumber
            value={personalKg}
            format={formatKg}
            className="block text-4xl font-black tracking-tight text-primary-ink tabular-nums"
          />
        </div>
        {segments.length > 0 && (
          <p className="hidden text-xs text-muted-foreground [@media(hover:hover)]:block">Hold over en bit for å se den i listen</p>
        )}
      </div>
      <div ref={ref} className="relative mx-auto w-full max-w-md">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full overflow-visible"
          role="img"
          aria-label={
            segments.length
              ? `Sektordiagram: ${segments.map((s) => `${s.name} ${formatKg(s.kg)}`).join(', ')}`
              : 'Sektordiagram uten data ennå'
          }
        >
          <defs>
            <radialGradient id="donut-shadow">
              <stop offset="0.6" stopColor="rgb(42 78 42)" stopOpacity="0.22" />
              <stop offset="1" stopColor="rgb(42 78 42)" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="donut-gloss" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="white" stopOpacity="0.35" />
              <stop offset="0.5" stopColor="white" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Skygge under ringen */}
          <ellipse cx={CX} cy={CY + DEPTH + 14} rx={RX * 1.02} ry={RY * 0.7} fill="url(#donut-shadow)" />

          {/* Hullet i midten skal vise kortets bakgrunn, ikke skyggen */}
          <ellipse cx={CX} cy={CY} rx={RX_IN} ry={RY_IN} fill="var(--card)" />

          {/* Tom ring før man har svart */}
          {segments.length === 0 && (
            <g>
              <path d={innerWall(START, START + FULL)} fill="#ddd6cf" />
              <path d={outerWall(START, START + FULL)} fill="#e4ded8" />
              <path d={topFace(START, START + FULL - 0.0001)} fill="var(--muted)" stroke="white" />
            </g>
          )}

          {drawOrder.map((segment) => (
            <Slice key={segment.id} segment={segment} lifted={activeId === segment.id} onHover={setHoveredId} />
          ))}

          {/* Glans over toppflaten */}
          {segments.length > 0 && (
            <path d={topFace(START, START + FULL - 0.0001)} fill="url(#donut-gloss)" pointerEvents="none" />
          )}
        </svg>
      </div>

      <div className="min-w-0">
        <ul className="grid gap-x-6 gap-y-0.5 text-sm sm:grid-cols-2" aria-label="Forklaring">
          {segments.map((s) => (
            <motion.li
              layout={!reduceMotion}
              key={s.id}
              initial={reduceMotion ? false : { opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              onMouseEnter={() => setHoveredId(s.id)}
              onMouseLeave={() => setHoveredId(null)}
              className={cn(
                'flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors',
                activeId === s.id && 'bg-muted',
              )}
            >
              <span aria-hidden className="size-3 shrink-0 rounded-[4px]" style={{ background: s.color }} />
              <span className="min-w-0 flex-1 truncate">{s.name}</span>
              <span className="shrink-0 text-muted-foreground tabular-nums">{formatKg(s.kg)}</span>
              <span className="w-10 shrink-0 text-right font-bold tabular-nums">
                {Math.round((s.kg / personalKg) * 100)}%
              </span>
            </motion.li>
          ))}
          {segments.length === 0 && (
            <li className="px-2 text-muted-foreground">Svar på spørsmålene, så dukker utslippene dine opp her.</li>
          )}
        </ul>
      </div>
    </div>
  )
}
