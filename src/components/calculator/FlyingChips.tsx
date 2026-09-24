import { AnimatePresence, motion } from 'motion/react'

export interface FlyingChip {
  key: number
  label: string
  color: string
  from: { x: number; y: number }
  to: { x: number; y: number }
}

interface FlyingChipsProps {
  chips: FlyingChip[]
  onDone: (key: number) => void
}

// Når man velger et svar, flyr en liten merkelapp fra knappen inn i
// sektordiagrammet. Rent dekorativt – skjules for skjermlesere.
export function FlyingChips({ chips, onDone }: FlyingChipsProps) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-30">
      <AnimatePresence>
        {chips.map((chip) => (
          <motion.span
            key={chip.key}
            className="absolute top-0 left-0 px-3 py-1 text-xs font-bold whitespace-nowrap text-white"
            style={{ background: chip.color }}
            initial={{ x: chip.from.x, y: chip.from.y, scale: 1, opacity: 1 }}
            animate={{
              x: [chip.from.x, (chip.from.x + chip.to.x) / 2, chip.to.x],
              y: [chip.from.y, Math.min(chip.from.y, chip.to.y) - 80, chip.to.y],
              scale: [1, 1.1, 0.3],
              opacity: [1, 1, 0],
            }}
            transition={{ duration: 0.75, ease: 'easeInOut' }}
            onAnimationComplete={() => onDone(chip.key)}
          >
            {chip.label}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  )
}
