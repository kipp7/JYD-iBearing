// /hooks/useSensorData.ts
import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';

// 实时获取最新一条数据
export function useSensorData(deviceId: string, intervalMs = 3000) {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase
        .from('sensor_data')
        .select('*')
        .eq('device_id', deviceId)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (!error && data) {
        setData(data);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, intervalMs);
    return () => clearInterval(interval);
  }, [deviceId, intervalMs]);

  return data;
}

//  拉取近一个月的历史数据（最多 10000000条）
export async function fetchSensorHistoryData(deviceId: string) {
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  const { data, error } = await supabase
    .from('sensor_data')
    .select('*')
    .eq('device_id', deviceId)
    .gte('timestamp', oneMonthAgo.toISOString())
    .order('timestamp', { ascending: true })
    .limit(10000000);

  if (error) {
    console.error('历史数据拉取失败:', error);
    return [];
  }

  return data || [];
}
