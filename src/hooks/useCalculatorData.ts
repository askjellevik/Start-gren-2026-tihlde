import { useEffect, useState } from 'react'
import { seedData } from '@/data/seed'
import { loadCalculatorData, type DataOrigin } from '@/lib/dataSource'
import type { CalculatorData } from '@/types/calculator'

// Starter med det innebygde datasettet (så siden er brukbar med én gang) og
// bytter til databasens versjon når den er hentet.
export function useCalculatorData() {
  const [data, setData] = useState<CalculatorData>(seedData)
  const [origin, setOrigin] = useState<DataOrigin>('innebygd')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    loadCalculatorData().then((loaded) => {
      if (cancelled) return
      setData(loaded.data)
      setOrigin(loaded.origin)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return { data, origin, loading }
}
