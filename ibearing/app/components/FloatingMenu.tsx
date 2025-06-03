'use client';

import React, { useState } from 'react';
import { Layout, Menu } from 'antd';
import {
  MenuUnfoldOutlined,
  HomeOutlined,
  SettingOutlined,
  BarChartOutlined,
  ToolOutlined,
  LineChartOutlined,
  PieChartOutlined,
  FileSearchOutlined,
  HeatMapOutlined,
  RadarChartOutlined,
  AppstoreOutlined,
  DesktopOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';

const { Sider } = Layout;

const HoverSidebar = () => {
  const [hovering, setHovering] = useState(false);
  const router = useRouter();

  return (
    <div
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className="fixed top-0 left-0 h-full z-[1000]"
    >
      <Sider
        theme="dark"
        collapsible
        collapsed={!hovering}
        trigger={null}
        width={200}
        collapsedWidth={0}
        className="h-full transition-all duration-300 ease-in-out"
        style={{
          backgroundColor: '#001529', // 深色背景
          borderRight: '4px solid rgba(0, 255, 255, 0.1)', // 科技蓝色边框
        }}
      >
        <div
          className="h-16 flex items-center justify-center text-cyan-400 font-bold text-xl"
          style={{
            borderBottom: '4px solid rgba(0, 255, 255, 0.1)', // 修改横线颜色为科技蓝
          }}
        >
          {hovering ? '菜单导航' : <MenuUnfoldOutlined />}
        </div>

        <Menu
          theme="dark"
          mode="inline"
          defaultSelectedKeys={['1']}
          onClick={({ key }) => {
            if (key === 'home') router.push('/');
            if (key === 'analysis') router.push('/analysis');
            if (key === 'settings') router.push('/settings');
            if (key === 'wave-analysis') router.push('/wave-analysis');
            if (key === 'spectrum-analysis') router.push('/spectrum-analysis');
            if (key === 'charts') router.push('/charts-dashboard');
            if (key === 'weihuweixiu') router.push('/weihuweixiu');
            if (key === 'jiankangyuce') router.push('/jiankangyuce');
            if (key === 'guzhangtongji') router.push('/guzhangtongji');
            if (key === 'lishifenxi') router.push('/lishifenxi');
            if (key === 'wendufenxi') router.push('/wendufenxi');
            if (key === 'zhendong') router.push('/zhendong');
          }}
          items={[
            {
              key: 'home',
              icon: <HomeOutlined />,
              label: '登陆',
            },
            {
              key: 'analysis',
              icon: <DesktopOutlined />,
              label: '大屏展示',
            },
            {
              key: 'wave-analysis',
              icon: <AppstoreOutlined />,
              label: '时域分析',
            },
            {
              key: 'spectrum-analysis',
              icon: <HeatMapOutlined />,
              label: '频谱分析',
            },
            {
              key: 'charts',
              icon: <BarChartOutlined />,
              label: '数据对比',
            },
            {
              key: 'zhendong',
              icon: <RadarChartOutlined />,
              label: '振动数据分析',
            },
            {
              key: 'wendufenxi',
              icon: <PieChartOutlined />,
              label: '温度分析',
            },
            {
              key: 'lishifenxi',
              icon: <FileSearchOutlined />,
              label: '历史趋势',
            },
            {
              key: 'weihuweixiu',
              icon: <ToolOutlined />,
              label: '维护维修',
            },
            {
              key: 'jiankangyuce',
              icon: <LineChartOutlined />,
              label: '健康预测',
            },
            {
              key: 'guzhangtongji',
              icon: <SettingOutlined />,
              label: '故障统计',
            },
          ]}
          
        />
      </Sider>
    </div>
  );
};

export default HoverSidebar;
