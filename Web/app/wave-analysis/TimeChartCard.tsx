import React from 'react';
import { Card } from 'antd';
import { Line } from '@ant-design/plots';
import ReactECharts from 'echarts-for-react';

interface TimeChartCardProps {
  type: 'waveform' | 'rms' | 'stat' | 'moving_mean' | 'moving_std' | 'vmd_time';
  axis: string;
  data: any[];
  windowSize?: number; // 新增：传入滑窗大小用于标题显示
  length?: number;
}

const getYAxisLabel = (axis: string): string => {
  if (axis.includes('速度')) return '速度 (mm/s)';
  if (axis.includes('位移')) return '位移 (μm)';
  if (axis.includes('RMS')) return '加速度 RMS (g)';
  if (axis.includes('VMD')) return '幅值';  // ✅ 新增
  return '加速度 (g)';
};

export default function TimeChartCard({ type, axis, data, windowSize = 200, length, }: TimeChartCardProps) {
  if (type === 'stat') {
    return (
      <Card title={axis} className="mb-4">
        <ReactECharts
          style={{ height: 300 }}
          option={{
            tooltip: {},
            xAxis: {
              type: 'category',
              data: data.map((item: any) => item.name),
            },
            yAxis: {
              type: 'value',
              min: -0.001, // ✅ 防止柱子为 0 时完全不可见
            },
            series: [
              {
                type: 'bar',
                data: data.map((item: any) => ({
                  name: item.name,
                  value: Math.abs(item.value) < 1e-6 ? 1e-6 : item.value, // ✅ 强制微小值可见
                })),
              },
            ],
          }}
        />
      </Card>
    );
  }

  // waveform / rms / moving_mean / moving_std
  const lineData = data.map((item: any, i: number) => {
    if (Array.isArray(item) && item.length === 2) {
      return { time: item[0], value: item[1] };
    }
    return { time: i, value: item };
  });
  

  return (
    <Card
    title={
        type === 'waveform'
        ? `${axis}（${length ?? 0} 点）`
        : ['moving_mean', 'moving_std'].includes(type)
            ? `${axis}（窗口大小 = ${windowSize}）`
            : axis
    }
    className="mb-4"
    >
      <Line
  data={lineData}
  xField="time"
  yField="value"
  height={300}
  xAxis={{ title: { text: '时间 / s' } }}
  yAxis={{
    title: { text: getYAxisLabel(axis) },
    min: 'auto',
    max: 'auto'
  }}
  smooth
  lineStyle={{ lineWidth: 2 }}   // ✅ 加粗线条
/>
    </Card>
  );
}
