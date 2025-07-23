# Railway部署问题修复指南

## 问题分析
Railway健康检查失败的常见原因：
1. 健康检查路径配置错误
2. 服务器启动时间过长
3. 端口绑定问题
4. 依赖安装失败

## 已修复的问题

### 1. 健康检查配置
- ✅ 修改健康检查路径为 `/health`
- ✅ 增加超时时间到300秒
- ✅ 简化Railway配置

### 2. 服务器启动优化
- ✅ 明确绑定到 `0.0.0.0`
- ✅ 添加启动日志
- ✅ 添加错误处理

### 3. 配置文件优化
- ✅ 简化 `railway.json`
- ✅ 保留 `Procfile` 作为备用

## 重新部署步骤

### 方法1：推送更新代码
```bash
git add .
git commit -m "Fix Railway deployment health check"
git push origin main
```
Railway会自动重新部署。

### 方法2：手动重新部署
1. 进入Railway控制台
2. 找到您的项目
3. 点击 "Redeploy" 按钮

### 方法3：检查环境变量
确保Railway中设置了正确的环境变量：
```
NODE_ENV=production
PORT=8080  (通常Railway会自动设置)
```

## 验证部署成功

### 1. 检查日志
在Railway控制台查看部署日志，应该看到：
```
正在启动UDP代理服务器...
配置端口: 8080
环境: production
Railway部署环境检测到
UDP代理服务器启动成功!
HTTP服务器运行在端口 8080
WebSocket服务器运行在端口 8080
健康检查端点: /health
状态API端点: /status
Railway环境部署成功
```

### 2. 测试健康检查
访问您的Railway应用URL + `/health`，应该返回：
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### 3. 测试状态API
访问您的Railway应用URL + `/status`，应该返回：
```json
{
  "status": "running",
  "connections": 0,
  "uptime": 123.45,
  "environment": "production",
  "version": "1.0.0"
}
```

## 如果仍然失败

### 检查构建日志
1. 查看Railway构建日志
2. 确认依赖安装成功
3. 检查是否有语法错误

### 简化测试
创建最小测试版本：
```javascript
// test-server.js
const http = require('http');
const PORT = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'healthy' }));
    } else {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Hello Railway!');
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Test server running on port ${PORT}`);
});
```

### 联系支持
如果问题持续存在：
1. 检查Railway状态页面
2. 查看Railway文档
3. 联系Railway支持

## 部署成功后

### 获取应用URL
1. 在Railway控制台找到您的应用
2. 复制生成的URL（类似：`https://your-app.railway.app`）
3. 更新前端代码中的代理地址

### 更新前端配置
```javascript
// 在js/udp.js中更新
if (hostname && hostname.includes('github.io')) {
    return 'wss://your-app.railway.app';  // 替换为实际URL
}
```

### 测试完整功能
1. 访问GitHub Pages上的前端
2. 选择UDP模式
3. 尝试连接
4. 验证数据发送接收功能