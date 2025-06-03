'use client';
import useSensorData from './useSensorData';

export default function useGyroscope() {
  const { data, loading, error } = useSensorData();

  const grouped: Record<string, { time: string; value: number }[]> = {};

  data.forEach((record) => {
    const id = record.device_id || 'unknown';
    if (!grouped[id]) grouped[id] = [];
    grouped[id].push({
      time: record.event_time,
      value: record.gyroscope_total,
    });
  });

  //  自动根据时间升序排序
  Object.values(grouped).forEach((records) => {
    records.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  });

  return { data: grouped, loading, error };
}
