// Sjekker at tilgangskontrollen (RLS) i databasen faktisk holder.
// Kjøres mot LOKAL Supabase (npx supabase start), aldri mot produksjon:
//
//   pnpm db:verify-rls
//
// Oppretter en admin og en vanlig bruker, og prøver å lese/skrive som anonym,
// vanlig bruker og admin.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { execSync } from 'node:child_process'

const status = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8' }))
const url: string = status.API_URL
if (!/^http:\/\/(127\.0\.0\.1|localhost)/.test(url)) {
  throw new Error(`Nekter å kjøre mot ikke-lokal database: ${url}`)
}

const service = createClient(url, status.SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const anonClient = () => createClient(url, status.ANON_KEY, { auth: { persistSession: false } })

let failures = 0
function check(name: string, ok: boolean, detail?: unknown) {
  console.log(`${ok ? '✓' : '✗'} ${name}`)
  if (!ok) {
    failures++
    if (detail) console.log('   ', detail)
  }
}

async function userClient(email: string, makeAdmin: boolean): Promise<SupabaseClient> {
  const password = 'Test-passord-12345'
  const { data: list } = await service.auth.admin.listUsers()
  let user = list.users.find((u) => u.email === email)
  if (!user) {
    const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true })
    if (error) throw error
    user = data.user
  }
  if (makeAdmin) await service.from('admins').upsert({ user_id: user.id })
  const client = anonClient()
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw error
  return client
}

const anon = anonClient()
const user = await userClient('vanlig@test.local', false)
const admin = await userClient('admin@test.local', true)

// --- Anonym -----------------------------------------------------------------
const read = await anon.from('emission_methods').select('id')
check('Anonym kan lese utslippsmetoder', !read.error && (read.data?.length ?? 0) > 0, read.error)

const anonInsert = await anon.from('categories').insert({ id: 'hack', name: 'Hack', color: '#000000' })
check('Anonym kan ikke legge til kategori', anonInsert.error !== null)

const anonUpdate = await anon.from('emission_methods').update({ kg_co2e_per_unit: 0 }).eq('id', 'rodt-kjott').select()
check('Anonym kan ikke endre verdier', anonUpdate.error !== null || anonUpdate.data?.length === 0)

const anonAdmins = await anon.from('admins').select('*')
check('Anonym ser ingen admins', (anonAdmins.data?.length ?? 0) === 0)

const signup = await anon.auth.signUp({ email: 'inntrenger@test.local', password: 'Inntrenger-12345' })
check('Selvregistrering er slått av', signup.error !== null, signup.data)

// --- Innlogget, ikke admin --------------------------------------------------
const userUpdate = await user.from('emission_methods').update({ kg_co2e_per_unit: 0 }).eq('id', 'rodt-kjott').select()
check('Vanlig bruker kan ikke endre verdier', userUpdate.error !== null || userUpdate.data?.length === 0)

const userDelete = await user.from('categories').delete().eq('id', 'mat').select()
check('Vanlig bruker kan ikke slette kategori', userDelete.error !== null || userDelete.data?.length === 0)

const selfPromote = await user.from('admins').insert({ user_id: (await user.auth.getUser()).data.user!.id })
check('Vanlig bruker kan ikke gjøre seg selv til admin', selfPromote.error !== null)

const userAudit = await user.from('audit_log').select('*')
check('Vanlig bruker kan ikke lese revisjonsloggen', (userAudit.data?.length ?? 0) === 0)

// --- Admin ------------------------------------------------------------------
const isAdmin = await admin.rpc('is_admin')
check('is_admin() er sann for admin', isAdmin.data === true, isAdmin.error)

const tmpCategory = await admin.from('categories').insert({ id: 'rls-test', name: 'RLS-test', color: '#123456' }).select()
check('Admin kan legge til kategori', !tmpCategory.error, tmpCategory.error)

const tmpMethod = await admin.from('emission_methods').insert({
  id: 'rls-test-metode', category_id: 'rls-test', name: 'Test', question: 'Test?', period: 'week',
  unit_label: 'stk', kg_co2e_per_unit: 1, choices: [{ label: 'En', value: 1 }],
}).select()
check('Admin kan legge til utslippsmetode', !tmpMethod.error, tmpMethod.error)

const badChoices = await admin.from('emission_methods').update({ choices: [{ label: 'x', value: -5 }] as never }).eq('id', 'rls-test-metode')
check('Databasen avviser negative verdier i valg', badChoices.error !== null)

const badUrl = await admin.from('emission_methods').update({ source_url: 'javascript:alert(1)' }).eq('id', 'rls-test-metode')
check('Databasen avviser kilde-URL som ikke er https', badUrl.error !== null)

const adminUpdate = await admin.from('emission_methods').update({ kg_co2e_per_unit: 2 }).eq('id', 'rls-test-metode').select()
check('Admin kan endre verdier', adminUpdate.data?.length === 1, adminUpdate.error)

const delCategory = await admin.from('categories').delete().eq('id', 'rls-test')
const orphan = await admin.from('emission_methods').select('id').eq('id', 'rls-test-metode')
check('Sletting av kategori fjerner også metodene', !delCategory.error && orphan.data?.length === 0)

const audit = await admin.from('audit_log').select('action').eq('row_id', 'rls-test-metode')
check('Endringer havner i revisjonsloggen', (audit.data?.length ?? 0) >= 3, audit.error)

console.log(failures === 0 ? '\nAlle sjekker bestått.' : `\n${failures} sjekk(er) feilet.`)
process.exit(failures === 0 ? 0 : 1)
