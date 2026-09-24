import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { supabase } from '@/lib/supabaseClient'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setSubmitting(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setSubmitting(false)
    // Samme melding uansett årsak, så man ikke kan sjekke hvilke e-poster som finnes.
    if (error) setError('Feil e-post eller passord.')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="E-post" htmlFor="email">
        <Input
          id="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>
      <Field label="Passord" htmlFor="password">
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full" size="lg" disabled={submitting}>
        {submitting ? 'Logger inn …' : 'Logg inn'}
      </Button>
      <p className="text-xs text-muted-foreground">
        Kun forhåndsdefinerte administratorer har tilgang. Kontakt ansvarlig for å få tilgang.
      </p>
    </form>
  )
}
