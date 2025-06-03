'use client';

import React, { useState, useEffect } from 'react';
import { Button, Input, Radio, DatePicker, Table, Tag, Space, message, Popconfirm, Select, Spin } from 'antd';
import { DeleteOutlined, EditOutlined, CheckOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { createClient } from '@supabase/supabase-js';

dayjs.extend(isBetween);

const { RangePicker } = DatePicker;
const { Option } = Select;

const statusOptions = ['计划中', '待维修', '维修中', '已完成'];
const statusColorMap: Record<string, string> = {
  '维修中': 'blue',
  '待维修': 'orange',
  '计划中': 'gold',
  '已完成': 'green',
};

interface MaintenanceRecord {
  id?: string; // UUID from Supabase
  device: string | null;
  sub_device: string | null;
  repair_time: string | null; // ISO string for timestampz
  operator: string | null;
  content: string | null;
  status: string | null;
  created_at?: string;
  editable?: boolean; // UI state, not in DB
  key?: string; // AntD table key
}

// Supabase Client Setup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase URL or Anon Key is missing. Please check your .env.local file.");
}

const supabase = createClient(supabaseUrl!, supabaseAnonKey!);

export default function WeihuweixiuPage() {
  const [data, setData] = useState<MaintenanceRecord[]>([]);
  const [filters, setFilters] = useState<{ device: string; operator: string; dateRange: [Dayjs, Dayjs] | null }>({
    device: '',
    operator: '',
    dateRange: null,
  });
  const [loading, setLoading] = useState(false);
  const [queryPerformed, setQueryPerformed] = useState(false);
  const [availableDevices, setAvailableDevices] = useState<string[]>([]);

  useEffect(() => {
    const fetchDeviceIds = async () => {
      setLoading(true);
      try {
        const { data: sensorDataDevices, error: sensorDataError } = await supabase
          .from('sensor_data')
          .select('device_id');

        if (sensorDataError) throw sensorDataError;

        const { data: sensorDiagnosisDevices, error: diagnosisError } = await supabase
          .from('sensor_diagnosis')
          .select('device_id');

        if (diagnosisError) throw diagnosisError;

        const allDeviceIds = [
          ...(sensorDataDevices?.map((d: { device_id: string }) => d.device_id) || []),
          ...(sensorDiagnosisDevices?.map((d: { device_id: string }) => d.device_id) || [])
        ];
        
        const uniqueDeviceIds = Array.from(new Set(allDeviceIds.filter(id => id != null))) as string[];
        setAvailableDevices(uniqueDeviceIds.sort());

      } catch (error: any) {
        message.error(`获取设备列表失败: ${error.message}`);
      } finally {
        // Ensure loading is set to false after fetching device IDs
        setLoading(false); 
      }
    };

    fetchDeviceIds();
    // Initial data load can be triggered here if needed, e.g.:
    // handleQuery(); 
    // Or keep it user-triggered only.
  }, []);

  const handleQuery = async () => {
    setLoading(true);
    setQueryPerformed(true);
    try {
      let query = supabase.from('maintenance_records').select('*').order('created_at', { ascending: false });

      if (filters.device) {
        query = query.ilike('device', `%${filters.device}%`);
      }
      if (filters.operator) {
        query = query.ilike('operator', `%${filters.operator}%`);
      }
      if (filters.dateRange && filters.dateRange.length === 2) {
        query = query.gte('repair_time', filters.dateRange[0].toISOString());
        query = query.lte('repair_time', filters.dateRange[1].endOf('day').toISOString());
      }

      const { data: records, error } = await query;

      if (error) {
        throw error;
      }
      setData(records?.map((rec: MaintenanceRecord) => ({ ...rec, key: rec.id, editable: false })) || []);
    } catch (error: any) {
      message.error(`查询失败: ${error.message}`);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFilters({ device: '', operator: '', dateRange: null });
    setData([]);
    setQueryPerformed(false);
  };

  const addEmptyRecord = () => {
    const newRecord: MaintenanceRecord = {
      key: `new-${Date.now()}`,
      id: undefined,
      device: availableDevices.length > 0 ? availableDevices[0] : '',
      sub_device: '',
      repair_time: dayjs().toISOString(),
      operator: '',
      content: '',
      status: '计划中',
      editable: true,
    };
    setData((prev) => [newRecord, ...prev]);
  };

  const handleEdit = (key: string) => {
    setData((prev) =>
      prev.map((item) => (item.key === key ? { ...item, editable: true } : item))
    );
  };

  const handleSave = async (key: string) => {
    setLoading(true);
    const recordToSave = data.find((item) => item.key === key);
    if (!recordToSave) {
      message.error('未找到要保存的记录');
      setLoading(false);
      return;
    }

    const { editable, key: recordKey, ...dbRecord } = recordToSave;
    
    const recordForDb = {
      ...dbRecord,
      device: dbRecord.device || null,
      sub_device: dbRecord.sub_device || null,
      operator: dbRecord.operator || null,
      content: dbRecord.content || null,
      repair_time: dbRecord.repair_time ? dayjs(dbRecord.repair_time).toISOString() : null,
      status: dbRecord.status || null,
    };

    try {
      if (recordToSave.id) {
        const { error } = await supabase
          .from('maintenance_records')
          .update(recordForDb)
          .eq('id', recordToSave.id);
        if (error) throw error;
        setData((prev) =>
          prev.map((item) => (item.key === key ? { ...recordToSave, id: recordToSave.id, key: recordToSave.id, editable: false } : item))
        );
        message.success('记录更新成功');
      } else {
        const { data: newRecords, error } = await supabase
          .from('maintenance_records')
          .insert(recordForDb)
          .select();

        if (error) throw error;
        if (newRecords && newRecords.length > 0) {
          const savedRecord = { ...newRecords[0], key: newRecords[0].id, editable: false };
          setData((prev) =>
            prev.map((item) => (item.key === key ? savedRecord : item))
          );
          message.success('记录新增成功');
        } else {
          throw new Error('未能获取新增记录');
        }
      }
    } catch (error: any) {
      message.error(`保存失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (key: string) => {
    setLoading(true);
    const recordToDelete = data.find(item => item.key === key);
    if (!recordToDelete || !recordToDelete.id) {
      if (recordToDelete && recordToDelete.key?.startsWith('new-')) {
        setData((prev) => prev.filter((item) => item.key !== key));
        message.info('新增记录已移除');
      } else {
        message.error('无法删除该记录，ID 不存在或记录未保存');
      }
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.from('maintenance_records').delete().eq('id', recordToDelete.id);
      if (error) throw error;
      setData((prev) => prev.filter((item) => item.key !== key));
      message.success('记录删除成功');
    } catch (error: any) {
      message.error(`删除失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key: string, field: keyof MaintenanceRecord, value: any) => {
    setData((prev) =>
      prev.map((item) => (item.key === key ? { ...item, [field]: value } : item))
    );
  };
  
  const columns = [
    {
      title: '设备',
      dataIndex: 'device',
      key: 'device',
      render: (text: string | null, record: MaintenanceRecord) =>
        record.editable ? (
          <Select
            showSearch
            value={text}
            onChange={(value: string) => handleChange(record.key!, 'device', value)}
            style={{ width: '100%' }}
            placeholder="选择或搜索设备"
            optionFilterProp="children"
            filterOption={(input: string, option?: { label: string; value: string; children?: React.ReactNode }) =>
              (option?.children as unknown as string ?? option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={availableDevices.map(devId => ({ label: devId, value: devId, children: devId }))}
          />
        ) : (
          text
        ),
    },
    {
      title: '子设备',
      dataIndex: 'sub_device',
      key: 'sub_device',
      render: (text: string | null, record: MaintenanceRecord) =>
        record.editable ? (
          <Input value={text ?? ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange(record.key!, 'sub_device', e.target.value)} />
        ) : (
          text
        ),
    },
    {
      title: '维修时间',
      dataIndex: 'repair_time',
      key: 'repair_time',
      render: (text: string | null, record: MaintenanceRecord) =>
        record.editable ? (
          <DatePicker
            showTime
            value={text ? dayjs(text) : null}
            onChange={(date: Dayjs | null, dateString: string | string[]) => handleChange(record.key!, 'repair_time', dateString as string)}
            style={{ width: '100%' }}
          />
        ) : (
          text ? dayjs(text).format('YYYY-MM-DD HH:mm:ss') : ''
        ),
    },
    {
      title: '操作人',
      dataIndex: 'operator',
      key: 'operator',
      render: (text: string | null, record: MaintenanceRecord) =>
        record.editable ? (
          <Input value={text ?? ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange(record.key!, 'operator', e.target.value)} />
        ) : (
          text
        ),
    },
    {
      title: '维修内容',
      dataIndex: 'content',
      key: 'content',
      width: 200,
      render: (text: string | null, record: MaintenanceRecord) =>
        record.editable ? (
          <Input.TextArea rows={2} value={text ?? ''} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleChange(record.key!, 'content', e.target.value)} />
        ) : (
          text
        ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string | null, record: MaintenanceRecord) =>
        record.editable ? (
          <Select
            value={status}
            onChange={(value: string) => handleChange(record.key!, 'status', value)}
            style={{ width: '100%' }}
          >
            {statusOptions.map(opt => <Option key={opt} value={opt}>{opt}</Option>)}
          </Select>
        ) : (
          status ? <Tag color={statusColorMap[status] || 'default'}>{status}</Tag> : null
        ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right' as 'right',
      render: (_: any, record: MaintenanceRecord) => (
        <Space>
          {record.editable ? (
            <Button
              type="link"
              icon={<CheckOutlined />}
              onClick={() => handleSave(record.key!)}
              size="small"
            >
              保存
            </Button>
          ) : (
            <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record.key!)} size="small">
              编辑
            </Button>
          )}
          <Popconfirm
            title="确认删除该记录？"
            onConfirm={() => handleDelete(record.key!)}
            okText="是"
            cancelText="否"
            disabled={record.editable || !record.id}
          >
            <Button danger type="link" icon={<DeleteOutlined />} size="small" disabled={record.editable || !record.id}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Spin spinning={loading} tip="加载中...">
      <div className="h-screen flex flex-col p-4 bg-gray-100">
        {/* 筛选区域 */}
        <div className="p-4 mb-4 border border-gray-200 bg-white rounded-lg shadow flex flex-wrap items-center gap-4">
          <Input
            placeholder="按设备名称筛选"
            value={filters.device}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilters({ ...filters, device: e.target.value })}
            style={{ width: 180 }}
            allowClear
          />
          <RangePicker
            style={{ width: 280 }}
            value={filters.dateRange}
            onChange={(dates: [Dayjs, Dayjs] | null, dateStrings: [string, string]) => setFilters({ ...filters, dateRange: dates })}
          />
          <Input
            placeholder="操作人"
            value={filters.operator}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilters({ ...filters, operator: e.target.value })}
            style={{ width: 150 }}
            allowClear
          />
          <Button type="primary" onClick={handleQuery}>
            查询
          </Button>
          <Button onClick={handleReset}>重置</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={addEmptyRecord} className="ml-auto">
            新增维修计划
          </Button>
        </div>

        {/* 表格展示区域 */}
        <div className="flex-1 overflow-auto p-4 bg-white rounded-lg shadow transition-all duration-300 ease-in-out">
          <Table
            columns={columns}
            dataSource={data}
            pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: ['10', '20', '50'] }}
            locale={{ emptyText: queryPerformed && data.length === 0 ? '没有找到符合条件的记录' : '请先进行查询以展示结果，或新增维修计划。' }}
            rowClassName="hover:bg-gray-50 transition-colors"
            scroll={{ x: 1200 }}
            sticky
          />
        </div>
      </div>
    </Spin>
  );
}
