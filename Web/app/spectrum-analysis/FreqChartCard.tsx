'use client';

import React, { useState } from 'react';
import { Card, Checkbox, Divider } from 'antd';
import dynamic from 'next/dynamic';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface Mark {
  freq: number;
  amp: number;
  name?: string;
}

interface FreqChartCardProps {
  axis: string;
  data: any;
  marks?: Mark[];
  frequencies?: number[];
  mode?: 'stft' | 'waveform' | 'rms' | 'stat';
}

function FreqChartCardComponent(props: FreqChartCardProps) {
  const { axis, data, marks = [], mode, frequencies } = props;
  const [visibleTypes, setVisibleTypes] = useState<string[]>(['内圈', '外圈', '滚动体']);
  const [visibleMultiples, setVisibleMultiples] = useState<string[]>(['1X', '2X', '3X']);

  // 🔥 STFT 热力图
  if (mode === 'stft') {
    const z = data.map((frame: any) => frame.amplitudes);
    const x = data.map((frame: any) => frame.time);
    const y = frequencies;

    return (
      <Card title={axis} className="mb-4">
        <Plot
          data={[
            {
              z,
              x,
              y,
              type: 'heatmap',
              colorscale: 'Viridis',
              colorbar: { title: '幅值' },
            },
          ]}
          layout={{
            title: axis,
            xaxis: { title: '时间 / s' },
            yaxis: { title: '频率 / Hz' },
            margin: { l: 50, r: 20, b: 50, t: 30 },
            height: 300,
          }}
          config={{ displayModeBar: false }}
        />
      </Card>
    );
  }

  // 🔍 是否展示故障点筛选
  const showFilter = axis.includes('包络谱');
  const filteredMarks = marks.filter((pt) => {
    const name = pt.name || '';
    if (!showFilter) return true;
    return visibleTypes.some((type) => name.includes(type)) &&
           visibleMultiples.some((m) => name.includes(m));
  });

  // 💡 数据点转换
  const seriesData =
    Array.isArray(data?.[0]) && data[0].length === 2
      ? data
      : data.map((y: number, i: number) => [i, y]);

  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const { data } = params[0];
        return `频率: ${data[0].toFixed(2)} Hz<br/>幅值: ${data[1].toFixed(4)}`;
      },
    },
    xAxis: {
      type: 'value',
      name:
        axis.includes('包络谱') || axis.includes('频率')
          ? '频率 (Hz)'
          : axis.includes('时间')
          ? '时间 (s)'
          : '索引',
    },
    yAxis: { type: 'value', name: '幅值' },
    series: [
      {
        name: axis,
        type: 'line',
        showSymbol: false,
        data: seriesData,
        markPoint: {
          data: filteredMarks.map((pt) => ({
            coord: [pt.freq, pt.amp],
            name: pt.name || `${pt.freq.toFixed(2)}Hz`,
            value: pt.amp.toFixed(4),
            symbol: 'circle',
            symbolSize: 6,
            label: {
              formatter: (param: any) => param.data?.name || '',
              fontSize: 10,
            },
          })),
          itemStyle: { color: 'orange' },
        },
      },
    ],
    dataZoom: [{ type: 'inside' }, { type: 'slider' }],
  };

  return (
    <Card title={axis} className="mb-4">
      {showFilter && (
        <div style={{ marginBottom: 8 }}>
          <span style={{ marginRight: 8 }}>显示故障类型:</span>
          <Checkbox.Group
            options={['内圈', '外圈', '滚动体']}
            value={visibleTypes}
            onChange={(val) => setVisibleTypes(val as string[])}
          />
          <Divider type="vertical" />
          <span style={{ marginRight: 8 }}>显示倍频:</span>
          <Checkbox.Group
            options={['1X', '2X', '3X']}
            value={visibleMultiples}
            onChange={(val) => setVisibleMultiples(val as string[])}
          />
        </div>
      )}
      <ReactECharts style={{ height: 300 }} option={option} />
    </Card>
  );
}

// ✅ 使用 React.memo 避免重复渲染
const FreqChartCard = React.memo(FreqChartCardComponent);

export default FreqChartCard;
