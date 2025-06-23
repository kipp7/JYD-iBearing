'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Button, message, Upload, Select, Card, Space, Typography, Progress, Collapse, Modal, Form, Input } from 'antd';
import { UploadOutlined, DownloadOutlined, HistoryOutlined } from '@ant-design/icons';
import * as echarts from 'echarts';
import type { UploadFile } from 'antd/es/upload/interface';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

interface FileStructure {
  required_columns: string[];
  optional_columns: string[];
  column_types: Record<string, string>;
  column_descriptions: Record<string, string>;
}

interface DiagnosisResult {
  faultType: string;
  confidence: number;
  probabilities: { label: string; value: number }[];
  explanation: string;
  inferenceTime: number;
}

const labelGroupMap: Record<string, { group: string; part: string; detail: string }> = {
  C1: { group: '正常', part: '', detail: 'de_normal' },
  C2: { group: '故障', part: '内圈', detail: '7mm内圈故障' },
  C3: { group: '故障', part: '滚动体', detail: '7mm滚动体故障' },
  C4: { group: '故障', part: '外圈', detail: '7mm外圈故障' },
  C5: { group: '故障', part: '内圈', detail: '14mm内圈故障' },
  C6: { group: '故障', part: '滚动体', detail: '14mm滚动体故障' },
  C7: { group: '故障', part: '外圈', detail: '14mm外圈故障' },
  C8: { group: '故障', part: '内圈', detail: '21mm内圈故障' },
  C9: { group: '故障', part: '滚动体', detail: '21mm滚动体故障' },
  C10: { group: '故障', part: '外圈', detail: '21mm外圈故障' },
};

export default function ModelAnalysis() {
  // 状态管理
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [modelType, setModelType] = useState<string>('classification');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosisResult | null>(null);
  const [currentTime, setCurrentTime] = useState('');
  const [fileStructure, setFileStructure] = useState<FileStructure | null>(null);
  const [isStructureModalVisible, setIsStructureModalVisible] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);

  // 图表引用
  const confidenceChartRef = useRef<HTMLDivElement>(null);
  const confidenceChartInstance = useRef<echarts.ECharts>();

  // 更新时间显示
  useEffect(() => {
    const updateClock = () => {
      setCurrentTime(new Date().toLocaleString());
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // 初始化图表
  useEffect(() => {
    if (!confidenceChartRef.current) return;

    confidenceChartInstance.current = echarts.init(confidenceChartRef.current);

    // 置信度图表配置
    confidenceChartInstance.current.setOption({
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: [] },
      yAxis: { type: 'value', max: 1 },
      series: [{ type: 'bar', data: [] }],
    });

    return () => {
      confidenceChartInstance.current?.dispose();
    };
  }, []);

  // 处理文件上传
  const handleUpload = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/analyze-structure', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        setFileStructure(data.structure);
        setIsStructureModalVisible(true);
        return false; // 阻止自动上传
      } else {
        message.error(data.error || '文件结构分析失败');
        return false;
      }
    } catch (error) {
      message.error('文件上传失败');
      return false;
    }
  };

  // 保存文件结构模板
  const handleSaveStructure = async (values: any) => {
    try {
      const response = await fetch('/api/save-structure-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          structure: values,
          template_name: 'default_template',
        }),
      });

      const data = await response.json();
      if (data.success) {
        message.success('文件结构模板保存成功');
        setIsStructureModalVisible(false);
      } else {
        message.error(data.error || '保存失败');
      }
    } catch (error) {
      message.error('保存失败');
    }
  };

  // 开始分析
  const handleAnalyze = async () => {
    if (!fileList.length) {
      message.warning('请先上传文件');
      return;
    }

    setIsAnalyzing(true);
    const startTime = Date.now();

    try {
      const formData = new FormData();
      formData.append('file', fileList[0].originFileObj as File);
      formData.append('modelType', modelType);
      formData.append('template_name', 'default_template');

      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        const inferenceTime = Date.now() - startTime;

        // 1. 从正确的位置获取诊断数据
        const diagnosisData = data.structured_data?.diagnosis;
        if (!diagnosisData) {
            message.error('分析成功，但后端返回的数据中缺少诊断信息 (structured_data.diagnosis)');
            setIsAnalyzing(false);
            return;
        }

        // 2. 将后端的文本结论 (diagnosisData.result) 转换回前端需要的故障代码 (faultCode)
        const faultCode = Object.keys(labelGroupMap).find(key => 
            labelGroupMap[key].detail === diagnosisData.result
        ) || 'C1'; // 如果找不到匹配，默认为正常

        // 3. 后端数据中缺少 explanation，我们在前端生成一个
        const explanationText = `模型判定为 ${diagnosisData.result}，置信度 ${(diagnosisData.confidence * 100).toFixed(1)}%。`;
        
        // 4. 使用正确的数据结构更新组件状态
        setDiagnosisResult({
          faultType: faultCode,
          confidence: diagnosisData.confidence,
          probabilities: diagnosisData.probabilities,
          explanation: explanationText,
          inferenceTime,
        });

        setAiReport('AI结构化诊断报告生成中，请稍候...');
        // 异步请求AI报告
        fetch('/api/ai-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data.structured_data),
        })
          .then(res => res.json())
          .then(res => {
            if (res.success) setAiReport(res.ai_report);
            else setAiReport('AI结构化诊断报告生成失败：' + (res.error || '未知错误'));
          });
        
        // 5. 将正确的诊断数据传递给图表更新函数
        updateCharts(diagnosisData);
        message.success('分析完成');
      } else {
        message.error(data.error || '分析失败');
      }
    } catch (error) {
      message.error('分析失败');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 更新图表
  const updateCharts = (results: any) => {
    if (!results) return;

    // 更新置信度图表
    if (results.probabilities) {
      confidenceChartInstance.current?.setOption({
        xAxis: {
          data: results.probabilities.map((p: any) => p.label),
        },
        series: [{
          data: results.probabilities.map((p: any) => p.value),
        }],
      });
    }
  };

  // 导出诊断报告
  const handleExportReport = () => {
    if (!diagnosisResult) return;
    
    const report = `
诊断报告
生成时间：${new Date().toLocaleString()}

故障类型：${diagnosisResult.faultType}
置信度：${(diagnosisResult.confidence * 100).toFixed(2)}%
推理耗时：${diagnosisResult.inferenceTime}ms

故障解释：
${diagnosisResult.explanation}

建议操作：
1. 检查设备运行状态
2. 进行必要的维护保养
3. 定期监测设备运行参数
    `;

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `诊断报告_${new Date().toISOString()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* 顶部状态栏 */}
      <div className="flex justify-between items-center bg-white shadow rounded p-4">
        <div className="text-gray-700">{currentTime}</div>
        <Space>
          <Button icon={<HistoryOutlined />}>历史记录</Button>
        </Space>
      </div>

      {/* 上传与参数输入区 */}
      <Card title="数据上传与参数设置" className="shadow">
        <Space direction="vertical" size="large" className="w-full">
          <Space>
            <Upload
              beforeUpload={handleUpload}
              fileList={fileList}
              onChange={({ fileList }) => setFileList(fileList)}
              maxCount={1}
            >
              <Button icon={<UploadOutlined />}>上传文件</Button>
            </Upload>
            <Select
              value={modelType}
              onChange={setModelType}
              style={{ width: 200 }}
              options={[
                { label: '分类模型', value: 'classification' },
                { label: 'RUL预测模型', value: 'rul' },
              ]}
            />
            <Button
              type="primary"
              onClick={handleAnalyze}
              loading={isAnalyzing}
              disabled={!fileList.length}
            >
              开始分析
            </Button>
          </Space>
        </Space>
      </Card>

      {/* 诊断结果展示区 */}
      {diagnosisResult && (
        <Card className="shadow" style={{ background: diagnosisResult.faultType === 'C1' ? '#f6ffed' : '#fff1f0', borderColor: diagnosisResult.faultType === 'C1' ? '#b7eb8f' : '#ffa39e' }}>
          <Space direction="vertical" size="large" className="w-full">
            <div className="flex items-center gap-4">
              <Title level={3} style={{ margin: 0, color: diagnosisResult.faultType === 'C1' ? '#389e0d' : '#cf1322' }}>
                诊断结果：{labelGroupMap[diagnosisResult.faultType]?.group}
              </Title>
              <Progress
                type="circle"
                percent={diagnosisResult.confidence * 100}
                format={percent => `${percent?.toFixed(1)}%`}
                strokeColor={diagnosisResult.faultType === 'C1' ? '#52c41a' : '#f5222d'}
              />
            </div>
            {/* 故障时显示部位和详细信息 */}
            {diagnosisResult.faultType !== 'C1' && (
              <Paragraph>
                <b>故障部位：</b>
                {labelGroupMap[diagnosisResult.faultType]?.part}
                <br />
                <b>详细类型：</b>
                {labelGroupMap[diagnosisResult.faultType]?.detail}
              </Paragraph>
            )}
            <Paragraph type="secondary">{diagnosisResult.explanation}</Paragraph>
            <Text type="secondary">推理耗时：{diagnosisResult.inferenceTime}ms</Text>
          </Space>
        </Card>
      )}

      {/* 只保留AI结构化诊断报告区 */}
      {aiReport && (
        <Card title="AI结构化诊断报告" className="shadow" style={{ marginTop: 24 }}>
          {aiReport === 'AI结构化诊断报告生成中，请稍候...' ? (
            <div style={{textAlign: 'center', padding: '32px 0'}}>
              <span className="animate-spin" style={{fontSize: 32, marginRight: 12}}>⏳</span>
              <span>{aiReport}</span>
            </div>
          ) : (
            <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{aiReport}</pre>
          )}
        </Card>
      )}

      {/* 文件结构配置模态框 */}
      <Modal
        title="文件结构配置"
        open={isStructureModalVisible}
        onOk={() => setIsStructureModalVisible(false)}
        onCancel={() => setIsStructureModalVisible(false)}
        width={800}
      >
        {fileStructure && (
          <Form
            layout="vertical"
            initialValues={fileStructure}
            onFinish={handleSaveStructure}
          >
            <Form.List name="required_columns">
              {(fields, { add, remove }) => (
                <>
                  {fields.map((field, index) => (
                    <Form.Item
                      key={field.key}
                      label={index === 0 ? '必填列' : ''}
                    >
                      <div className="flex gap-2">
                        <Form.Item
                          {...field}
                          noStyle
                        >
                          <Input placeholder="列名" />
                        </Form.Item>
                        <Button onClick={() => remove(field.name)}>删除</Button>
                      </div>
                    </Form.Item>
                  ))}
                  <Form.Item>
                    <Button type="dashed" onClick={() => add()} block>
                      添加必填列
                    </Button>
                  </Form.Item>
                </>
              )}
            </Form.List>

            <Form.List name="optional_columns">
              {(fields, { add, remove }) => (
                <>
                  {fields.map((field, index) => (
                    <Form.Item
                      key={field.key}
                      label={index === 0 ? '可选列' : ''}
                    >
                      <div className="flex gap-2">
                        <Form.Item
                          {...field}
                          noStyle
                        >
                          <Input placeholder="列名" />
                        </Form.Item>
                        <Button onClick={() => remove(field.name)}>删除</Button>
                      </div>
                    </Form.Item>
                  ))}
                  <Form.Item>
                    <Button type="dashed" onClick={() => add()} block>
                      添加可选列
                    </Button>
                  </Form.Item>
                </>
              )}
            </Form.List>

            <Form.Item>
              <Button type="primary" htmlType="submit">
                保存配置
              </Button>
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
}
