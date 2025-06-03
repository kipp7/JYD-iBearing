'use client';
import React, { useEffect, useState, useMemo } from 'react';
import { Card, Button, Row, Col, message, Select, Space } from 'antd'; // Removed Typography as it's no longer used directly for chart titles
import ReactECharts from 'echarts-for-react';
import { fetchSensorHistoryData, useSensorData } from '../hooks/useSensorData';

const DEVICE_ID = 'rk3568-01';

const ALL_AVAILABLE_KEYS = [
  'x_rms', 'y_rms', 'z_rms',
  'x_acc', 'y_acc', 'z_acc',
  'x_displacement', 'y_displacement', 'z_displacement',
];

const BEARING_FREQUENCY_CONFIG = { title: '轴承特征', keys: ['bpfi_x', 'bpfo_x', 'bsf_x'] };

const OTHER_DIAGNOSTIC_CONFIG = [
  { title: '故障诊断位', keys: ['diag_x', 'diag_y', 'diag_z'] },
  { title: '报警状态', keys: ['alarm_x', 'alarm_y', 'alarm_z'] },
];

const COLORS: { [key: string]: string } = {
  x_rms: '#5470C6',
  y_rms: '#91CC75',
  z_rms: '#EE6666',
  x_acc: '#73C0DE',
  y_acc: '#FAC858',
  z_acc: '#3BA272',
  x_displacement: '#FC8452',
  y_displacement: '#9A60B4',
  z_displacement: '#EA7CCC',
  diag_x: '#FF9C6E', diag_y: '#FFC069', diag_z: '#95DE64',
  alarm_x: '#FF7875', alarm_y: '#FFC53D', alarm_z: '#5CDBD3',
  bpfi_x: '#B37FEB', bpfo_x: '#FF85C0', bsf_x: '#FADB14',
};

const getUnit = (key: string) => {
  if (key.includes('rms')) return 'mm/s';
  if (key.includes('acc')) return 'm/s²';
  if (key.includes('displacement')) return 'μm';
  //if (key.includes('bpfi') || key.includes('bpfo') || key.includes('bsf')) return 'Hz';
  return '';
};

const ChartCardWrapper: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <Card
    style={{
      marginBottom: 16,
      backgroundColor: '#1f2a38',
      border: '1px solid #2c3e50',
      borderRadius: 10,
      color: '#ffffff',
      ...style,
    }}
    bodyStyle={{ padding: '16px' }}
  >
    {children}
  </Card>
);


const CombinedChart = ({ title, data, selectedKeys }: { title: string; data: any[]; selectedKeys: string[] }) => {
  if (!data || data.length === 0) {
    return (
      <ChartCardWrapper style={{ height: 350, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {title}: 暂无数据或等待数据加载...
      </ChartCardWrapper>
    );
  }

  const times = data.map((item) => new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

  const series = selectedKeys
    .filter(key => data[0]?.hasOwnProperty(key))
    .map((key) => ({
      name: key,
      type: 'line',
      data: data.map((item) => item[key] ?? null),
      smooth: true,
      symbol: 'none',
      lineStyle: { width: 2, color: COLORS[key] || '#ccc' },
      emphasis: { focus: 'series' },
    }));

  const option = {
    title: {
      text: title,
      left: 20,
      top: 10,
      textStyle: { color: '#ffffff', fontSize: 16, fontWeight: 'normal' },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      backgroundColor: 'rgba(20, 29, 43, 0.9)',
      borderColor: '#3c4a5c',
      textStyle: { color: '#E0E0E0' },
      formatter: (params: any[]) => {
        if (!params || params.length === 0) return '';
        let tooltipHtml = `${params[0].axisValueLabel}<br/>`;
        params.forEach(param => {
          if (param.value !== undefined && param.value !== null) {
            tooltipHtml += `${param.marker} ${param.seriesName}: ${param.value.toFixed(3)} ${getUnit(param.seriesName)}<br/>`;
          }
        });
        return tooltipHtml;
      }
    },
    legend: {
      data: selectedKeys.filter(key => data[0]?.hasOwnProperty(key)),
      top: 12,
      right: 20,
      textStyle: { color: '#ccc' },
      type: 'scroll',
      orient: 'horizontal',
      pageIconColor: '#aaa',
      pageIconInactiveColor: '#555',
      pageTextStyle: { color: '#ccc'}
    },
    grid: { top: 70, bottom: 60, left: 50, right: 30 },
    xAxis: {
      type: 'category',
      data: times,
      axisLabel: { color: '#ccc' },
      axisLine: { lineStyle: { color: '#555' } },
    },
    yAxis: {
      type: 'value',
      name: '综合数值',
      nameTextStyle: { color: '#ccc', padding: [0,0,0, -30] },
      axisLabel: { color: '#ccc', formatter: '{value}' },
      axisLine: { lineStyle: { color: '#555' } },
      splitLine: { lineStyle: { color: '#333' } },
    },
    dataZoom: [
      { type: 'slider', start: 0, end: 100, bottom: 10, height: 20, backgroundColor: 'rgba(70,85,100,0.3)', dataBackground:{ areaStyle: {color: '#5470C6'}}},
      { type: 'inside', start: 0, end: 100 },
    ],
    series,
    backgroundColor: 'transparent',
  };

  return (
    <ChartCardWrapper>
      <ReactECharts option={option} style={{ height: 350 }} notMerge={true} lazyUpdate={true} />
    </ChartCardWrapper>
  );
};

const WaveformChart = ({ title, keys, data, chartHeight = 250 }: { title: string; keys: string[]; data: any[]; chartHeight?: number }) => {
  if (!data || data.length === 0) {
    return (
      <ChartCardWrapper style={{ height: chartHeight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {title}: 暂无数据或等待数据加载...
      </ChartCardWrapper>
    );
  }
  const times = data.map((item: any) => new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

  const series = keys.map((key) => ({
    name: key,
    type: 'line',
    data: data.map((item: any) => item[key] ?? null),
    smooth: true,
    symbol: 'none',
    lineStyle: { color: COLORS[key] || '#999', width: 2 },
    emphasis: { focus: 'series' },
  }));

  const option = {
    title: {
      text: title,
      left: 20,
      top: 10,
      textStyle: { color: '#ffffff', fontSize: 16, fontWeight: 'normal' },
    },
    tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(20, 29, 43, 0.9)',
        borderColor: '#3c4a5c',
        textStyle: { color: '#E0E0E0' },
        formatter: (params: any[]) => {
            if (!params || params.length === 0) return '';
            let tooltipHtml = `${params[0].axisValueLabel}<br/>`;
            params.forEach(param => {
                 if (param.value !== undefined && param.value !== null) {
                    tooltipHtml += `${param.marker} ${param.seriesName}: ${typeof param.value === 'number' ? param.value.toFixed(3) : param.value} ${getUnit(param.seriesName)}<br/>`;
                 }
            });
            return tooltipHtml;
        }
    },
    legend: {
      data: keys,
      top: 12,
      right: 20,
      textStyle: { color: '#ccc' },
      type: 'scroll',
      orient: 'horizontal',
      pageIconColor: '#aaa',
      pageIconInactiveColor: '#555',
      pageTextStyle: { color: '#ccc'}
    },
    grid: { top: 70, bottom: 60, left: 50, right: 30 },
    xAxis: {
      type: 'category',
      data: times,
      axisLabel: { color: '#ccc' },
      axisLine: { lineStyle: { color: '#555' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#ccc' },
      axisLine: { lineStyle: { color: '#555' } },
      splitLine: { lineStyle: { color: '#333' } },
    },
    dataZoom: [
      { type: 'slider', start: 0, end: 100, bottom: 10, height: 20, backgroundColor: 'rgba(70,85,100,0.3)', dataBackground:{ areaStyle: {color: '#5470C6'}}},
      { type: 'inside', start: 0, end: 100 },
    ],
    series,
    backgroundColor: 'transparent',
  };

  return (
    <ChartCardWrapper>
      <ReactECharts option={option} style={{ height: chartHeight }} notMerge={true} lazyUpdate={true} />
    </ChartCardWrapper>
  );
};

const INITIAL_COMBINED_CHART_KEYS = [
  'x_rms', 'y_rms', 'z_rms',
  'x_acc', 'y_acc', 'z_acc',
  'x_displacement', 'y_displacement', 'z_displacement',
];

export default function ChartsDashboard() {
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [isCollecting, setIsCollecting] = useState(false);
  const [selectedCombinedKeys, setSelectedCombinedKeys] = useState<string[]>(INITIAL_COMBINED_CHART_KEYS);
  const latestData = useSensorData(DEVICE_ID, 3000);

  useEffect(() => {
    message.loading('正在加载初始历史数据...', 0);
    fetchSensorHistoryData(DEVICE_ID).then((data) => {
      setHistoryData(data || []);
      message.destroy();
      if (!data || data.length === 0) {
        message.info('未加载到初始历史数据。');
      } else {
        message.success('初始历史数据加载完成。');
      }
    }).catch(() => {
        message.destroy();
        message.error('加载初始历史数据失败。');
    });
  }, []);

  useEffect(() => {
    if (!isCollecting || !latestData) return;

    setHistoryData((prev) => {
      const incomingData = { ...latestData };
      const allExpectedKeys = [...ALL_AVAILABLE_KEYS, ...OTHER_DIAGNOSTIC_CONFIG.flatMap(g => g.keys), ...BEARING_FREQUENCY_CONFIG.keys];
      allExpectedKeys.forEach(key => {
        if (!(key in incomingData) || incomingData[key] === null || incomingData[key] === undefined ) {
          incomingData[key] = 0; 
        }
      });

      const updated = [ ...prev,incomingData]; 
      return updated.length > 300 ? updated.slice(-300) : updated;
    });
  }, [latestData, isCollecting]);

  const handleClick = (type: string) => {
    if (type === '采集') {
      setIsCollecting(true);
      message.success('开始实时采集数据');
    } else if (type === '暂停') {
      setIsCollecting(false);
      message.info('已暂停采集');
    } else if (type === '导出') {
      if (historyData.length === 0) {
        message.warning('没有数据可以导出');
        return;
      }
      const blob = new Blob([JSON.stringify(historyData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sensor_data_${DEVICE_ID}_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      message.success('数据已导出');
    }
  };

  const handleCombinedKeyChange = (value: string[]) => {
    setSelectedCombinedKeys(value);
  };

  const selectOptions = useMemo(() => {
    return ALL_AVAILABLE_KEYS.map(key => ({
      label: `${key.replace(/_/g, ' ').toUpperCase()} (${getUnit(key)})`,
      value: key,
    }));
  }, []);


  return (
    <div className="min-h-screen bg-[#101727] p-4 md:p-6">
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Card style={{backgroundColor: '#1f2a38', border: '1px solid #2c3e50', borderRadius: 10, marginBottom: 8 }}>
            <Row justify="space-between" align="middle" gutter={[16,16]}>
                <Col xs={24} md={12} lg={14}>
                    <Select
                        mode="multiple"
                        allowClear
                        style={{ width: '100%'}}
                        placeholder="选择字段以在综合图中显示"
                        value={selectedCombinedKeys}
                        onChange={handleCombinedKeyChange}
                        options={selectOptions}
                        maxTagCount="responsive"
                    />
                </Col>
                <Col xs={24} md={12} lg={10}>
                    <Space wrap style={{justifyContent: 'center'}}>
                        <Button
                            type="primary"
                            onClick={() => handleClick(isCollecting ? '暂停' : '采集')}
                            danger={isCollecting}
                        >
                            {isCollecting ? '停止采集' : '开始采集'}
                        </Button>
                        <Button onClick={() => handleClick('导出')}>导出数据</Button>
                    </Space>
                </Col>
            </Row>
        </Card>

        <CombinedChart
          title="实时数据综合对比"
          data={historyData}
          selectedKeys={selectedCombinedKeys}
        />

        <WaveformChart
          title={BEARING_FREQUENCY_CONFIG.title}
          keys={BEARING_FREQUENCY_CONFIG.keys}
          data={historyData}
          chartHeight={350}
        />
        
        {OTHER_DIAGNOSTIC_CONFIG.length > 0 && (
          <Row gutter={[16, 16]}>
            {OTHER_DIAGNOSTIC_CONFIG.map(({ title, keys }) => (
              <Col key={title} xs={24} sm={24} md={12}>
                <WaveformChart title={title} keys={keys} data={historyData} chartHeight={280} />
              </Col>
            ))}
          </Row>
        )}
      </Space>
    </div>
  );
}