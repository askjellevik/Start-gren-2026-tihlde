// Adminvisning: skal beskyttes med Supabase Auth før den tas i bruk.
export function AdminPanel() {
  return (
    <section className="rounded-lg border bg-card p-6 text-card-foreground">
      <h2 className="text-xl font-semibold">Admin</h2>
      <p className="mt-2 text-muted-foreground">
        Oppsett av kalkulatoren kommer her.
      </p>
    </section>
  )
}
