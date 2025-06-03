'use client';

import React from 'react';
import TimeDomainUpload from './TimeDomainUpload';

export default function WaveAnalysisPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4 text-white">时域分析 - 原始数据文件上传与可视化</h1>
      <TimeDomainUpload />
    </div>
  );
}
