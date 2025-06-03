'use client';

import React, { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { Spin, Alert } from 'antd';
import { supabase } from '@/utils/supabase';
import * as echarts from 'echarts/core';

interface SensorDataRecord {
  timestamp: string;
  x_rms?: number;
  y_rms?: number;
  z_rms?: number;
  [key: string]: any;
}

async function fetchDeviceSensorHistory(deviceId: string): Promise<SensorDataRecord[]> {
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  const { data, error } = await supabase
    .from('sensor_data')
    .select('timestamp, x_rms, y_rms, z_rms')
    .eq('device_id', deviceId)
    .gte('timestamp', oneMonthAgo.toISOString())
    .order('timestamp', { ascending: true })
    .limit(500);

  if (error) {
    console.error('历史数据拉取失败:', error);
    throw error;
  }
  return (data as SensorDataRecord[]) || [];
}

const chartBaseColors = ['#00bcd4', '#8e44ad', '#2ecc71'];

const BottomChartPanel = () => {
  const deviceId = 'rk3568-01';

  const chartFields = [
    { title: 'X轴 RMS 趋势', field: 'x_rms', color: chartBaseColors[0] },
    { title: 'Y轴 RMS 趋势', field: 'y_rms', color: chartBaseColors[1] },
    { title: 'Z轴 RMS 趋势', field: 'z_rms', color: chartBaseColors[2] },
  ];

  const [chartOptions, setChartOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalOption, setModalOption] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const historyData = await fetchDeviceSensorHistory(deviceId);
        if (historyData.length === 0) {
          setError(`未找到设备 ${deviceId} 的历史数据。`);
          const emptyOptions = chartFields.map(cf => getChartOption([], [], cf.title, cf.color));
          setChartOptions(emptyOptions);
          setLoading(false);
          return;
        }

        const timestamps = historyData.map(d =>
          new Date(d.timestamp).toLocaleString('zh-CN', {
            hour12: false,
            timeZone: 'Asia/Shanghai',
          })
        );

        const newChartOptions = chartFields.map(cf => {
          const values = historyData.map(d => d[cf.field] ?? null);
          return getChartOption(timestamps, values, cf.title, cf.color);
        });

        setChartOptions(newChartOptions);
      } catch (err) {
        console.error(err);
        setError('数据加载失败，请稍后重试。');
        const emptyOptions = chartFields.map(cf => getChartOption([], [], cf.title, cf.color));
        setChartOptions(emptyOptions);
      } finally {
        setLoading(false);
      }
    };

    if (deviceId) loadData();
    else {
      setError("未提供有效的 deviceId。");
      setLoading(false);
    }
  }, [deviceId]);

  const getChartOption = (
    timestamps: string[],
    values: (number | null)[],
    title: string,
    color: string
  ) => ({
    title: {
      text: title,
      left: 'center',
      top: 10,
      textStyle: { color: '#fff', fontSize: 14 },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        label: {
          backgroundColor: '#6a7985',
        },
      },
    },
    grid: { left: '3%', right: '4%', top: '20%', bottom: '15%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: timestamps,
      axisLine: { lineStyle: { color: '#888' } },
      axisLabel: { color: '#ccc', fontSize: 10 },
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: '#888' }, show: true },
      axisLabel: { color: '#ccc', fontSize: 10, formatter: '{value}' },
      splitLine: { lineStyle: { color: '#3a4b5f' } },
    },
    series: [
      {
        name: title.split(' ')[0],
        type: 'line',
        smooth: true,
        data: values,
        itemStyle: { color: color },
        lineStyle: { color: color, width: 2 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            {
              offset: 0,
              color: `${color}B3`,
            },
            {
              offset: 1,
              color: `${color}1A`,
            },
          ]),
        },
        connectNulls: true,
      },
    ],
    dataZoom: [
      { type: 'inside', start: 0, end: 100 },
      {
        start: 0,
        end: 100,
        handleIcon:
          'M10.7,11.9v-1.3H9.3v1.3...（省略部分图标路径）',
        handleSize: '80%',
        handleStyle: {
          color: '#fff',
          shadowBlur: 3,
          shadowColor: 'rgba(0, 0, 0, 0.6)',
          shadowOffsetX: 2,
          shadowOffsetY: 2,
        },
        bottom: '3%',
        height: 20,
        borderColor: '#555',
      },
    ],
    backgroundColor: '#1e2a3a',
  });

  const openModal = (option: any) => {
    setModalOption(option);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setModalOption(null);
  };

  if (loading) {
    return (
      <Spin spinning={loading} size="large" tip="加载RMS趋势数据中...">
        <div className="bg-[#141d2b] px-4 py-3 text-center h-[250px] flex flex-col justify-center items-center" />
      </Spin>
    );
  }

  if (error) {
    return (
      <div className="bg-[#141d2b] px-4 py-3 h-[250px] flex flex-col justify-center items-center">
        <Alert message="错误" description={error} type="error" showIcon />
      </div>
    );
  }

  return (
    <div className="bg-[#141d2b] px-4 py-3 rounded-lg shadow-md">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 w-full">
        {chartOptions.map((option, idx) => (
          <div
            key={idx}
            className="bg-[#1e2a3a] rounded-xl p-2 shadow-inner hover:shadow-lg transition-transform hover:scale-[1.02] cursor-pointer min-h-[220px]"
            onClick={() => option && option.series[0].data.length > 0 && openModal(option)}
          >
            {option ? (
              <ReactECharts option={option} style={{ height: '280px', width: '100%' }} notMerge />
            ) : (
              <div className="flex justify-center items-center h-full text-slate-500">
                图表加载中...
              </div>
            )}
          </div>
        ))}
      </div>

      {modalVisible && modalOption && (
        <div
          className="fixed inset-0 bg-black bg-opacity-85 z-[1000] flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <div
            className="bg-[#1e2a3a] p-4 sm:p-6 rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeModal}
              className="absolute top-3 right-3 z-50 text-slate-300 hover:text-red-500 text-2xl sm:text-3xl leading-none"
              aria-label="关闭"
            >
              &times;
            </button>
            <div className="w-full h-full">
              <ReactECharts option={modalOption} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BottomChartPanel;
