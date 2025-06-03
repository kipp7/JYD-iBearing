'use client';

import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import DeviceOverview from './DeviceOverview';
import ProductionCharts from './ProductionCharts';
import StatusBarChart from './StatusBarChart';
import ReactECharts from 'echarts-for-react';

const LeftSidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedOption, setExpandedOption] = useState<any>(null);

  const handleExpand = (option: any) => {
    setExpandedOption(option);
    setIsOpen(true);
  };

  return (
    <>
      {/* ✅ 注意：这里去掉了 padding 和 border，交给外层卡片处理 */}
      <div className="w-full h-full flex flex-col text-white font-semibold gap-3 overflow-y-auto">
          <DeviceOverview />
        <ProductionCharts onExpand={handleExpand} />
        <StatusBarChart onExpand={handleExpand} />
      </div>

      {/* 弹窗部分保持不变 */}
      <Dialog open={isOpen} onClose={() => setIsOpen(false)} className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
        <Dialog.Panel className="relative bg-[#1b2b3a] p-4 rounded-xl w-[80vw] h-[70vh] shadow-2xl border border-gray-600">
          <button onClick={() => setIsOpen(false)} className="absolute top-3 right-4 text-white text-2xl">×</button>
          <ReactECharts option={expandedOption} style={{ width: '100%', height: '100%' }} />
        </Dialog.Panel>
      </Dialog>
    </>
  );
};

export default LeftSidebar;
