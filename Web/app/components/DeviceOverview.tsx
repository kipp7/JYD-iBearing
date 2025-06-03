import React from 'react';
import { Progress, Statistic, Tag } from 'antd'; // Tag might be useful for status

const DeviceOverview = () => {
  // RK3568 芯片相关参数示例数据
  const rk3568Data = [
    { title: 'CPU 温度', value: 58.5, precision: 1, suffix: '°C', color: '#36cfc9' }, // Teal for temp
    { title: '内存占用率', value: 67, precision: 0, suffix: '%', color: '#40a9ff' },    // Blue for memory
    { title: 'NPU 状态', value: '运行中', color: '#95de64' },                           // Green for NPU active
  ];

  // 设备负载数据 (可以从 props 或 state 获取实际值)
  const deviceLoadPercent = 72;

  return (
    <div className="flex-1 min-h-[240px] bg-[#2d3a4a] rounded-xl p-4 border border-[#3a4a5a] shadow-lg">
      <h2 className="text-xl font-bold mb-4 text-white text-center border-b border-slate-600 pb-2">
        RK3568 核心板状态
      </h2>

      {/* 内容区域，卡片更紧凑，网格间距缩小 */}
      <div className="grid grid-cols-2 gap-3 mt-3">
        {rk3568Data.map((item, i) => (
          <div
            key={i}
            className="bg-[#222f3e] border border-[#4a5a6a] rounded-lg p-2 min-h-[50px] transition-transform transform hover:scale-[1.02] flex flex-col justify-center shadow-md"
          >
            <Statistic
              title={<span className="text-slate-300 text-xs sm:text-sm font-medium">{item.title}</span>}
              value={item.value}
              precision={typeof item.value === 'number' ? item.precision : undefined}
              suffix={typeof item.value === 'number' ? item.suffix : undefined}
              valueStyle={{ 
                color: item.color || '#00e5ff', 
                fontWeight: 'bold', 
                fontSize: '1.2rem sm:1.4rem', // Slightly larger font for value
                lineHeight: '1.1'
              }}
              className="text-center"
            />
            {typeof item.value === 'string' && item.title === 'NPU 状态' && (
                 <Tag color={item.value === '运行中' ? 'green' : 'orange'} className="mt-1 mx-auto text-xs">
                   {item.value}
                 </Tag>
            )}
          </div>
        ))}

        {/* 设备负载部分 */}
        <div className="bg-[#222f3e] border border-[#4a5a6a] rounded-lg p-3 min-h-[90px] transition-transform transform hover:scale-[1.02] flex flex-col justify-center shadow-md">
          <div className="text-slate-300 text-xs sm:text-sm font-medium mb-1.5 text-center">设备负载</div>
          <Progress 
            percent={deviceLoadPercent} 
            status="active" 
            strokeColor={{
              '0%': '#52c41a', // Green
              '70%': '#faad14', // Orange
              '100%': '#f5222d', // Red
            }}
            trailColor="#3c4d5f"
            className="px-2"
            format={(percent) => <span style={{color: deviceLoadPercent > 85 ? '#f5222d' : deviceLoadPercent > 60 ? '#faad14' : '#52c41a'}}>{percent}%</span>}
          />
        </div>
      </div>
    </div>
  );
};

export default DeviceOverview;