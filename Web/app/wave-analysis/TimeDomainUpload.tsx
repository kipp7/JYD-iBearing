'use client';

import React, { useState } from 'react';
import {
  Upload,
  Button,
  Form,
  Input,
  message,
  Card,
  Progress,
} from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import TimeChartCard from './TimeChartCard';

const { Dragger } = Upload;

export default function TimeDomainUpload() {
  const [samplingRate, setSamplingRate] = useState<number | null>(null);
  const [windowSize, setWindowSize] = useState<number>(200);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileList, setFileList] = useState<any[]>([]);
  const [charts, setCharts] = useState<JSX.Element[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number>(0);

  const handleStartAnalysis = async () => {
  if (!selectedFile) {
    message.error('请先选择文件');
    return;
  }

  setUploading(true);
  setProgress(30);

  const formData = new FormData();
  formData.append('file', selectedFile);
  if (samplingRate) {
    formData.append('samplingRate', samplingRate.toString());
  }
  formData.append('window', windowSize.toString());

  try {
    // 同时请求 analyze 和 vmd
    const [analyzeRes, vmdRes] = await Promise.all([
      fetch('/api/analyze', { method: 'POST', body: formData }),
      fetch('/api/vmd', { method: 'POST', body: formData }),
    ]);

    setProgress(70);

    if (!analyzeRes.ok) {
      const errJson = await analyzeRes.json();
      throw new Error(errJson?.error || 'analyze 接口错误');
    }
    if (!vmdRes.ok) {
      const errJson = await vmdRes.json();
      throw new Error(errJson?.error || 'vmd 接口错误');
    }

    const analyzeResult = await analyzeRes.json();
    const vmdResult = await vmdRes.json();

    console.log('从 /api/analyze 获取到的数据:', analyzeResult);
    console.log('从 /api/vmd 获取到的数据:', vmdResult);

    if (!analyzeResult.success || !vmdResult.success)
      throw new Error('分析失败');

    const mergedResults = [...analyzeResult.results, ...vmdResult.results];

    const plots = mergedResults
      .filter((series: any) =>
        ['waveform', 'rms', 'stat', 'moving_mean', 'moving_std', 'vmd_time'].includes(series.type)
      )
      .map((series: any, idx: number) => (
        <TimeChartCard
          key={idx}
          type={series.type}
          axis={series.axis}
          data={series.data}
          windowSize={windowSize}
          length={series.length}
        />
      ));

    setCharts(plots);
    message.success('文件上传并分析成功');
  } catch (err: any) {
    console.error(err);
    message.error(err.message || '上传或分析失败');
  } finally {
    setProgress(100);
    setTimeout(() => setProgress(0), 1000);
    setUploading(false);
  }
};


  const handleReset = () => {
    setSelectedFile(null);
    setFileList([]);
    setCharts([]);
    setSamplingRate(null);
    setWindowSize(200);
    setProgress(0);
    message.info('已重置所有内容');
  };

  return (
    <div className="p-4">
      <Card title={null} className="mb-4">
        <Form layout="vertical">
          <Form.Item label="上传文件（支持 .csv / .txt）">
            <div style={{ marginBottom: 8, color: '#1890ff' }}>
              当前平台最多支持上传 <strong>100MB</strong> 的文件，超出将无法处理。
            </div>
            <Dragger
              accept=".csv,.txt"
              beforeUpload={(file) => {
                const maxSizeMB = 100;
                const isTooLarge = file.size / 1024 / 1024 > maxSizeMB;
                if (isTooLarge) {
                  message.error(`文件大小超过限制（${maxSizeMB}MB），请压缩或截取后再上传`);
                  return Upload.LIST_IGNORE;
                }
                setSelectedFile(file);
                setFileList([file]);
                message.success(`已选择文件：${file.name}`);
                return false;
              }}
              fileList={fileList}
              onRemove={() => {
                setSelectedFile(null);
                setFileList([]);
              }}
              showUploadList={true}
              disabled={uploading}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">
                拖拽或点击上传原始数据文件，选择后点击下方“开始分析”
              </p>
            </Dragger>
            {progress > 0 && <Progress percent={progress} showInfo />}
          </Form.Item>

          <Form.Item label="采样率（Hz，可选）">
            <Input
              disabled={uploading}
              placeholder="如文件不含采样率列，可在此输入"
              type="number"
              min={1}
              value={samplingRate ?? ''}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (isNaN(val) || val <= 0) {
                  message.warning('采样率必须为正数，将使用默认值');
                  setSamplingRate(null);
                } else {
                  setSamplingRate(val);
                }
              }}
            />
          </Form.Item>

          <Form.Item label="滑动窗口大小（采样点）">
            <Input
              disabled={uploading}
              placeholder="默认 200，支持自定义"
              type="number"
              min={1}
              value={windowSize}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (!isNaN(val) && val > 0) {
                  setWindowSize(val);
                } else {
                  message.warning('请输入有效窗口大小');
                  setWindowSize(200);
                }
              }}
            />
          </Form.Item>
        </Form>

        {uploading && <p style={{ color: '#888', marginTop: 12 }}>分析中，请稍候...</p>}

        <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
          <Button
            type="primary"
            disabled={!selectedFile || uploading}
            onClick={handleStartAnalysis}
          >
            开始分析
          </Button>
          <Button
            danger
            disabled={uploading}
            onClick={handleReset}
          >
            重置
          </Button>
        </div>
      </Card>

      <div>{charts}</div>
    </div>
  );
}
