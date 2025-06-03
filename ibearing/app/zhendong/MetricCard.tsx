import React from 'react';

interface MetricCardProps {
  label: string;
  value: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value }) => {
  // console.log(`Rendering MetricCard: ${label}`); // 取消注释以观察渲染
  return (
    <div className="bg-white p-3 rounded shadow flex flex-col items-center justify-center text-center h-24 md:h-28">
      <h3 className="text-xs font-semibold mb-1 text-gray-600 whitespace-nowrap">{label}</h3>
      <div className="text-base md:text-lg font-bold text-blue-700">{value}</div>
    </div>
  );
};

export default React.memo(MetricCard);