'use client';

import React, { useState } from 'react';
import {
  Upload,
  Form,
  Input,
  message,
  Card,
  Progress,
  Button,
  Empty,
  Collapse,
} from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import dynamic from 'next/dynamic';
import { Typography } from 'antd';

const FreqChartCard = dynamic(() => import('./FreqChartCard'), { ssr: false });

const { Dragger } = Upload;
const { Title } = Typography;
const { Panel } = Collapse;

export default function SpectrumUpload() {
  const [samplingRate, setSamplingRate] = useState<number | null>(null);
  const [freqRange, setFreqRange] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileList, setFileList] = useState<any[]>([]);
  const [fftCharts, setFFTCharts] = useState<JSX.Element[]>([]);
  const [envelopeCharts, setEnvelopeCharts] = useState<JSX.Element[]>([]);
  const [stftCharts, setSTFTCharts] = useState<JSX.Element[]>([]);
  const [vmdCharts, setVMDCharts] = useState<JSX.Element[]>([]);
  const [cwtImage, setCWTImage] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [innerFreq, setInnerFreq] = useState('');
  const [outerFreq, setOuterFreq] = useState('');
  const [ballFreq, setBallFreq] = useState('');

  const handleStartAnalysis = async () => {
    if (!selectedFile) {
      message.error('请先选择文件');
      return;
    }

    setUploading(true);
    setProgress(20);

    const formData = new FormData();
    formData.append('file', selectedFile);
    if (samplingRate) formData.append('samplingRate', samplingRate.toString());
    if (freqRange) formData.append('freqRange', freqRange);
    if (innerFreq) formData.append('innerFreq', innerFreq);
    if (outerFreq) formData.append('outerFreq', outerFreq);
    if (ballFreq) formData.append('ballFreq', ballFreq);

    try {
      const spectrumRes = await fetch('/api/spectrum', {
        method: 'POST',
        body: formData,
      });

      if (!spectrumRes.ok) throw new Error('频谱/包络谱接口调用失败');
      const spectrumJson = await spectrumRes.json();
      if (!spectrumJson.success) throw new Error('频谱/包络谱分析失败');

      const fft: JSX.Element[] = [];
      const env: JSX.Element[] = [];

      spectrumJson.results.forEach((series: any, idx: number) => {
        const label = `${series.axis}（${samplingRate || 1024} Hz）`;
        const chart = (
          <FreqChartCard
            key={`fft-env-${idx}`}
            axis={label}
            data={series.data}
            marks={series.featureMarks ?? []}
          />
        );
        if (label.includes('包络谱')) env.push(chart);
        else fft.push(chart);
      });

      setFFTCharts(fft);
      setEnvelopeCharts(env);
      setProgress(40);

      const stftRes = await fetch('/api/stft', {
        method: 'POST',
        body: formData,
      });

      if (stftRes.ok) {
        const stftJson = await stftRes.json();
        if (stftJson.success) {
          const charts: JSX.Element[] = stftJson.results.map((series: any, idx: number) => (
            <FreqChartCard
              key={`stft-${idx}`}
              axis={series.axis}
              data={series.data}
              frequencies={series.frequencies}
              mode="stft"
            />
          ));
          setSTFTCharts(charts);
        }
      }

      setProgress(60);

      const vmdRes = await fetch('/api/vmd', {
        method: 'POST',
        body: formData,
      });

      if (vmdRes.ok) {
        const vmdJson = await vmdRes.json();
        if (vmdJson.success) {
          const charts: JSX.Element[] = vmdJson.results.map((series: any, idx: number) => (
            <FreqChartCard
              key={`vmd-${idx}`}
              axis={series.axis}
              data={series.data}
              marks={series.featureMarks ?? []}
            />
          ));
          setVMDCharts(charts);
        }
      }

      setProgress(80);

      const cwtRes = await fetch('/api/cwt', {
        method: 'POST',
        body: formData,
      });

      if (cwtRes.ok) {
        const cwtJson = await cwtRes.json();
        if (cwtJson.success) {
          setCWTImage(cwtJson.image);
        }
      }

      setProgress(100);
      message.success('全部分析成功');
    } catch (err: any) {
      console.error(err);
      message.error(err.message || '分析失败');
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setFileList([]);
    setFFTCharts([]);
    setEnvelopeCharts([]);
    setSTFTCharts([]);
    setVMDCharts([]);
    setCWTImage('');
    setSamplingRate(null);
    setFreqRange('');
    setProgress(0);
    message.info('已重置所有内容');
  };

  return (
    <div className="p-4">
      <Title level={3} style={{ color: 'white', marginBottom: 24 }}>
        多维振动信号分析（频谱 / 包络谱 / STFT / VMD / CWT）
      </Title>

      <Card title={null} className="mb-4">
        <Form layout="vertical">
          <Form.Item label="上传文件（支持 .csv / .txt）">
            <Dragger
              accept=".csv,.txt"
              beforeUpload={(file) => {
                const maxSizeMB = 100;
                if (file.size / 1024 / 1024 > maxSizeMB) {
                  message.error(`文件大小超过限制（${maxSizeMB}MB）`);
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
              <p className="ant-upload-text">拖拽或点击上传原始数据文件</p>
            </Dragger>
            {progress > 0 && <Progress percent={progress} showInfo />}
          </Form.Item>

          <Form.Item label="采样率（Hz，可选）">
            <Input
              disabled={uploading}
              placeholder="默认 1024 Hz"
              type="number"
              min={1}
              value={samplingRate ?? ''}
              onChange={(e) => {
                const val = Number(e.target.value);
                setSamplingRate(val > 0 ? val : null);
              }}
            />
          </Form.Item>

          <Form.Item label="频率范围限制（Hz，例如 0-500，可选）">
            <Input
              disabled={uploading}
              placeholder="如 0-500"
              value={freqRange}
              onChange={(e) => setFreqRange(e.target.value)}
            />
          </Form.Item>

          <Form.Item label="内圈故障频率 (Hz)">
            <Input
              disabled={uploading}
              value={innerFreq}
              onChange={(e) => setInnerFreq(e.target.value)}
              placeholder="如 150"
            />
          </Form.Item>

          <Form.Item label="外圈故障频率 (Hz)">
            <Input
              disabled={uploading}
              value={outerFreq}
              onChange={(e) => setOuterFreq(e.target.value)}
              placeholder="如 120"
            />
          </Form.Item>

          <Form.Item label="滚动体故障频率 (Hz)">
            <Input
              disabled={uploading}
              value={ballFreq}
              onChange={(e) => setBallFreq(e.target.value)}
              placeholder="如 90"
            />
          </Form.Item>
        </Form>

        <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
          <Button type="primary" disabled={!selectedFile || uploading} onClick={handleStartAnalysis}>
            开始分析
          </Button>
          <Button danger disabled={uploading} onClick={handleReset}>
            重置
          </Button>
        </div>
      </Card>

      {(fftCharts.length || envelopeCharts.length || stftCharts.length || vmdCharts.length || cwtImage) > 0 && (
        <Collapse destroyInactivePanel style={{ marginTop: 32 }} defaultActiveKey={['fft']}>
          <Panel header={<span style={{ color: 'white' }}>原始频谱分析（FFT）</span>} key="fft">
            {fftCharts.length ? fftCharts : <Empty description="暂无频谱结果" />}
          </Panel>
          <Panel header={<span style={{ color: 'white' }}>包络谱分析（Hilbert 包络）</span>} key="envelope">
            {envelopeCharts.length ? envelopeCharts : <Empty description="暂无包络谱结果" />}
          </Panel>
          <Panel header={<span style={{ color: 'white' }}>时频分析（STFT）</span>} key="stft">
            {stftCharts.length ? stftCharts : <Empty description="暂无 STFT 结果" />}
          </Panel>
          <Panel header={<span style={{ color: 'white' }}>模态分解分析（VMD / EMD / IMF）</span>} key="vmd">
            {vmdCharts.length ? vmdCharts : <Empty description="暂无模态分解结果" />}
          </Panel>
          <Panel header={<span style={{ color: 'white' }}>连续小波分析（CWT）</span>} key="cwt">
            {cwtImage ? (
              <img src={`data:image/png;base64,${cwtImage}`} style={{ width: '100%' }} />
            ) : (
              <Empty description="暂无 CWT 结果" />
            )}
          </Panel>
        </Collapse>

      )}
    </div>
  );
}
