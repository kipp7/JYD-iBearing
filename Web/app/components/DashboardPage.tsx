'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import LeftSidebar from '../components/LeftSidebar';
import RightSidebar from '../components/RightSidebar';
import DeviceMainView from '../components/DeviceMainView';
import BottomChartPanel from '../components/BottomChartPanel';
import FloatingMenu from '../components/FloatingMenu';

const DashboardPage = () => {
  const [currentTime, setCurrentTime] = useState<string>('');

  const updateTime = () => {
    const now = new Date();

    // 转换为北京时间（UTC+8）
    const beijingOffset = 8 * 60; // 北京为 UTC+8
    const localOffset = now.getTimezoneOffset(); // 本地时区偏移（单位分钟）
    const beijingTime = new Date(now.getTime() + (beijingOffset + localOffset) * 60 * 1000);

    const year = beijingTime.getFullYear();
    const month = String(beijingTime.getMonth() + 1).padStart(2, '0');
    const day = String(beijingTime.getDate()).padStart(2, '0');
    const hours = String(beijingTime.getHours()).padStart(2, '0');
    const minutes = String(beijingTime.getMinutes()).padStart(2, '0');
    const seconds = String(beijingTime.getSeconds()).padStart(2, '0');

    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
    const weekDay = weekDays[beijingTime.getDay()];

    const formatted = `${year}年${month}月${day}日 ${hours}:${minutes}:${seconds} | 星期${weekDay}`;
    setCurrentTime(formatted);
  };

  useEffect(() => {
    updateTime();
    const timer = setInterval(updateTime, 1000); // 每秒更新一次
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-screen h-screen bg-[#001529] flex flex-col overflow-hidden">
      {/* 顶部悬浮菜单 */}
      <FloatingMenu />

      {/* 顶部栏 */}
      <header className="h-20 px-6 md:px-8 flex items-center justify-between relative bg-[#1a2332] border-b border-[#2c3e50] shadow-xl">
        {/* 左侧主标题 */}
        <h1 className="text-base sm:text-lg font-semibold text-sky-400 hover:text-sky-300 transition-colors whitespace-nowrap tracking-tight z-10">
          iBearing智能轴承健康监测系统
        </h1>

        {/* 居中导航和核心标题组 */}
        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-stretch shadow-lg rounded-md overflow-hidden bg-slate-800/50 backdrop-blur-sm">
          <Link
            href="/video"
            className="text-xs sm:text-sm px-5 py-4 bg-slate-700/60 hover:bg-slate-600/80 text-slate-300 hover:text-sky-300 transition-colors duration-200 flex items-center justify-center whitespace-nowrap"
          >
            视频讲解
          </Link>

          <div className="relative px-8 sm:px-12 py-4 bg-black/70 border-x border-sky-500/30 flex items-center justify-center z-10">
            {/* 科技感边角装饰 */}
            <div className="absolute top-1.5 left-1.5 w-5 h-[2px] bg-sky-400 opacity-90"></div>
            <div className="absolute top-1.5 left-1.5 w-[2px] h-5 bg-sky-400 opacity-90"></div>
            <div className="absolute top-1.5 right-1.5 w-5 h-[2px] bg-sky-400 opacity-90"></div>
            <div className="absolute top-1.5 right-1.5 w-[2px] h-5 bg-sky-400 opacity-90"></div>
            <div className="absolute bottom-1.5 left-1.5 w-5 h-[2px] bg-sky-400 opacity-90"></div>
            <div className="absolute bottom-1.5 left-1.5 w-[2px] h-5 bg-sky-400 opacity-90"></div>
            <div className="absolute bottom-1.5 right-1.5 w-5 h-[2px] bg-sky-400 opacity-90"></div>
            <div className="absolute bottom-1.5 right-1.5 w-[2px] h-5 bg-sky-400 opacity-90"></div>

            <h2 className="text-lg sm:text-xl md:text-2xl font-extrabold tracking-wider text-sky-100 whitespace-nowrap relative z-20">
              智能轴承健康监测大屏
            </h2>
          </div>

          <Link
            href="/product"
            className="text-xs sm:text-sm px-5 py-4 bg-slate-700/60 hover:bg-slate-600/80 text-slate-300 hover:text-sky-300 transition-colors duration-200 flex items-center justify-center whitespace-nowrap"
          >
            产品介绍
          </Link>
        </div>

        {/* 右侧时间显示 */}
        <div className="text-xs sm:text-sm text-slate-400 hover:text-slate-300 transition-colors whitespace-nowrap z-10">
          {currentTime}
        </div>
      </header>

      {/* 主体区域 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧栏 */}
        <div className="flex-[1.2] min-w-[220px] max-w-[300px] px-2 py-2">
          <div className="bg-[#1f2a38] rounded-lg p-3 text-white shadow-md h-full">
            <LeftSidebar />
          </div>
        </div>

        {/* 中间主视图 */}
        <div className="flex-[3] px-4 py-2 flex flex-col gap-2 min-h-0">
          <div className="flex-1 min-h-0">
            <DeviceMainView />
          </div>
          <div className="h-[320px] min-h-[220px]">
            <BottomChartPanel />
          </div>
        </div>

        {/* 右侧栏 */}
        <div className="flex-[1.2] min-w-[220px] max-w-[300px] px-2 py-2">
          <div className="bg-[#1f2a38] rounded-lg p-3 text-white shadow-md h-full">
            <RightSidebar />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
