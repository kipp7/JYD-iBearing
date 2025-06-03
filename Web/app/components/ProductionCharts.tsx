import React from 'react';
import ReactECharts from 'echarts-for-react';

interface Props {
  onExpand: (option: any) => void;
}

// 更新 pieOption 函数以接受更多颜色参数和调整样式
const pieOption = (
  title: string,
  value: number,
  completedColor: string,
  incompleteColor: string,
  textColor: string = '#e2e8f0', // Default text color (slate-200)
  valueColor: string = '#f8fafc' // Default value color (slate-50)
) => ({
  title: {
    text: title,
    left: 'center',
    top: '8%', // Slightly adjusted top
    textStyle: {
      color: textColor,
      fontSize: 13, // Slightly smaller title font
      fontWeight: '600', // Semi-bold
    },
  },
  series: [
    {
      type: 'pie',
      radius: ['45%', '70%'], // Adjusted radius for a slightly thicker ring
      center: ['50%', '55%'], // Adjusted center for title space
      avoidLabelOverlap: false,
      label: {
        show: true,
        position: 'center',
        formatter: `${value}%`,
        fontSize: 22, // Larger percentage value
        fontWeight: 'bold',
        color: valueColor,
      },
      labelLine: { show: false },
      data: [
        { value, name: '完成', itemStyle: { color: completedColor } },
        { 
          value: 100 - value, 
          name: '未完成', 
          itemStyle: { 
            color: incompleteColor,
            opacity: 0.7 // Make incomplete part slightly transparent
          } 
        },
      ],
      emphasis: { // Add emphasis style for hover
        label: {
          show: true,
          fontSize: 24,
        },
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    },
  ],
  backgroundColor: '#1e2a3a', // Darker card background for each chart
  tooltip: { // Add basic tooltip
    trigger: 'item',
    formatter: '{b}: {d}%'
  }
});

const ProductionCharts: React.FC<Props> = ({ onExpand }) => {
  const chartsData = [
    { title: '预测准确率', value: 92, completedColor: '#20c997', incompleteColor: '#334155', valueColor: '#67e8f9' }, // Teal/Cyan
    { title: '模型置信度', value: 85, completedColor: '#3b82f6', incompleteColor: '#334155', valueColor: '#93c5fd' }, // Blue
  ];

  const chartOptions = chartsData.map(data => 
    pieOption(data.title, data.value, data.completedColor, data.incompleteColor, '#cbd5e1', data.valueColor)
  );

  return (
    // 外层容器样式调整
    <div 
      className="bg-[#2d3a4a] p-3.5 rounded-xl shadow-lg" // Tailwind classes for consistency
    >
      <h3 className="text-base font-semibold text-slate-100 mb-3 text-center">
        后期预估效率
      </h3>
      {/* 内层图表容器样式调整 */}
      <div 
        className="flex justify-around items-center bg-[#253241] p-3 rounded-lg border border-slate-700/70" // Slightly different bg for inner, gap
      >
        {chartOptions.map((option, i) => (
          <div
            key={i}
            onClick={() => onExpand(option)}
            className="cursor-pointer transition-all duration-300 ease-in-out transform hover:scale-105"
            style={{
              width: '160px', // Slightly smaller charts
              height: '160px',
            }}
          >
            <ReactECharts 
              option={option} 
              style={{ width: '100%', height: '100%' }} 
              notMerge={true} // Important for dynamic updates if data changes
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductionCharts;