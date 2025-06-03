'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react'; // Added useMemo
import { Button, message, Modal } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import * as echarts from 'echarts';
import { useSensorData, fetchSensorHistoryData } from '@/app/hooks/useSensorData';
import MetricCard from '../zhendong/MetricCard'; // 或根据你的真实路径调整
 // 导入 MetricCard 组件

const DEVICE_ID = 'rk3568-01';

export default function VibrationAnalysis() {
  // 状态变量
  const [accX, setAccX] = useState(0);
  const [accY, setAccY] = useState(0);
  const [accZ, setAccZ] = useState(0);
  const [rmsX, setRmsX] = useState(0);
  const [rmsY, setRmsY] = useState(0);
  const [rmsZ, setRmsZ] = useState(0);
  const [displacementX, setDisplacementX] = useState(0);
  const [displacementY, setDisplacementY] = useState(0);
  const [displacementZ, setDisplacementZ] = useState(0);
  const [peakFrequency, setPeakFrequency] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState(true);
  const [currentTime, setCurrentTime] = useState('');
  const [modalInfo, setModalInfo] = useState<{ freq: number; amp: number; isAnomaly: boolean } | null>(null);
  const [isAnalysisStarted, setIsAnalysisStarted] = useState(false);

  const spectrumChartRef = useRef<echarts.ECharts | null>(null);
  const trendChartRef = useRef<echarts.ECharts | null>(null);
  const trendChartElementRef = useRef<HTMLDivElement | null>(null);

  const latestSensorData = useSensorData(DEVICE_ID, 3000);

  useEffect(() => {
    // console.log('获取到的最新传感器数据 (latestSensorData):', latestSensorData); // 取消注释以调试
  }, [latestSensorData]);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleString());
    };
    updateClock();
    const clockInterval = setInterval(updateClock, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  useEffect(() => {
    const spectrumChartDom = document.getElementById('spectrum-chart');
    const trendChartDom = document.getElementById('trend-chart');
    if (trendChartDom) {
        trendChartElementRef.current = trendChartDom as HTMLDivElement;
    }

    if (spectrumChartDom) {
      spectrumChartRef.current = echarts.init(spectrumChartDom);
      const spectrumOption: echarts.EChartsOption = {
        tooltip: {
          trigger: 'axis',
          formatter: (params: any) => {
            const data = params[0];
            return `频率: ${data.data[0].toFixed(2)} Hz<br/>振幅: ${data.data[1].toFixed(3)} mm/s`;
          },
        },
        xAxis: { type: 'value', min: 0, max: 100, splitNumber: 10, axisLabel: { formatter: '{value} Hz' } },
        yAxis: { type: 'value', min: 0, axisLabel: { formatter: '{value} mm/s' } },
        dataZoom: [{ type: 'inside', throttle: 50 }, { type: 'slider', height: 20 }],
        series: [
          { name: '频谱曲线', type: 'line', smooth: true, symbol: 'none', lineStyle: { width: 2, color: '#3b82f6' }, areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(59, 130, 246, 0.5)' }, { offset: 1, color: 'rgba(59, 130, 246, 0.1)' }])}, data: [] },
          { name: '异常点', type: 'scatter', symbol: 'circle', symbolSize: 8, itemStyle: { color: 'red' }, data: [] }
        ],
        animation: true, // 频谱图动画通常可以保留
      };
      spectrumChartRef.current.setOption(spectrumOption);
      spectrumChartRef.current.on('click', function (params: any) {
        if (params.componentType === 'series' && params.data) {
          const [freq, amp] = params.data;
          const isAnomaly = params.seriesName === '异常点';
          setModalInfo({ freq, amp, isAnomaly });
        }
      });
    }

    if (trendChartDom) {
      trendChartRef.current = echarts.init(trendChartDom);
      const initialTrendOption: echarts.EChartsOption = {
        tooltip: { trigger: 'axis', formatter: (params: any) => `时间: ${new Date(params[0].value[0]).toLocaleString()}<br/>${params[0].seriesName}: ${params[0].value[1].toFixed(3)} mm/s`},
        xAxis: { type: 'time' },
        yAxis: { type: 'value', name: 'X轴 RMS (mm/s)' },
        series: [{ name: 'X轴 RMS 实时趋势', type: 'line', smooth: true, symbol: 'none', data: [], animation: false }], // 实时趋势禁用动画
      };
      trendChartRef.current.setOption(initialTrendOption);
    }

    return () => {
      spectrumChartRef.current?.dispose();
      trendChartRef.current?.dispose();
    };
  }, []);

  useEffect(() => {
    if (latestSensorData && typeof latestSensorData === 'object' && latestSensorData.timestamp) {
      setAccX(latestSensorData.x_acc || 0);
      setAccY(latestSensorData.y_acc || 0);
      setAccZ(latestSensorData.z_acc || 0);
      setRmsX(latestSensorData.x_rms || 0);
      setRmsY(latestSensorData.y_rms || 0);
      setRmsZ(latestSensorData.z_rms || 0);
      setDisplacementX(latestSensorData.x_displacement || 0);
      setDisplacementY(latestSensorData.y_displacement || 0);
      setDisplacementZ(latestSensorData.z_displacement || 0);

      if (spectrumChartRef.current && latestSensorData.spectrum_payload) {
        const spectrumData = latestSensorData.spectrum_payload;
        spectrumChartRef.current.setOption({
          series: [
            { data: spectrumData.normal || [] },
            { data: spectrumData.anomaly || [] },
          ],
        });

        let maxAmp = 0;
        let pkFreq = 0;
        const allPoints = [...(spectrumData.normal || []), ...(spectrumData.anomaly || [])];
        allPoints.forEach(point => {
          if (point[1] > maxAmp) {
            maxAmp = point[1];
            pkFreq = point[0];
          }
        });
        setPeakFrequency(pkFreq);
      } else if (spectrumChartRef.current && !latestSensorData.spectrum_payload) {
        // console.warn("实时数据中缺少 spectrum_payload 字段。");
        spectrumChartRef.current.setOption({ series: [{ data: [] }, { data: [] }]});
        setPeakFrequency(0);
      }

      const isHistoricalMode = trendChartElementRef.current?.dataset.historicalMode === 'true';
      if (trendChartRef.current && !isHistoricalMode && latestSensorData.x_rms !== undefined) {
        const trendChart = trendChartRef.current;
        const currentOption = trendChart.getOption();
        const seriesZero = (currentOption.series as any[])?.[0];

        if (seriesZero && Array.isArray(seriesZero.data)) {
            let currentTrendData = seriesZero.data;
            const newPoint = [new Date(latestSensorData.timestamp).getTime(), latestSensorData.x_rms];
            currentTrendData = [...currentTrendData, newPoint];
            
            if (currentTrendData.length > 100) { // 保留最近100个数据点
                currentTrendData = currentTrendData.slice(currentTrendData.length - 100);
            }
            trendChart.setOption({
                series: [{ data: currentTrendData }] // 只更新数据
            });
        }
      }

      if (!connectionStatus) {
        setConnectionStatus(true);
        message.success('数据连接已恢复');
      }

    } else if (latestSensorData === null && connectionStatus) {
      setConnectionStatus(false);
      message.error('数据连接断开或获取失败', 3);
      setAccX(0); setAccY(0); setAccZ(0);
      setRmsX(0); setRmsY(0); setRmsZ(0);
      setDisplacementX(0); setDisplacementY(0); setDisplacementZ(0);
      setPeakFrequency(0);
    }
  }, [latestSensorData, connectionStatus]);

  const handleReconnect = () => {
    message.info('尝试重新连接...');
    if (!latestSensorData) {
        setConnectionStatus(true);
    }
  };

  const startAnalysis = async () => {
    setIsAnalysisStarted(true);
    message.loading('正在加载历史数据...', 0);

    if (trendChartElementRef.current) {
      trendChartElementRef.current.dataset.historicalMode = 'true';
    }

    try {
      const historyData = await fetchSensorHistoryData(DEVICE_ID);
      // console.log('获取到的历史数据 (historyData):', historyData);
      message.destroy();

      if (trendChartRef.current && historyData && historyData.length > 0) {
        const xRmsPoints = historyData.map(item => [new Date(item.timestamp).getTime(), item.x_rms || 0]);
        const yRmsPoints = historyData.map(item => [new Date(item.timestamp).getTime(), item.y_rms || 0]);
        const zRmsPoints = historyData.map(item => [new Date(item.timestamp).getTime(), item.z_rms || 0]);
        const xAccPoints = historyData.map(item => [new Date(item.timestamp).getTime(), item.x_acc || 0]);
        const yAccPoints = historyData.map(item => [new Date(item.timestamp).getTime(), item.y_acc || 0]);
        const zAccPoints = historyData.map(item => [new Date(item.timestamp).getTime(), item.z_acc || 0]);
        
        trendChartRef.current.setOption({
          tooltip: {
            trigger: 'axis',
            formatter: (params: any[]) => {
              let res = `时间: ${new Date(params[0].value[0]).toLocaleString()}<br/>`;
              params.forEach(item => {
                let unit = '';
                if (item.seriesName.includes('RMS')) unit = 'mm/s';
                else if (item.seriesName.includes('加速度')) unit = 'g';
                res += `${item.marker}${item.seriesName}: ${item.value[1].toFixed(3)} ${unit}<br/>`;
              });
              return res;
            }
          },
          legend: {
            data: ['X轴 RMS', 'Y轴 RMS', 'Z轴 RMS', 'X轴 加速度', 'Y轴 加速度', 'Z轴 加速度'],
            bottom: 0,
            type: 'scroll', // 允许图例滚动
          },
          xAxis: { type: 'time' },
          yAxis: { type: 'value', name: '数值' },
          dataZoom: [
            { type: 'inside', throttle: 50 },
            { type: 'slider', height: 20, bottom: 30 },
          ],
          series: [
            { name: 'X轴 RMS', type: 'line', smooth: true, symbol: 'none', data: xRmsPoints, lineStyle: { color: '#5470C6' }, large: true, largeThreshold: 500 },
            { name: 'Y轴 RMS', type: 'line', smooth: true, symbol: 'none', data: yRmsPoints, lineStyle: { color: '#91CC75' }, large: true, largeThreshold: 500 },
            { name: 'Z轴 RMS', type: 'line', smooth: true, symbol: 'none', data: zRmsPoints, lineStyle: { color: '#FAC858' }, large: true, largeThreshold: 500 },
            { name: 'X轴 加速度', type: 'line', smooth: true, symbol: 'none', data: xAccPoints, lineStyle: { color: '#EE6666' }, large: true, largeThreshold: 500 },
            { name: 'Y轴 加速度', type: 'line', smooth: true, symbol: 'none', data: yAccPoints, lineStyle: { color: '#73C0DE' }, large: true, largeThreshold: 500 },
            { name: 'Z轴 加速度', type: 'line', smooth: true, symbol: 'none', data: zAccPoints, lineStyle: { color: '#3BA272' }, large: true, largeThreshold: 500 },
          ],
          animation: false, // 历史数据加载禁用动画
        }, true);
        message.success('历史数据加载完成');
      } else if (historyData && historyData.length === 0) {
        message.info('未找到该设备的历史数据');
        trendChartRef.current?.setOption({ series: [], legend: {data:[]} }, true);
      } else {
         message.error('加载历史数据失败或数据格式不正确');
      }
    } catch (error) {
      console.error("获取历史趋势数据失败:", error);
      message.destroy();
      message.error('获取历史趋势数据失败');
      setIsAnalysisStarted(false);
      if (trendChartElementRef.current) {
        delete trendChartElementRef.current.dataset.historicalMode;
      }
    }
  };

  const resetAnalysis = () => {
    setIsAnalysisStarted(false);
    if (trendChartElementRef.current) {
      delete trendChartElementRef.current.dataset.historicalMode;
    }

    if (trendChartRef.current) {
      trendChartRef.current.setOption({
        tooltip: { trigger: 'axis', formatter: (params: any) => `时间: ${new Date(params[0].value[0]).toLocaleString()}<br/>${params[0].seriesName}: ${params[0].value[1].toFixed(3)} mm/s`},
        legend: { data: [] },
        xAxis: { type: 'time' },
        yAxis: { type: 'value', name: 'X轴 RMS (mm/s)' },
        series: [{ name: 'X轴 RMS 实时趋势', type: 'line', smooth: true, symbol: 'none', data: [], animation: false }], // 实时趋势禁用动画
        dataZoom: [],
      }, true);
      message.info('已恢复实时趋势显示。');
    }
  };

  // 使用 useMemo 优化指标卡片数据的创建
  const metricCardItems = useMemo(() => [
    { label: 'X轴 RMS', value: `${rmsX.toFixed(3)} mm/s` },
    { label: 'Y轴 RMS', value: `${rmsY.toFixed(3)} mm/s` },
    { label: 'Z轴 RMS', value: `${rmsZ.toFixed(3)} mm/s` },
    { label: 'X轴 加速度', value: `${accX.toFixed(3)} g` },
    { label: 'Y轴 加速度', value: `${accY.toFixed(3)} g` },
    { label: 'Z轴 加速度', value: `${accZ.toFixed(3)} g` },
    { label: 'X轴 位移 (p-p)', value: `${displacementX.toFixed(1)} µm` },
    { label: 'Y轴 位移 (p-p)', value: `${displacementY.toFixed(1)} µm` },
    { label: 'Z轴 位移 (p-p)', value: `${displacementZ.toFixed(1)} µm` },
    { label: '峰值频率', value: `${peakFrequency.toFixed(2)} Hz` },
  ], [rmsX, rmsY, rmsZ, accX, accY, accZ, displacementX, displacementY, displacementZ, peakFrequency]);


  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 bg-gray-50 min-h-screen">
      {/* 状态栏 */}
      <div className="flex justify-between items-center bg-white shadow rounded p-3 md:p-4">
        <div className="text-sm md:text-base text-gray-700">{currentTime}</div>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${connectionStatus ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-xs md:text-sm text-gray-700">{connectionStatus ? '已连接' : '未连接'}</span>
          <Button icon={<ReloadOutlined />} onClick={handleReconnect} size="small" disabled={connectionStatus}>
            重新连接
          </Button>
        </div>
      </div>

      {/* 指标卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {metricCardItems.map((item) => (
          <MetricCard key={item.label} label={item.label} value={item.value} />
        ))}
      </div>

      {/* 第一个图表：实时振动频谱分析 */}
      <div className="bg-white p-4 rounded shadow h-80 md:h-96">
        <h3 className="font-semibold mb-2 text-gray-800">实时振动频谱分析</h3>
        <div id="spectrum-chart" className="w-full h-[calc(100%-2.5rem)]" />
      </div>

      {/* 第二个图表：趋势分析 (实时或历史) */}
      <div className="bg-white p-4 rounded shadow h-80 md:h-96">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-2 gap-2">
          <h3 className="font-semibold text-gray-800 text-center sm:text-left">
            {isAnalysisStarted ? "历史数据分析 (RMS & 加速度)" : "实时趋势分析 (X轴 RMS)"}
          </h3>
          <div className="flex gap-2 sm:gap-4">
            <Button type="primary" onClick={startAnalysis} disabled={isAnalysisStarted} size="small">
              分析历史数据
            </Button>
            <Button onClick={resetAnalysis} disabled={!isAnalysisStarted} size="small">
              查看实时趋势
            </Button>
          </div>
        </div>
        <div id="trend-chart" ref={trendChartElementRef} className="w-full h-[calc(100%-4.5rem)] sm:h-[calc(100%-3.5rem)]" />
      </div>

      {/* 返回按钮 */}
      <div className="flex justify-center mt-6 mb-4">
        <Button type="default" onClick={() => (window.location.href = '/')} size="middle">
          返回主界面
        </Button>
      </div>

      {/* 点击频率点弹窗 */}
      <Modal
        open={!!modalInfo}
        onCancel={() => setModalInfo(null)}
        footer={null}
        title="频率点详情"
      >
        {modalInfo && (
          <div className="space-y-2">
            <div>频率 (Hz): <span className="font-semibold">{modalInfo.freq.toFixed(2)}</span></div>
            <div>振幅 (mm/s): <span className="font-semibold">{modalInfo.amp.toFixed(3)}</span></div>
            {modalInfo.isAnomaly && (
              <div className="text-red-500 font-semibold mt-2">⚠️ 监测到异常点</div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}