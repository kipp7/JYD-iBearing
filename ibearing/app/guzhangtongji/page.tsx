'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Button,
  Select,
  DatePicker,
  Table,
  message,
  Spin,
  Row,
  Col,
  Card,
  Statistic,
  Empty,
  Space,
  Tag,
  Modal,
} from 'antd';
import { DownloadOutlined, SearchOutlined, ReloadOutlined, RobotOutlined } from '@ant-design/icons';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import dayjs, { Dayjs } from 'dayjs';
import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import ReactMarkdown from 'react-markdown';

const { RangePicker } = DatePicker;
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

interface DiagnosisRecord {
  id: string;
  device_id: string;
  timestamp: string;
  risk_level: 'normal' | 'waning' | 'danger' | string | null;
  fault_location: string | null;
  reasons: string | null;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#FF69B4', '#BA55D3'];

export default function GuzhangTongjiPage() {
  const [isClient, setIsClient] = useState(false);
  const [loading, setLoading] = useState(true);
  const [devices, setDevices] = useState<Device[]>([]);
  
  // Filters
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>([
    dayjs().subtract(30, 'days'), 
    dayjs()
  ]);
  const [selectedRiskLevels, setSelectedRiskLevels] = useState<string[]>([]);
  const [selectedFaultLocations, setSelectedFaultLocations] = useState<string[]>([]);

  // Data stores
  const [diagnosisData, setDiagnosisData] = useState<DiagnosisRecord[]>([]);
  const [uniqueRiskLevels, setUniqueRiskLevels] = useState<string[]>([]);
  const [uniqueFaultLocations, setUniqueFaultLocations] = useState<string[]>([]);

  // AI Diagnosis States
  const [isAiDiagnoseModalOpen, setIsAiDiagnoseModalOpen] = useState(false);
  const [aiDiagnosisResult, setAiDiagnosisResult] = useState<string | null>(null);
  const [aiDiagnoseLoading, setAiDiagnoseLoading] = useState(false);
  const [currentDiagnosingRecord, setCurrentDiagnosingRecord] = useState<DiagnosisRecord | null>(null);

  // Statistics & Chart data
  const [totalFaults, setTotalFaults] = useState(0);
  const [dangerFaults, setDangerFaults] = useState(0);
  const [waningFaults, setWaningFaults] = useState(0);
  const [faultLocationCounts, setFaultLocationCounts] = useState<{ name: string; value: number }[]>([]);
  const [riskLevelCounts, setRiskLevelCounts] = useState<{ name: string; value: number }[]>([]); 

  const dailyFaultChartData = useMemo(() => {
    if (!diagnosisData || diagnosisData.length === 0) return [];
    const dailyCounts: Record<string, number> = {};
    diagnosisData.forEach(d => {
        const date = dayjs(d.timestamp).format('YYYY-MM-DD');
        dailyCounts[date] = (dailyCounts[date] || 0) + 1;
    });
    return Object.entries(dailyCounts).map(([name, value]) => ({name, value})).sort((a,b) => dayjs(a.name).diff(dayjs(b.name)));
  }, [diagnosisData]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    const fetchDevices = async () => {
      setLoading(true); // Combined loading for devices and initial data
      try {
        const { data: sdDevices, error: sdErr } = await supabase.from('sensor_data').select('device_id').limit(1000);
        if (sdErr) throw sdErr;
        const { data: dxDevices, error: dxErr } = await supabase.from('sensor_diagnosis').select('device_id').limit(1000);
        if (dxErr) throw dxErr;

        const allDeviceIds = [
          ...(sdDevices?.map((d: any) => d.device_id) || []),
          ...(dxDevices?.map((d: any) => d.device_id) || [])
        ];
        const uniqueDeviceIds = Array.from(new Set(allDeviceIds.filter(id => id != null))) as string[];
        setDevices(uniqueDeviceIds.map(id => ({ id })));
      } catch (error: any) {
        message.error(`获取设备列表失败: ${error.message}`);
      } finally {
        // setLoading(false); // Loading will be managed by handleQuery after devices are fetched
      }
    };
    fetchDevices();
  }, [isClient]);

  const processStatistics = useCallback((data: DiagnosisRecord[]) => {
    setTotalFaults(data.length);
    setDangerFaults(data.filter(d => d.risk_level === 'danger').length);
    setWaningFaults(data.filter(d => d.risk_level === 'waning').length);

    const faultLocCounts: Record<string, number> = {};
    const riskLvlCounts: Record<string, number> = {};
    const uRiskLevels = new Set<string>();
    const uFaultLocs = new Set<string>();

    data.forEach(d => {
      const loc = d.fault_location || '未知位置';
      faultLocCounts[loc] = (faultLocCounts[loc] || 0) + 1;
      if(d.fault_location) uFaultLocs.add(d.fault_location);

      const risk = d.risk_level || '未知等级';
      riskLvlCounts[risk] = (riskLvlCounts[risk] || 0) + 1;
      if(d.risk_level) uRiskLevels.add(d.risk_level);
    });

    setFaultLocationCounts(Object.entries(faultLocCounts).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value));
    setRiskLevelCounts(Object.entries(riskLvlCounts).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value));
    
    setUniqueRiskLevels(Array.from(uRiskLevels).sort());
    setUniqueFaultLocations(Array.from(uFaultLocs).sort());
  }, []);

  const handleQuery = useCallback(async (showLoadingSpinner = true) => {
    if (!dateRange || !dateRange[0] || !dateRange[1]) {
      message.warning('请选择时间范围');
      return;
    }
    if(showLoadingSpinner) setLoading(true);
    try {
      let query = supabase.from('sensor_diagnosis').select('*');
      if (selectedDeviceId) {
        query = query.eq('device_id', selectedDeviceId);
      }
      if (selectedRiskLevels.length > 0) {
        query = query.in('risk_level', selectedRiskLevels);
      }
      if (selectedFaultLocations.length > 0) {
        query = query.in('fault_location', selectedFaultLocations);
      }
      query = query.gte('timestamp', dateRange[0].startOf('day').toISOString());
      query = query.lte('timestamp', dateRange[1].endOf('day').toISOString());
      query = query.order('timestamp', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      
      const records = (data as DiagnosisRecord[]) || [];
      setDiagnosisData(records);
      processStatistics(records);

    } catch (error: any) {
      message.error(`查询故障数据失败: ${error.message}`);
      setDiagnosisData([]);
      processStatistics([]);
    } finally {
      if(showLoadingSpinner) setLoading(false);
    }
  }, [selectedDeviceId, dateRange, selectedRiskLevels, selectedFaultLocations, processStatistics]);

  useEffect(() => {
    if (isClient && dateRange && dateRange[0] && dateRange[1]) {
        handleQuery(devices.length === 0); // Show spinner if devices are still loading or first query
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClient, dateRange, selectedDeviceId, selectedRiskLevels, selectedFaultLocations]); // Re-query if any filter changes
  
  const handleReset = () => {
    setSelectedDeviceId(undefined);
    setDateRange([dayjs().subtract(30, 'days'), dayjs()]);
    setSelectedRiskLevels([]);
    setSelectedFaultLocations([]);
    // Data will be refetched by the useEffect watching filters
  };

  const handleExportExcel = () => {
    if (diagnosisData.length === 0) {
      message.warning('没有数据可导出');
      return;
    }
    const exportData = diagnosisData.map((item) => ({
      '设备ID': item.device_id,
      '时间': dayjs(item.timestamp).format('YYYY-MM-DD HH:mm:ss'),
      '风险等级': item.risk_level,
      '故障位置': item.fault_location,
      '原因/详情': item.reasons,
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '故障诊断记录');
    XLSX.writeFile(workbook, '故障诊断记录.xlsx');
  };

  const handleAiDiagnose = async (record: DiagnosisRecord) => {
    setCurrentDiagnosingRecord(record);
    setAiDiagnoseLoading(true);
    setAiDiagnosisResult(null); // Clear previous results
    setIsAiDiagnoseModalOpen(true);

    try {
      const response = await fetch('/nextjs-api/diagnose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(record), // Send the whole record
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
        throw new Error(errorData.error || `AI诊断请求失败，状态码: ${response.status}`);
      }

      const data = await response.json();
      setAiDiagnosisResult(data.diagnosis);
    } catch (error: any) {
      console.error("AI Diagnosis Error:", error);
      message.error(`AI诊断失败: ${error.message}`);
      setAiDiagnosisResult(`获取AI诊断结果失败: ${error.message}`); // Show error in modal as well
    } finally {
      setAiDiagnoseLoading(false);
    }
  };

  const columns = [
    { title: '设备ID', dataIndex: 'device_id', key: 'device_id', width: 150, fixed: 'left' as 'left' },
    { title: '时间', dataIndex: 'timestamp', key: 'timestamp', render: (ts: string) => dayjs(ts).format('YYYY-MM-DD HH:mm:ss'), width: 180, defaultSortOrder: 'descend' as 'descend', sorter: (a: DiagnosisRecord, b: DiagnosisRecord) => dayjs(a.timestamp).unix() - dayjs(b.timestamp).unix() },
    { title: '风险等级', dataIndex: 'risk_level', key: 'risk_level', width: 100, render: (level: string) => <Tag color={level === 'danger' ? 'red' : level === 'waning' ? 'orange' : 'green'}>{level || 'N/A'}</Tag>},
    { title: '故障位置', dataIndex: 'fault_location', key: 'fault_location', width: 150, render: (loc: string) => loc || '未知' },
    { title: '原因/详情', dataIndex: 'reasons', key: 'reasons', width: 300 },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right' as 'right',
      render: (_: any, record: DiagnosisRecord) => (
        <Button icon={<RobotOutlined />} size="small" onClick={() => handleAiDiagnose(record)}>AI诊断</Button>
      ),
    },
  ];

  if (!isClient) {
    // Return null to render nothing on the server and during initial client-side hydration mismatch phase.
    // The actual content will render once isClient becomes true after useEffect.
    return null; 
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-300 shadow-lg rounded-md">
          <p className="label text-sm text-gray-700">{`日期 : ${label}`}</p>
          <p className="intro text-blue-600 font-semibold">{`${payload[0].name} : ${payload[0].value}`}</p>
          {/* <p className="desc">Anything you want to add.</p> */}
        </div>
      );
    }
    return null;
  };

  return (
    <Spin spinning={loading} tip="加载中...">
      <div className="p-6 bg-gray-50 min-h-screen flex flex-col gap-6">
        <Card>
          <Space wrap size={[16, 16]}>
            <span>设备:</span>
            <Select
              allowClear showSearch placeholder="选择设备 (全部)"
              value={selectedDeviceId} onChange={setSelectedDeviceId} style={{ width: 180 }}
            >
              {devices.map((dev) => (<Option key={dev.id} value={dev.id}>{dev.id}</Option>))}
            </Select>
            <span>时间范围:</span>
            <RangePicker value={dateRange} onChange={(dates: [Dayjs, Dayjs] | null, dateStrings: [string, string]) => setDateRange(dates as [Dayjs, Dayjs] | null)} />
            <span>风险等级:</span>
            <Select mode="multiple" allowClear placeholder="选择风险等级 (全部)"
              value={selectedRiskLevels} onChange={setSelectedRiskLevels} style={{ minWidth: 180, maxWidth:300 }}
              options={uniqueRiskLevels.map(lvl => ({label: lvl, value: lvl}))}
            />
            <span>故障位置:</span>
             <Select mode="multiple" allowClear placeholder="选择故障位置 (全部)"
              value={selectedFaultLocations} onChange={setSelectedFaultLocations} style={{ minWidth: 180, maxWidth:300 }}
              options={uniqueFaultLocations.map(loc => ({label: loc, value: loc}))}
            />
            <Button icon={<SearchOutlined />} onClick={() => handleQuery(true)} type="primary">查询</Button>
            <Button icon={<ReloadOutlined />} onClick={handleReset}>重置</Button>
            <Button icon={<DownloadOutlined />} onClick={handleExportExcel}>导出Excel</Button>
          </Space>
        </Card>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8} lg={6}><Card><Statistic title="总故障记录数" value={totalFaults} /></Card></Col>
          <Col xs={24} sm={12} md={8} lg={6}><Card><Statistic title="危险故障 (Danger)" value={dangerFaults} valueStyle={{ color: '#cf1322' }} /></Card></Col>
          <Col xs={24} sm={12} md={8} lg={6}><Card><Statistic title="衰退/警告故障 (Waning)" value={waningFaults} valueStyle={{ color: '#faad14' }} /></Card></Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={8}>
            <Card title="故障类型分布 (按位置)">
              {faultLocationCounts.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={faultLocationCounts} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={true} /* label prop removed for default behavior or rely on legend/tooltip */ >
                      {faultLocationCounts.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : <Empty description="无故障位置数据" />}
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card title="风险等级分布">
              {riskLevelCounts.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={riskLevelCounts} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={true} /* label prop removed */ >
                       {riskLevelCounts.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : <Empty description="无风险等级数据" />}
            </Card>
          </Col>
           <Col xs={24} lg={8}>
            <Card title={selectedDeviceId ? `${selectedDeviceId} - 每日故障次数` : "每日总故障次数"}>
              {dailyFaultChartData.length > 0 ? (
                 <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dailyFaultChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis allowDecimals={false}/>
                        <Tooltip content={<CustomTooltip />} wrapperStyle={{ outline: 'none' }} />
                        <Legend />
                        <Bar dataKey="value" fill="#8884d8" name="故障数" />
                    </BarChart>
                 </ResponsiveContainer>
              ) : <Empty description="无每日故障数据" />}
            </Card>
          </Col>
        </Row>
        
        <Card title="故障诊断详细记录">
          <Table
            columns={columns}
            dataSource={diagnosisData.map(d => ({ ...d, key: d.id }))}
            pagination={{ 
              pageSize: 10, 
              showSizeChanger: true, 
              showTotal: (total: number, range: [number, number]) => `${range[0]}-${range[1]} 共 ${total} 条` 
            }}
            scroll={{ x: 1200, y: 400 }}
            size="small"
            rowKey="id"
          />
        </Card>

        {/* AI Diagnosis Modal */}
        <Modal
          title={currentDiagnosingRecord ? `AI 诊断: 设备 ${currentDiagnosingRecord.device_id}` : "AI 诊断结果"}
          open={isAiDiagnoseModalOpen}
          onOk={() => setIsAiDiagnoseModalOpen(false)}
          onCancel={() => setIsAiDiagnoseModalOpen(false)}
          width="70%"
          footer={[
            <Button key="close" onClick={() => setIsAiDiagnoseModalOpen(false)}>
              关闭
            </Button>,
          ]}
          maskClosable={false}
        >
          {aiDiagnoseLoading ? (
            <div style={{ textAlign: 'center', padding: '50px 0' }}>
              <Spin tip="AI诊断中，请稍候..." size="large" spinning={true}>
                <div style={{ minHeight: 50, width: '100%' }} />
              </Spin>
            </div>
          ) : aiDiagnosisResult ? (
            <ReactMarkdown
              components={{
                p: ({ node, ...props }) => <p className="prose max-w-none" {...props} />,
              }}
            >
              {aiDiagnosisResult}
            </ReactMarkdown>
          ) : (
            <Empty description="暂无诊断结果或加载失败" />
          )}
        </Modal>

      </div>
    </Spin>
  );
}
