// app/hooks/useLandslideRisk.ts
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export interface RiskRecord {
  device_id: string
  event_time: string
  risk_level: number
}

export default function useLandslideRisk(refreshInterval = 30000) {
  const [data, setData] = useState<RiskRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = async () => {
    const { data: result, error } = await supabase
      .from('iot_anomaly_trends')
      .select('device_id, event_time, risk_level')
      .order('event_time', { ascending: false })

    if (error) {
      console.error('获取滑坡风险数据失败', error)
      setError(error)
    } else if (result && result.length > 0) {
      // 找出 risk_level 最大的那条
      const highest = result.reduce((prev, curr) => {
        return curr.risk_level > prev.risk_level ? curr : prev
      })
      setData(highest)
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, refreshInterval)
    return () => clearInterval(interval)
  }, [refreshInterval])

  return { data, loading, error }
}
