import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface ConfirmDeleteButtonProps {
  label: string
  warning?: string
  onConfirm: () => void
}

// To-stegs sletting: første klikk spør, andre klikk sletter.
export function ConfirmDeleteButton({ label, warning, onConfirm }: ConfirmDeleteButtonProps) {
  const [confirming, setConfirming] = useState(false)

  if (!confirming) {
    return (
      <Button variant="destructive" size="sm" aria-label={label} onClick={() => setConfirming(true)}>
        <Trash2 /> Slett
      </Button>
    )
  }

  return (
    <span className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-destructive">{warning ?? 'Er du sikker?'}</span>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => {
          setConfirming(false)
          onConfirm()
        }}
      >
        Ja, slett
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
        Avbryt
      </Button>
    </span>
  )
}
