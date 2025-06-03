'use client'; 

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Card, Form, Input, Button, Tabs } from 'antd';

export default function LoginPage() {
  const router = useRouter();
  const greenColor = '#4CAF50';

  return (
    <div className="relative h-screen w-full flex items-center justify-center bg-[#1f2937]">
      {/* 背景图 */}
      <Image
        src="/images/landslide.png"
        alt="Landslide"
        fill
        priority
        quality={100}
        style={{
          objectFit: 'cover',
          opacity: 0.15,
          filter: 'grayscale(80%) blur(2px)',
        }}
        unoptimized
      />

      {/* 登录卡片容器（调整为原版宽度） */}
      <div className="relative z-10 flex justify-center w-full max-w-[1200px] gap-6 p-4">
        <Card
          title={
            <div className="text-center font-bold" style={{ color: greenColor, fontSize: '30px' }}>
              iBearing 智能轴承健康监测系统
            </div>
          }
          variant="borderless"
          style={{
            width: '60%',
            backgroundColor: 'rgba(20, 30, 40, 0.7)',
            borderRadius: 16,
            backdropFilter: 'blur(12px)',
            boxShadow: '0 4px 30px rgba(0, 0, 0, 0.4)',
            color: '#fff',
          }}
          styles={{
            header: {
              borderBottom: 'none',
              padding: '16px 24px',
            },
            body: {
              padding: 24,
            },
          }}
        >
          <Tabs
            defaultActiveKey="account"
            centered
            items={[
              {
                key: 'account',
                label: <span style={{ color: greenColor }}>账号密码登录</span>,
                children: (
                  <Form layout="vertical">
                    <Form.Item label={<span style={{ color: '#ccc' }}>账号</span>}>
                      <Input size="large" placeholder="请输入账号" />
                    </Form.Item>
                    <Form.Item label={<span style={{ color: '#ccc' }}>密码</span>}>
                      <Input.Password size="large" placeholder="请输入密码" />
                    </Form.Item>
                    <Form.Item>
                      <Button
                        type="primary"
                        block
                        size="large"
                        style={{
                          backgroundColor: greenColor,
                          borderColor: greenColor,
                          color: '#fff',
                        }}
                        onClick={() => router.push('/analysis')}
                      >
                        登录
                      </Button>
                    </Form.Item>
                  </Form>
                ),
              },
              {
                key: 'mobile',
                label: <span style={{ color: greenColor }}>手机号登录</span>,
                children: (
                  <Form layout="vertical">
                    <Form.Item label={<span style={{ color: '#ccc' }}>手机号</span>}>
                      <Input size="large" placeholder="请输入手机号" />
                    </Form.Item>
                    <Form.Item label={<span style={{ color: '#ccc' }}>验证码</span>}>
                      <Input size="large" placeholder="请输入验证码" />
                    </Form.Item>
                    <Form.Item>
                      <Button
                        type="primary"
                        block
                        size="large"
                        style={{
                          backgroundColor: greenColor,
                          borderColor: greenColor,
                          color: '#fff',
                        }}
                      >
                        登录
                      </Button>
                    </Form.Item>
                  </Form>
                ),
              },
            ]}
          />

          {/* 登录方式提示 */}
          <div className="flex justify-between mt-6 text-xs text-gray-400">
            <div className="flex gap-2">
              <span>其他登录方式：</span>
              <span>🌐</span>
              <span>🔐</span>
              <span>📧</span>
            </div>
            <a className="hover:underline" href="#" style={{ color: greenColor }}>
              注册账号
            </a>
          </div>
        </Card>
      </div>
    </div>
  );
}
