'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Button, message } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import * as echarts from 'echarts';
import { supabase } from '@/utils/supabase';

export default function TemperatureAnalysis() {
  const [realtimeTemp, setRealtimeTemp] = useState<number | null>(0);
  const [peakTemp, setPeakTemp] = useState<number | null>(0);
  const [avgTemp, setAvgTemp] = useState<number | null>(0);
  const [connectionStatus, setConnectionStatus] = useState(true);
  const [currentTime, setCurrentTime] = useState('');

  const trendChartRef = useRef<HTMLDivElement>(null);
  const distributionChartRef = useRef<HTMLDivElement>(null);

  const trendChartInstance = useRef<echarts.ECharts>();
  const distributionChartInstance = useRef<echarts.ECharts>();

  const trendDataRef = useRef<[number, number][]>([]);
  const lastTimestampRef = useRef<number>(0);

  // 更新时间显示
  useEffect(() => {
    const updateClock = () => {
      setCurrentTime(new Date().toLocaleString());
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // 初始化图表 + 数据加载
  useEffect(() => {
    if (!trendChartRef.current || !distributionChartRef.current) return;

    trendChartInstance.current = echarts.init(trendChartRef.current);
    distributionChartInstance.current = echarts.init(distributionChartRef.current);

    // 初始图表配置
    trendChartInstance.current.setOption({
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'time' },
      yAxis: { type: 'value' },
      series: [{ type: 'line', data: [] }],
    });

    distributionChartInstance.current.setOption({
      tooltip: { trigger: 'item' },
      series: [
        {
          type: 'pie',
          data: [
            { value: 0, name: '低温' },
            { value: 0, name: '正常' },
            { value: 0, name: '高温' },
          ],
        },
      ],
    });

    // 第一次加载历史数据
    const loadInitialData = async () => {
      const { data, error } = await supabase
        .from('sensor_data')
        .select('temperature, timestamp')
        .order('timestamp', { ascending: true })
        .limit(100); // 最多拉取100条

      if (error || !data || data.length === 0) {
        console.error('初始化数据获取失败', error);
        setConnectionStatus(false);
        return;
      }

      const tempData: [number, number][] = [];
      let sum = 0;
      let peak = -Infinity;

      data.forEach((row) => {
        const time = new Date(row.timestamp).getTime();
        const temp = row.temperature;
        if (typeof temp === 'number') {
          tempData.push([time, temp]);
          sum += temp;
          if (temp > peak) peak = temp;
        }
      });

      trendDataRef.current = tempData;
      lastTimestampRef.current = new Date(data[data.length - 1].timestamp).getTime();

      const lastTemp = data[data.length - 1].temperature;
      setRealtimeTemp(typeof lastTemp === 'number' ? lastTemp : null);
      setPeakTemp(peak === -Infinity ? null : peak);
      setAvgTemp(tempData.length > 0 ? sum / tempData.length : null);

      trendChartInstance.current?.setOption({ series: [{ data: tempData }] });

      if (typeof lastTemp === 'number') {
        updateDistributionChart(lastTemp);
      }
    };

    // 轮询拉取新数据
    const pollNewData = async () => {
      const { data, error } = await supabase
        .from('sensor_data')
        .select('temperature, timestamp')
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        console.error('定时数据获取失败', error);
        setConnectionStatus(false);
        return;
      }

      const newTimestamp = new Date(data.timestamp).getTime();
      const temp = data.temperature;

      if (newTimestamp <= lastTimestampRef.current || typeof temp !== 'number') return;

      lastTimestampRef.current = newTimestamp;
      trendDataRef.current.push([newTimestamp, temp]);

      setConnectionStatus(true);
      setRealtimeTemp(temp);
      setPeakTemp((prev) => (prev !== null ? Math.max(prev, temp) : temp));
      setAvgTemp((prevAvg) =>
        prevAvg === null
          ? temp
          : (prevAvg * (trendDataRef.current.length - 1) + temp) /
            trendDataRef.current.length
      );

      trendChartInstance.current?.setOption({
        series: [{ data: [...trendDataRef.current] }],
      });

      updateDistributionChart(temp);
    };

    const updateDistributionChart = (temp: number) => {
      const distributionData = [
        { value: temp < 20 ? 1 : 0, name: '低温' },
        { value: temp >= 20 && temp <= 60 ? 1 : 0, name: '正常' },
        { value: temp > 60 ? 1 : 0, name: '高温' },
      ];
      distributionChartInstance.current?.setOption({
        series: [{ data: distributionData }],
      });
    };

    loadInitialData();
    const interval = setInterval(pollNewData, 5000);

    return () => {
      clearInterval(interval);
      trendChartInstance.current?.dispose();
      distributionChartInstance.current?.dispose();
    };
  }, []);

  const handleReconnect = () => {
    message.success('重新连接成功');
    setConnectionStatus(true);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* 状态栏 */}
      <div className="flex justify-between items-center bg-white shadow rounded p-4">
        <div className="text-gray-700">{currentTime}</div>
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              connectionStatus ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          <span className="text-gray-700">{connectionStatus ? '已连接' : '未连接'}</span>
          <Button icon={<ReloadOutlined />} onClick={handleReconnect} size="small">
            重新连接
          </Button>
        </div>
      </div>

      {/* 温度指标卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  <div className="bg-white p-4 rounded shadow flex flex-col items-center">
    <h3 className="text-lg font-semibold mb-2 text-black">实时温度值</h3>
    <div
      className={`text-2xl font-bold ${
        typeof realtimeTemp === 'number' && realtimeTemp > 40
          ? 'text-red-500'
          : 'text-black'
      }`}
    >
      {typeof realtimeTemp === 'number' ? `${realtimeTemp.toFixed(2)} ℃` : '-- ℃'}
    </div>
  </div>
  <div className="bg-white p-4 rounded shadow flex flex-col items-center">
    <h3 className="text-lg font-semibold mb-2 text-black">最高温度</h3>
    <div className="text-2xl font-bold text-black">
      {typeof peakTemp === 'number' ? `${peakTemp.toFixed(2)} ℃` : '-- ℃'}
    </div>
  </div>
  <div className="bg-white p-4 rounded shadow flex flex-col items-center">
    <h3 className="text-lg font-semibold mb-2 text-black">平均温度</h3>
    <div className="text-2xl font-bold text-black">
      {typeof avgTemp === 'number' ? `${avgTemp.toFixed(2)} ℃` : '-- ℃'}
    </div>
  </div>
</div>

{/* 温度趋势图 */}
<div className="bg-white p-4 rounded shadow h-96">
  <h3 className="font-semibold mb-2 text-black">温度趋势分析</h3>
  <div ref={trendChartRef} className="w-full h-full" />
</div>

{/* 温度分布图 */}
<div className="bg-white p-4 rounded shadow h-96">
  <h3 className="font-semibold mb-2 text-black">温度分布分析</h3>
  <div ref={distributionChartRef} className="w-full h-full" />
</div>
    </div>
  );
}
