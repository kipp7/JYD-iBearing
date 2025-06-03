'use client';

import React from 'react';
import { Descriptions, Badge } from 'antd';
import ReactECharts from 'echarts-for-react'; // 导入 ECharts

const RightSidebar = () => {
  // 雷达图的配置
  const radarOption = {
    // 雷达图标题（可选，如果需要在图表内部显示）
    // title: {
    //   text: 'PHM实验台综合评估',
    //   left: 'center',
    //   top: 5,
    //   textStyle: {
    //     color: '#e0e0e0',
    //     fontSize: 16,
    //   }
    // },
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(30,42,58,0.9)', // 深色背景
      borderColor: '#3c4a5c',
      textStyle: { color: '#E0E0E0' }
    },
    legend: {
      data: ['当前状态'],
      bottom: 5,
      textStyle: {
        color: '#ccc',
      },
      itemGap: 10,
    },
    radar: {
      indicator: [
        { name: '可靠性', max: 100 },
        { name: '可维护性', max: 100 },
        { name: '健康度', max: 100 },
        { name: '剩余寿命(RUL)', max: 100 }, // 可以是百分比或归一化值
        { name: '故障诊断准确率', max: 100 },
        { name: '预测精度', max: 100 },
      ],
      radius: '65%', // 雷达图的大小
      center: ['50%', '50%'], // 雷达图的位置
      splitNumber: 5, // 分割段数
      axisName: {
        color: '#b0c4de', // 指示器名称颜色 (淡钢蓝)
        fontSize: 11,
        formatter: function (value: string) { // 允许换行
            if (value.length > 5) {
                return value.slice(0, 5) + '\n' + value.slice(5);
            }
            return value;
        }
      },
      splitArea: {
        areaStyle: {
          color: ['rgba(45,58,74,0.5)', 'rgba(36,50,66,0.5)'], // 交替的背景色
          shadowColor: 'rgba(0,0,0,0.2)',
          shadowBlur: 10,
        },
      },
      axisLine: {
        lineStyle: {
          color: 'rgba(100,120,150,0.5)', // 轴线颜色
        },
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(100,120,150,0.5)', // 分割线颜色
        },
      },
    },
    series: [
      {
        name: 'PHM实验台参数',
        type: 'radar',
        data: [
          {
            value: [85, 90, 92, 75, 88, 95], // 示例数据，对应上面的indicator
            name: '当前状态',
            itemStyle: { // 数据点样式
              color: '#00bcd4' // 青色
            },
            lineStyle: { // 线条样式
                color: '#00bcd4',
                width: 2,
            },
            areaStyle: { // 填充区域样式
              color: 'rgba(0,188,212,0.3)'
            }
          },
          // 可以添加更多数据系列进行对比，例如：
          // {
          //   value: [70, 80, 85, 60, 90, 80],
          //   name: '设计指标',
          //   itemStyle: { color: '#ff9800' }, // 橙色
          //   lineStyle: { color: '#ff9800', width: 2 },
          //   areaStyle: { color: 'rgba(255,152,0,0.3)' }
          // }
        ],
      },
    ],
    backgroundColor: 'transparent', // 图表背景透明，以适应卡片背景
  };

  return (
    <div className="w-full h-full bg-[#1f2a38] p-4 rounded-xl shadow-lg text-white flex flex-col gap-6 overflow-y-auto"> {/* 增加 gap 和 shadow */}
      
      {/* 设备详情部分 */}
      <div>
        <h2 className="text-lg font-semibold mb-3 text-cyan-400 border-b border-cyan-700 pb-2">设备基础信息</h2> {/* 调整标题样式 */}
        <div className="w-full max-w-full overflow-x-auto mt-2">
          <Descriptions
            column={1}
            bordered
            size="small"
            className="w-full bg-[#18222e] rounded-lg" // 略微调整背景
            styles={{
              label: {
                color: '#b0c4de', // 淡钢蓝
                backgroundColor: '#1f2a38', // 匹配卡片背景
                borderColor: '#2c3e50', // 边框颜色调整
                minWidth: '100px', // 确保标签有足够宽度
                padding: '6px 10px',
              },
              content: {
                color: '#e0e0e0', // 内容颜色调整
                backgroundColor: '#1f2a38',
                borderColor: '#2c3e50',
                padding: '6px 10px',
              },
              item: {
                  paddingBottom: 4, // 减少默认的item底部padding
              }
            }}
          >
            {/* <Descriptions.Item label="当前状态"> */}
              {/* <Badge status="processing" color="#00bcd4" text={<span style={{color: '#00bcd4'}}>运行中</span>} /> */}
            {/* </Descriptions.Item> */}
            <Descriptions.Item label="运行时长">300.2 min</Descriptions.Item>
            <Descriptions.Item label="启停次数">17 次</Descriptions.Item>
            
            {/* 可以根据需要添加更多描述项 */}
            <Descriptions.Item label="主要传感器">振动, 温度</Descriptions.Item>
            <Descriptions.Item label="维护周期">12 天</Descriptions.Item>
            {/* <Descriptions.Item label="最后开机时间">08:45</Descriptions.Item> */}
          </Descriptions>
        </div>
      </div>

      {/* PHM实验台综合评估 - 雷达图 */}
      <div className="flex-1 min-h-[280px]"> {/* 确保雷达图有足够的高度 */}
        <h2 className="text-lg font-semibold mb-3 text-cyan-400 border-b border-cyan-700 pb-2">系统综合评估</h2>
        <div className="bg-[#18222e] p-2 rounded-lg mt-2" style={{height: 'calc(100% - 40px)'}}> {/* 容器高度调整 */}
            <ReactECharts option={radarOption} style={{ height: '100%', width: '100%' }} />
        </div>
      </div>

    </div>
  );
};

export default RightSidebar;