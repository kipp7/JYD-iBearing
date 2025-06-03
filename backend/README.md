##   `backend/README.md`（后端服务说明）

```markdown
# 后端服务（Flask）

本目录为后端 Flask 服务代码，负责：

- 接收传感器上传的环境与姿态数据
- 写入 Supabase 云数据库
- 实现前端请求接口（API）
- 管理告警逻辑（如位移、倾斜超限等）

##  目录结构说明

- `app.py`：主程序入口
- `api/`：API 路由接口定义
- `models/`：数据库表结构映射（如使用 SQLAlchemy）
- `uploads/`：数据上传暂存区（已加入 `.gitignore`）
- `utils/`：通用工具函数（如 Supabase 调用、时间处理等）

##  依赖安装

```bash
pip install -r requirements.txt
