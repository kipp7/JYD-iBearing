// app/hooks/useDeviceErrorData.ts
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export interface DeviceErrorItem {
  device_id: string
  count: number
}

export default function useDeviceErrorData(refreshInterval = 30000) {
  const [data, setData] = useState<DeviceErrorItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = async () => {
    const { data: result, error } = await supabase
      .from('iot_anomalies')
      .select('device_id')
      .order('event_time', { ascending: false })

    if (error) {
      console.error('获取设备异常数据失败', error)
      setError(error)
    } else if (result) {
      const grouped = result.reduce((acc: Record<string, number>, row: any) => {
        const id = row.device_id || '未知设备'
        acc[id] = (acc[id] || 0) + 1
        return acc
      }, {})

      const formatted: DeviceErrorItem[] = Object.entries(grouped).map(([device_id, count]) => ({
        device_id,
        count,
      }))

      setData(formatted)
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
