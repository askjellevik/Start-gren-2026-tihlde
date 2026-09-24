import { animate, useReducedMotion } from 'motion/react'
import { useEffect, useRef } from 'react'

interface AnimatedNumberProps {
  value: number
  format: (n: number) => string
  duration?: number
  /** Startverdi ved første visning, f.eks. 0 for å telle opp. Standard: verdien selv. */
  from?: number
  className?: string
}

// Tall som teller opp/ned til ny verdi i stedet for å hoppe.
// Oppdaterer DOM direkte for å unngå en React-render per frame.
export function AnimatedNumber({ value, format, duration = 0.6, from, className }: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const current = useRef(from ?? value)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (reduceMotion) {
      node.textContent = format(value)
      current.current = value
      return
    }
    const controls = animate(current.current, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        current.current = v
        node.textContent = format(v)
      },
    })
    return () => controls.stop()
  }, [value, format, duration, reduceMotion])

  return (
    <span ref={ref} className={className}>
      {format(from ?? value)}
    </span>
  )
}
