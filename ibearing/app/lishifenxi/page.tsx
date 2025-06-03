'use client';

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import ReactECharts from 'echarts-for-react';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { fetchSensorHistoryData } from '../hooks/useSensorData';
import { Select, DatePicker, Button, message, Divider } from 'antd';

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

const { RangePicker } = DatePicker;

const mockDevices = ['rk3568-01'];

const colorPalette = [
  '#5470C6', '#91CC75', '#EE6666', '#73C0DE', '#3BA272',
  '#FC8452', '#9A60B4', '#EA7CCC', '#FFD700', '#00CED1',
];

// 字段单位映射
const fieldUnitMap: Record<string, string> = {
  x_acc: 'm/s²',
  x_rms: 'm/s²',
  y_rms: 'm/s²',
  z_rms: 'm/s²',
  y_acc: 'm/s²',
  z_acc: 'm/s²',
  vel_rms_x: 'mm/s',
  vel_rms_y: 'mm/s',
  vel_rms_z: 'mm/s',
  x_displacement: 'μm',
  y_displacement: 'μm',
  z_displacement: 'μm',
  fault_diag_x: '',
  fault_diag_y: '',
  fault_diag_z: '',
  bearing_freq_x: 'Hz',
  bearing_freq_y: 'Hz',
  bearing_freq_z: 'Hz',
  // 不需要单位的字段可空字符串
};

// 不展示的字段
const hiddenFields = [
  'id','diag_z','diag_x','diag_y',
  'alarm_temp', 'alarm_x', 'alarm_y', 'alarm_z',
  'channel_id_x', 'channel_id_y', 'channel_id_z',
  'rps', 'rps_x', 'rps_y', 'rps_z','risk_level','acc_peak_order_z','spd_peak_order','spd_peak_order_y','spd_peak_order_z',
  'acc_peak_order', 'acc_peak_order_y', 'acc_total_energy_z','bearing_bpfi_global','bearing_bpfo_global','bearing_bsf_global',
];

export default function LishifenxiPage() {
  const [device, setDevice] = useState<string>();
  const [dateRange, setDateRange] = useState<any>([dayjs().subtract(6, 'day'), dayjs()]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [rawData, setRawData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [allFields, setAllFields] = useState<string[]>([]);

  useEffect(() => {
    if (!device) return;

    fetchSensorHistoryData(device).then((data) => {
      setRawData(data || []);
      setFilteredData([]);

      if (data?.length) {
        const dynamicFields = Object.keys(data[0])
          .filter((key) => key !== 'timestamp' && key !== 'device_id' && !hiddenFields.includes(key));
        setAllFields(dynamicFields);
      }
    });
  }, [device]);

  useEffect(() => {
    if (!selectedKeys.length || !rawData.length) {
      setFilteredData([]);
      return;
    }

    const [start, end] = dateRange;

    const result = rawData
      .filter((item) => {
        const time = dayjs(item.timestamp);
        return time.isSameOrAfter(start) && time.isSameOrBefore(end);
      })
      .map((item) => {
        const res: any = { time: item.timestamp };
        selectedKeys.forEach((key) => {
          res[key] = item[key];
        });
        return res;
      });

    setFilteredData(result);
  }, [selectedKeys, dateRange, rawData]);

  const handleFilter = () => {
    if (!selectedKeys.length) {
      message.warning('请至少选择一个数据字段');
      return;
    }
    message.success('筛选成功');
  };

  const handleReset = () => {
    setDevice(undefined);
    setDateRange([dayjs().subtract(6, 'day'), dayjs()]);
    setSelectedKeys([]);
    setFilteredData([]);
    setRawData([]);
    setAllFields([]);
  };

  const handleExport = () => {
    if (!filteredData.length) {
      message.warning('无可导出的数据');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(filteredData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '历史数据');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([excelBuffer], { type: 'application/octet-stream' }), '历史数据.xlsx');
  };

  const createChartOption = (key: string) => {
    const unit = fieldUnitMap[key] || '';
    const displayName = unit ? `${key} (${unit})` : key;

    return {
      title: { text: `${key} 趋势图`, left: 'center' },
      tooltip: { trigger: 'axis' },
      legend: {
        data: [displayName],
        type: 'scroll',
        top: 30,
      },
      xAxis: {
        type: 'category',
        data: filteredData.map((d) => dayjs(d.time).format('MM-DD HH:mm')),
      },
      yAxis: {
        type: 'value',
        name: unit,
      },
      dataZoom: [
        { type: 'slider', start: 0, end: 100 },
        { type: 'inside', start: 0, end: 100 },
      ],
      series: [{
        name: displayName,
        type: 'line',
        data: filteredData.map((d) => d[key]),
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2 },
        itemStyle: {
          color: colorPalette[selectedKeys.indexOf(key) % colorPalette.length],
        },
      }],
    };
  };

  return (
    <div className="p-6 flex flex-col gap-6">
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <span>设备：</span>
          <Select
            style={{ width: 150 }}
            placeholder="选择设备"
            value={device}
            allowClear
            onChange={setDevice}
            options={mockDevices.map((d) => ({ label: d, value: d }))}
          />
        </div>

        <div className="flex items-center gap-2">
          <span>时间：</span>
          <RangePicker
            value={dateRange}
            onChange={setDateRange}
            allowClear
          />
        </div>

        <div className="flex items-center gap-2">
          <span>数据：</span>
          <div className="w-[300px]">
            <Select
              mode="multiple"
              style={{ width: '100%' }}
              placeholder="选择数据字段"
              value={selectedKeys}
              onChange={setSelectedKeys}
              dropdownRender={(menu) => (
                <>
                  <div style={{ padding: 4, display: 'flex', justifyContent: 'space-between' }}>
                    <Button size="small" onClick={() => setSelectedKeys(allFields)}>全选</Button>
                    <Button size="small" onClick={() => setSelectedKeys([])}>全部取消</Button>
                  </div>
                  <Divider style={{ margin: '4px 0' }} />
                  {menu}
                </>
              )}
              options={allFields.map((key) => ({ label: key, value: key }))}
              maxTagCount="responsive"
              dropdownStyle={{ maxHeight: 300, overflow: 'auto' }}
            />
          </div>
        </div>

        <Button type="primary" onClick={handleFilter}>查询</Button>
        <Button onClick={handleReset}>重置</Button>
        <Button onClick={handleExport}>导出 Excel</Button>
      </div>

      <div className="flex flex-wrap gap-6">
        {selectedKeys.map((key) => (
          <div key={key} className="bg-white rounded shadow p-4 w-full md:w-[48%] lg:w-[32%]">
            <ReactECharts option={createChartOption(key)} style={{ height: 400 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
