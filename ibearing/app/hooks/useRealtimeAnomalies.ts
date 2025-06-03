// app/hooks/useRealtimeAnomalies.ts
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export interface RealtimeAnomaly {
  id: number
  event_time: string
  device_id: string
  anomaly_type: string
  value: number
}

export default function useRealtimeAnomalies(limit = 30, refreshInterval = 30000) {
  const [data, setData] = useState<RealtimeAnomaly[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = async () => {
    const { data: result, error } = await supabase
      .from('iot_anomalies')
      .select('id, event_time, device_id, anomaly_type, value')
      .order('event_time', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('获取异常记录失败', error)
      setError(error)
    } else {
      setData(result || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, refreshInterval)
    return () => clearInterval(interval)
  }, [limit, refreshInterval])

  return { data, loading, error }
}
