# JYD-iBearing 智能轴承健康监测系统

本项目为一个集成前端、后端与数据存储的智能轴承监测平台，具备数据采集、处理、展示和告警等功能。

##  项目结构

- [`Web/`](./Web/)：前端代码（Next.js + Ant Design）
- [`backend/`](./backend/)：后端服务（Flask + Supabase）
- `.gitignore`：忽略不必要同步的本地文件（如 CSV 大文件）
- `README.md`：当前项目总览说明

##  项目功能

- 多传感器数据接入（温度、振动、倾角等）
- 实时异常监测与预警逻辑
- 前端趋势图、状态展示、下载查询等模块
- 支持 Supabase 云数据库，数据永久存储

##  技术栈

| 层级     | 技术                     |
|----------|--------------------------|
| 前端     | React / Next.js / Ant Design |
| 后端     | Python / Flask / Supabase SDK |
| 存储     | Supabase (PostgreSQL)    |
| 通信     | HTTP / WebSocket（可选）  |
| 部署     | 自建服务器 + Nginx       |

##  快速启动

```bash
# 安装前端依赖
cd Web
npm install

# 安装后端依赖
cd ../backend
pip install -r requirements.txt

# 启动前端（开发模式）
npm run dev

# 启动后端
python app.py
