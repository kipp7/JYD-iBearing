"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Select, Spin, message, Table, Tag, Card, Descriptions, Row, Col, Statistic, Empty } from 'antd';
import * as echarts from 'echarts';
import dayjs from 'dayjs';
import { createClient } from '@supabase/supabase-js';

const { Option } = Select;

// Supabase Client Setup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase URL or Anon Key is missing. Please check your .env.local file.");
}
const supabase = createClient(supabaseUrl!, supabaseAnonKey!);

interface Device {
  id: string;
}

interface SensorData {
  id?: string;
  device_id?: string;
  timestamp?: string;
  x_rms?: number | null;
  y_rms?: number | null;
  z_rms?: number | null;
  x_acc_kurtosis?: number | null;
  y_acc_kurtosis?: number | null;
  z_acc_kurtosis?: number | null;
  bpfi_x?: number | null;
  bpfo_x?: number | null;
  bsf_x?: number | null;
  bpfi_y?: number | null;
  bpfo_y?: number | null;
  bsf_y?: number | null;
  bpfi_z?: number | null;
  bpfo_z?: number | null;
  bsf_z?: number | null;
  // Add other relevant sensor_data fields if needed
}

interface DiagnosisData {
  id?: string;
  device_id?: string;
  timestamp?: string;
  risk_level?: 'normal' | 'waning' | 'danger' | string | null; // Allow string for flexibility initially
  fault_location?: '内圈故障' | '外圈故障' | '滚动体故障' | string | null; // Allow string
  reasons?: string | null;
  // Add other relevant sensor_diagnosis fields
}

interface HealthStatus {
  score: number;
  description: string;
  color: string;
}

// --- Helper Functions ---
const calculateHealthStatus = (
  latestDiagnosis?: DiagnosisData | null,
  // latestSensorData?: SensorData | null // Reserved for future use with thresholds
): HealthStatus => {
  let score = 100;
  let descriptionParts: string[] = [];

  if (!latestDiagnosis) {
    return { score: 75, description: '诊断数据不足', color: 'gold' };
  }

  // Rule 1: Based on risk_level
  switch (latestDiagnosis.risk_level) {
    case 'normal':
      descriptionParts.push('风险等级正常');
      break;
    case 'waning':
      score -= 30;
      descriptionParts.push('风险等级衰退/警告');
      break;
    case 'danger':
      score -= 70;
      descriptionParts.push('风险等级危险');
      break;
    default:
      descriptionParts.push('风险等级未知');
      score -= 5; // Small penalty for unknown risk level
      break;
  }

  // Rule 2: Based on fault_location
  if (latestDiagnosis.fault_location) {
    descriptionParts.push(`故障位置: ${latestDiagnosis.fault_location}`);
    switch (latestDiagnosis.fault_location) {
      case '内圈故障':
        score -= 20;
        break;
      case '外圈故障':
        score -= 20;
        break;
      case '滚动体故障':
        score -= 25;
        break;
      // Add other fault locations if necessary
    }
  } else {
     descriptionParts.push('故障位置未明确');
  }
  
  score = Math.max(0, score); // Ensure score doesn't go below 0

  let statusDescription = '未知';
  let color = 'grey';

  if (score >= 90) {
    statusDescription = '优秀';
    color = 'green';
  } else if (score >= 70) {
    statusDescription = '良好';
    color = 'lime';
  } else if (score >= 50) {
    statusDescription = '一般/关注';
    color = 'gold';
  } else if (score >= 30) {
    statusDescription = '预警';
    color = 'orange';
  } else {
    statusDescription = '危险';
    color = 'red';
  }
  
  descriptionParts.push(`综合评估: ${statusDescription}`);

  return { score, description: descriptionParts.join('; '), color };
};


const riskLevelToNumber = (riskLevel: DiagnosisData['risk_level']): number => {
  switch (riskLevel) {
    case 'normal': return 1;
    case 'waning': return 2;
    case 'danger': return 3;
    default: return 0; // For unknown or null
  }
};

// --- Component ---
export default function JiankangYucePage() {
  const [loading, setLoading] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  const [latestDiagnosis, setLatestDiagnosis] = useState<DiagnosisData | null>(null);
  const [latestSensorData, setLatestSensorData] = useState<SensorData | null>(null);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  
  const [historicalDiagnosis, setHistoricalDiagnosis] = useState<DiagnosisData[]>([]);
  const historyChartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  // Fetch available devices
  useEffect(() => {
    const fetchDevices = async () => {
      setLoading(true);
      try {
        const { data: sensorDataDevices, error: sError } = await supabase
          .from('sensor_data')
          .select('device_id')
          .limit(500); // Limit to avoid fetching too much if many devices

        if (sError) throw sError;

        const { data: diagnosisDevices, error: dError } = await supabase
          .from('sensor_diagnosis')
          .select('device_id')
          .limit(500);

        if (dError) throw dError;

        const allDeviceIds = [
          ...(sensorDataDevices?.map((d: any) => d.device_id) || []),
          ...(diagnosisDevices?.map((d: any) => d.device_id) || [])
        ];
        const uniqueDeviceIds = Array.from(new Set(allDeviceIds.filter(id => id != null))) as string[];
        setDevices(uniqueDeviceIds.map(id => ({ id })));
        if (uniqueDeviceIds.length > 0) {
          setSelectedDeviceId(uniqueDeviceIds[0]); // Auto-select first device
        }
      } catch (error: any) {
        message.error(`获取设备列表失败: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchDevices();
  }, []);

  // Fetch data when selectedDeviceId changes
  useEffect(() => {
    if (!selectedDeviceId) return;

    const fetchDataForDevice = async () => {
      setLoading(true);
      try {
        // Fetch latest diagnosis
        const { data: diagnosis, error: diagError } = await supabase
          .from('sensor_diagnosis')
          .select('*')
          .eq('device_id', selectedDeviceId)
          .order('timestamp', { ascending: false })
          .limit(1)
          .maybeSingle(); // Returns single object or null

        if (diagError) throw diagError;
        setLatestDiagnosis(diagnosis as DiagnosisData | null);

        // Fetch latest sensor data
        const { data: sensor, error: sensorError } = await supabase
          .from('sensor_data')
          .select('timestamp, x_rms, y_rms, z_rms, x_acc_kurtosis, y_acc_kurtosis, z_acc_kurtosis, bpfi_x, bpfo_x, bsf_x, bpfi_y, bpfo_y, bsf_y, bpfi_z, bpfo_z, bsf_z')
          .eq('device_id', selectedDeviceId)
          .order('timestamp', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (sensorError) throw sensorError;
        setLatestSensorData(sensor as SensorData | null);
        
        // Calculate health status
        setHealthStatus(calculateHealthStatus(diagnosis as DiagnosisData | null));

        // Fetch historical diagnosis for chart & table (e.g., last 20 records)
        const { data: history, error: historyError } = await supabase
          .from('sensor_diagnosis')
          .select('timestamp, risk_level, fault_location, reasons')
          .eq('device_id', selectedDeviceId)
          .order('timestamp', { ascending: false })
          .limit(20);

        if (historyError) throw historyError;
        setHistoricalDiagnosis((history as DiagnosisData[] || []).reverse()); // Reverse for chronological chart

      } catch (error: any) {
        message.error(`获取设备 ${selectedDeviceId} 数据失败: ${error.message}`);
        setLatestDiagnosis(null);
        setLatestSensorData(null);
        setHealthStatus(null);
        setHistoricalDiagnosis([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDataForDevice();
  }, [selectedDeviceId]);

  // Initialize/Update ECharts
 useEffect(() => {
    if (historyChartRef.current) {
      if (!chartInstance.current) {
        chartInstance.current = echarts.init(historyChartRef.current);
      }
      
      const chartData = historicalDiagnosis.map(d => ({
        time: dayjs(d.timestamp).format('MM-DD HH:mm'),
        risk: riskLevelToNumber(d.risk_level),
        tooltip: `风险: ${d.risk_level || 'N/A'}\\n位置: ${d.fault_location || 'N/A'}\\n原因: ${d.reasons || 'N/A'}`
      }));

      const option = {
        tooltip: {
          trigger: 'axis',
          confine: true,
          formatter: (params: any) => {
            const dataPoint = chartData[params[0].dataIndex];
            return `${params[0].name}<br/>${dataPoint.tooltip}`;
          }
        },
        xAxis: {
          type: 'category',
          data: chartData.map(d => d.time),
        },
        yAxis: {
          type: 'value',
          name: '风险等级',
          min: 0, // normal, waning, danger mapped to 1,2,3. 0 for unknown
          max: 4, 
          axisLabel: {
            formatter: (value: number) => {
              if (value === 1) return '正常';
              if (value === 2) return '衰退';
              if (value === 3) return '危险';
              if (value === 0) return '未知';
              return '';
            }
          }
        },
        series: [
          {
            name: '风险趋势',
            type: 'line',
            smooth: true,
            data: chartData.map(d => d.risk),
            areaStyle: {},
            lineStyle: { color: "#3b82f6" },
            itemStyle: { color: "#3b82f6" },
            markPoint: { // Highlight last point
              data: chartData.length > 0 ? [{
                name: '最新',
                coord: [chartData[chartData.length - 1].time, chartData[chartData.length - 1].risk]
              }] : []
            }
          },
        ],
        dataZoom: [{ type: 'inside' }, { type: 'slider' }],
        grid: { left: '3%', right: '4%', bottom: '10%', containLabel: true }
      };
      chartInstance.current.setOption(option, true); // true to not merge with previous option
    }
    // Resize chart with window
    const handleResize = () => chartInstance.current?.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      // chartInstance.current?.dispose(); // Dispose on component unmount if not needed elsewhere
      // chartInstance.current = null;
    };
  }, [historicalDiagnosis]);


  const historyTableColumns = [
    { title: '时间', dataIndex: 'timestamp', key: 'timestamp', render: (ts: string) => dayjs(ts).format('YYYY-MM-DD HH:mm:ss') },
    { title: '风险等级', dataIndex: 'risk_level', key: 'risk_level', render: (level: string) => <Tag color={level === 'danger' ? 'red' : level === 'waning' ? 'orange' : 'green'}>{level || 'N/A'}</Tag> },
    { title: '故障位置', dataIndex: 'fault_location', key: 'fault_location', render: (loc: string) => loc || 'N/A' },
    { title: '原因/详情', dataIndex: 'reasons', key: 'reasons', render: (rs: string) => rs || 'N/A' },
  ];

  return (
    <Spin spinning={loading} tip="加载中...">
      <div className="p-4 bg-gray-50 min-h-screen flex flex-col gap-4">
        <Card>
          <Row gutter={16} align="middle">
            <Col>选择设备:</Col>
            <Col flex="auto">
              <Select
                style={{ width: '100%', maxWidth: 300 }}
                value={selectedDeviceId}
                onChange={setSelectedDeviceId}
                loading={loading && devices.length === 0}
                disabled={loading && devices.length === 0}
                showSearch
                optionFilterProp="children"
              >
                {devices.map(device => (
                  <Option key={device.id} value={device.id}>{device.id}</Option>
                ))}
              </Select>
            </Col>
          </Row>
        </Card>

        {!selectedDeviceId && !loading && <Card><Empty description="请先选择一个设备" /></Card>}
        
        {selectedDeviceId && (
          <Row gutter={[16, 16]}>
            {/* Left Column: Health Status & Diagnosis */}
            <Col xs={24} lg={8}>
              <Card title="当前健康评估" className="h-full">
                {healthStatus ? (
                  <div className="text-center">
                     <Statistic title="健康评分" value={healthStatus.score} suffix="/ 100" valueStyle={{ color: healthStatus.color, fontSize: '2.5em' }} />
                     <p className="mt-2 text-gray-600">{healthStatus.description}</p>
                  </div>
                ) : <Empty description="健康评估数据不足" />}
              </Card>
            </Col>

            {/* Middle Column: Latest Diagnosis Details */}
            <Col xs={24} lg={8}>
              <Card title="最新诊断详情" className="h-full">
                {latestDiagnosis ? (
                  <Descriptions bordered column={1} size="small">
                    <Descriptions.Item label="诊断时间">{dayjs(latestDiagnosis.timestamp).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
                    <Descriptions.Item label="风险等级">
                      <Tag color={latestDiagnosis.risk_level === 'danger' ? 'red' : latestDiagnosis.risk_level === 'waning' ? 'orange' : 'green'}>
                        {latestDiagnosis.risk_level || 'N/A'}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="故障位置">{latestDiagnosis.fault_location || '未明确'}</Descriptions.Item>
                    <Descriptions.Item label="诊断原因/详情">{latestDiagnosis.reasons || 'N/A'}</Descriptions.Item>
                  </Descriptions>
                ) : <Empty description="无最新诊断数据" />}
              </Card>
            </Col>
            
            {/* Right Column: Latest Sensor Data */}
            <Col xs={24} lg={8}>
                <Card title="最新关键传感器特征值" className="h-full">
                    {latestSensorData ? (
                        <Descriptions bordered column={1} size="small" layout="horizontal">
                            <Descriptions.Item label="数据时间">{dayjs(latestSensorData.timestamp).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
                            <Descriptions.Item label="X轴 RMS">{latestSensorData.x_rms?.toFixed(3) ?? 'N/A'}</Descriptions.Item>
                            <Descriptions.Item label="Y轴 RMS">{latestSensorData.y_rms?.toFixed(3) ?? 'N/A'}</Descriptions.Item>
                            <Descriptions.Item label="Z轴 RMS">{latestSensorData.z_rms?.toFixed(3) ?? 'N/A'}</Descriptions.Item>
                            <Descriptions.Item label="X轴峭度(Acc)">{latestSensorData.x_acc_kurtosis?.toFixed(3) ?? 'N/A'}</Descriptions.Item>
                            <Descriptions.Item label="Y轴峭度(Acc)">{latestSensorData.y_acc_kurtosis?.toFixed(3) ?? 'N/A'}</Descriptions.Item>
                            <Descriptions.Item label="Z轴峭度(Acc)">{latestSensorData.z_acc_kurtosis?.toFixed(3) ?? 'N/A'}</Descriptions.Item>
                            <Descriptions.Item label="X轴 BPFI">{latestSensorData.bpfi_x?.toFixed(3) ?? 'N/A'}</Descriptions.Item>
                            <Descriptions.Item label="X轴 BPFO">{latestSensorData.bpfo_x?.toFixed(3) ?? 'N/A'}</Descriptions.Item>
                            <Descriptions.Item label="X轴 BSF">{latestSensorData.bsf_x?.toFixed(3) ?? 'N/A'}</Descriptions.Item>
                             {/* Add Y and Z axis for BPFI/O/SF if needed */}
                        </Descriptions>
                    ) : <Empty description="无最新传感器数据" />}
                </Card>
            </Col>
          </Row>
        )}
        
        {selectedDeviceId && (
          <Row gutter={[16, 16]} className="mt-4">
            {/* Chart */}
            <Col xs={24} lg={12}>
              <Card title="历史风险趋势">
                <div ref={historyChartRef} style={{ width: '100%', height: 400 }} />
              </Card>
            </Col>
            {/* Historical Diagnosis Table */}
            <Col xs={24} lg={12}>
              <Card title="历史诊断记录">
                <Table
                  columns={historyTableColumns}
                  dataSource={historicalDiagnosis.map((d, i)=> ({...d, key: d.id || `hist-${i}`}))}
                  pagination={{ pageSize: 5 }}
                  size="small"
                  scroll={{ y: 300 }}
                />
              </Card>
            </Col>
          </Row>
        )}
      </div>
    </Spin>
  );
}
