# 本地运维手册

## MaxKB 服务

- 地址：http://localhost:8080
- 容器名：maxkb
- WSL 发行版：Ubuntu-22.04

常用命令：

```powershell
wsl -d Ubuntu-22.04 -u root -- docker ps
wsl -d Ubuntu-22.04 -u root -- docker logs -f maxkb
wsl -d Ubuntu-22.04 -u root -- docker restart maxkb
```

## 前端代理

- 目录：D:\maxkb-demo-frontend
- 地址：http://localhost:5178
- 启动命令：node server.js

前端请求 /api/chat，由 Node 代理调用 WSL Docker 容器中的 Python 脚本，再访问 MaxKB 应用。