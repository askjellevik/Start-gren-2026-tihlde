// Genererer supabase/seed.sql fra src/data/seed.ts, slik at appens innebygde
// data og databasen alltid starter likt.
//
//   pnpm db:seed-sql
//
// Kjøres med Node 22.18+ (innebygd TypeScript-støtte).

import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { seedData } from '../src/data/seed.ts'

const sql = (value: string | number | null): string => {
  if (value === null) return 'null'
  if (typeof value === 'number') return String(value)
  return `'${value.replaceAll("'", "''")}'`
}

const { settings, categories, methods } = seedData
const lines: string[] = [
  '-- AUTOGENERERT av scripts/generate-seed-sql.ts – ikke rediger for hånd.',
  '-- Kjør `pnpm db:seed-sql` etter endringer i src/data/seed.ts.',
  '',
  'insert into public.settings (id, national_average_kg, national_average_source, national_average_source_url, baseline_kg, baseline_label, target_kg, target_label)',
  `values (true, ${sql(settings.nationalAverageKg)}, ${sql(settings.nationalAverageSource)}, ${sql(settings.nationalAverageSourceUrl)}, ${sql(settings.baselineKg)}, ${sql(settings.baselineLabel)}, ${sql(settings.targetKg)}, ${sql(settings.targetLabel)})`,
  'on conflict (id) do nothing;',
  '',
  'insert into public.categories (id, name, description, color, sort_order) values',
  categories
    .map((c) => `  (${[c.id, c.name, c.description, c.color, c.sortOrder].map(sql).join(', ')})`)
    .join(',\n'),
  'on conflict (id) do nothing;',
  '',
  'insert into public.emission_methods (id, category_id, name, question, period, unit_label, kg_co2e_per_unit, choices, tip, source_name, source_url, sort_order) values',
  methods
    .map((m) => {
      const values = [
        sql(m.id), sql(m.categoryId), sql(m.name), sql(m.question), sql(m.period), sql(m.unitLabel),
        sql(m.kgCo2ePerUnit), `${sql(JSON.stringify(m.choices))}::jsonb`,
        sql(m.tip), sql(m.sourceName), sql(m.sourceUrl), sql(m.sortOrder),
      ]
      return `  (${values.join(', ')})`
    })
    .join(',\n'),
  'on conflict (id) do nothing;',
  '',
]

const target = fileURLToPath(new URL('../supabase/seed.sql', import.meta.url))
writeFileSync(target, lines.join('\n'), 'utf8')
console.log(`Skrev ${categories.length} kategorier og ${methods.length} metoder til ${target}`)
