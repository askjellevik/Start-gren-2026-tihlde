import * as React from 'react'
import { cn } from '@/lib/utils'

// Kortflate brukt i hele appen: hvit, firkantet og flat, som kortene på cultura.no.
export function Card({ className, ...props }: React.ComponentProps<'section'>) {
  return (
    <section
      className={cn('relative bg-card', className)}
      {...props}
    />
  )
}
