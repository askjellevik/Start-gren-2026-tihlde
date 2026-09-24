import * as React from 'react'
import { cn } from '@/lib/utils'

// Kortflate brukt i hele appen: stor radius, myk skygge og en tynn lys kant
// øverst som gir litt dybde.
export function Card({ className, ...props }: React.ComponentProps<'section'>) {
  return (
    <section
      className={cn(
        'relative rounded-2xl border border-border/70 bg-card shadow-soft',
        'before:pointer-events-none before:absolute before:inset-x-6 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white before:to-transparent',
        className,
      )}
      {...props}
    />
  )
}
