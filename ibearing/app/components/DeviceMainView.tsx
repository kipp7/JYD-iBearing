'use client';

import React from 'react';
import { Badge } from 'antd';
import ThreeDModelViewer from './ThreeDModelViewer';

const DeviceMainView = () => {
  const phmTestRigDetails = [
    { label: '设备型号', value: 'PHM-Exp V2.1' },
    { label: '序列号', value: 'SN7654321PHM' },
    //{ label: '安装日期', value: '2023-05-15' },
    //{ label: '上次维护', value: '2024-03-01' },
    { label: '运行模式', value: '自动故障注入' },
    { label: '额定功率', value: '2.2 kW' },
    { label: '工作电压', value: '380V AC' },
    { label: '当前实验', value: '外圈故障模拟' },
    { label: '主轴转速', value: '1100 rpm' },
    //{ label: '当前负载', value: '中 (65%)' },
    //{ label: '环境温度', value: '24.5°C' },
    //{ label: '环境湿度', value: '55 %RH' }, // Restored some items
  ];

  const sensorDetails = [
    { label: '传感器型号', value: 'VTall-S203L-1' },
    { label: '传感器ID', value: 'SN-VT203L1-01' },
    { label: '安装位置', value: '主轴承座 (驱动端)' }, // Restored detail
    { label: '通讯协议', value: 'Modbus RTU' },
    { label: '振动方向', value: 'X,Y,Z轴' }, // Restored
    { label: '振动量程', value: '±16g(X/Y), ±10g(Z)' },
    { label: '温度量程', value: '-40~125°C' },
    //{ label: '实时温度', value: '38.2°C' },
    { label: '通讯接口', value: 'RS485' }, // Restored
    { label: '防护等级', value: 'IP67' },
    //{ label: '工作状态', value: <Badge status="success" text={<span className="text-green-400 font-medium text-xs md:text-sm">在线</span>} /> },
    { label: '最后同步', value: '刚刚' }, // Restored
  ];

  return (
    // 主容器: 恢复 flex-1, 调整内边距和gap到合理水平
    <div className="flex-1 bg-[#141d2b] flex flex-col p-2 md:p-3 rounded-lg gap-2 md:gap-3 shadow-md h-full"> {/* Added h-full */}
      


      {/* 内容区：flex-1 填充高度, 调整min-h和gap */}
      <div className="flex flex-1 gap-2 md:gap-3 min-h-[260px] md:min-h-[280px]"> {/* Adjusted min-h */}
        
        <div className="w-1/4 lg:w-1/5 bg-[#1f2a38] rounded-md p-2 md:p-3 text-white shadow-sm flex flex-col">
          <h3 className="text-sm md:text-base font-semibold mb-2 text-sky-400 border-b border-sky-700 pb-1.5 flex-shrink-0"> 
            实验台参数
          </h3>
          {/* 调整字体和行间距到合理水平 */}
          <div className="space-y-1.5 text-xs md:text-sm overflow-y-auto flex-grow pr-1 tiny-scrollbar"> 
            {phmTestRigDetails.map(item => (
              <div key={item.label} className="flex justify-between items-start py-0.5">
                <span className="text-slate-400 whitespace-nowrap mr-1.5">{item.label}:</span>
                <span className="text-slate-100 text-right font-medium break-words">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 min-w-0 rounded-md overflow-hidden bg-black shadow-sm">
          <ThreeDModelViewer />
        </div>

        <div className="w-1/4 lg:w-1/5 bg-[#1f2a38] rounded-md p-2 md:p-3 text-white shadow-sm flex flex-col">
          <h3 className="text-sm md:text-base font-semibold mb-2 text-teal-400 border-b border-teal-700 pb-1.5 flex-shrink-0">
            传感器状态
          </h3>
          <div className="space-y-1.5 text-xs md:text-sm overflow-y-auto flex-grow pr-1 tiny-scrollbar">
             {sensorDetails.map(item => (
              <div key={item.label} className="flex justify-between items-start py-0.5">
                <span className="text-slate-400 whitespace-nowrap mr-1.5">{item.label}:</span>
                <span className="text-slate-100 text-right font-medium break-words">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeviceMainView;
// tiny-scrollbar CSS in comments from previous response can be used if desired