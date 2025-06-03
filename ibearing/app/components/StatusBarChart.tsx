import React from 'react';
import ReactECharts from 'echarts-for-react';

interface Props {
  onExpand: (option: any) => void;
}

const barOption = {
  title: {
    text: '设备维修计划及状态',
    left: 'center',
    textStyle: { color: '#ffffff', fontSize: 14, fontWeight: 'bold' },
  },
  tooltip: {},
  xAxis: {
    type: 'value',
    axisLabel: { color: '#bbb' },
    axisLine: { lineStyle: { color: '#666' } },
    splitLine: { lineStyle: { color: '#2f3f4f' } },
  },
  yAxis: {
    type: 'category',
    data: ['保养中', '待检验', '已停用', '运行中'],
    axisLabel: { color: '#eee', fontWeight: 'bold' },
    axisLine: { lineStyle: { color: '#666' } },
  },
  series: [
    {
      data: [27.21, 17.1, 10.12, 51.0],
      type: 'bar',
      barWidth: 16,
      itemStyle: {
        borderRadius: 4,
        color: 'rgb(255, 157, 0)',
        shadowBlur: 10,
        shadowColor: 'rgba(255, 255, 0, 0.21)',
      },
      label: {
        show: true,
        position: 'right',
        formatter: '{c}%',
        color: '#fff',
        fontWeight: 'bold',
      },
    },
  ],
  grid: {
    top: 40,
    bottom: 40,
    left: 80,
    right: 30,
  },
  backgroundColor: '#1e2a3a',
};

const StatusBarChart: React.FC<Props> = ({ onExpand }) => {
  return (
    <div
      className="flex-1 min-h-[240px] max-h-[300px] bg-[#2d3a4a] rounded-xl p-4 border border-[#2d3a4a] shadow-md"
    >
      <div
        className="w-full h-full rounded-xl border border-[#3c4d5f] bg-[#1e2a3a] overflow-hidden cursor-pointer transition-transform transform hover:scale-[1.01]"
        onClick={() => onExpand(barOption)}
      >
        <ReactECharts option={barOption} style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  );
};

export default StatusBarChart;
