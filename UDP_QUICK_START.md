# UDP功能快速启动指南

## 问题解决方案

您遇到的"浏览器不支持直接UDP连接"问题已经通过WebSocket代理服务器解决。

## 快速启动步骤

### 1. 安装Node.js依赖
```bash
npm install
# 或者只安装WebSocket库
npm install ws
```

### 2. 启动UDP代理服务器
```bash
node udp-proxy-server.js
# 或者
npm start
```

服务器启动后会显示：
```
UDP代理服务器启动:
- WebSocket端口: 8080
- HTTP端口: 3000
```

### 3. 使用Web界面
1. 打开 `index.html`
2. 选择"UDP"选项卡
3. 配置UDP参数：
   - 远程IP: 目标设备IP地址
   - 远程端口: 目标设备端口
   - 本地IP: 通常保持 0.0.0.0
   - 本地端口: 本地监听端口
4. 点击"连接UDP"按钮

### 4. 验证连接
连接成功后会看到：
```
正在通过WebSocket代理连接UDP...
代理服务器: ws://localhost:8080
WebSocket代理连接成功，正在建立UDP连接...
已连接到UDP代理服务器 (客户端ID: xxx)
UDP连接成功: 0.0.0.0:8081
```

## 配置选项

### 自定义代理服务器地址
在浏览器控制台中执行：
```javascript
localStorage.setItem('udpProxyServer', 'ws://your-server:8080');
```

### 修改代理服务器端口
编辑 `udp-proxy-server.js` 文件中的配置：
```javascript
const CONFIG = {
    websocketPort: 8080,  // 修改WebSocket端口
    httpPort: 3000,       // 修改HTTP端口
    maxConnections: 100,
    timeout: 30000
};
```

## 测试UDP功能

### 发送测试数据
1. 在发送框中输入测试数据
2. 选择文本或HEX格式
3. 点击发送按钮
4. 查看日志确认发送成功

### 接收测试数据
1. 使用其他UDP工具向配置的端口发送数据
2. 在日志区域查看接收到的数据

## 故障排除

### 连接失败
如果看到错误信息：
```
WebSocket代理连接错误，请检查代理服务器是否运行
```

解决方案：
1. 确认代理服务器正在运行
2. 检查端口是否被占用
3. 确认防火墙设置

### 端口占用
如果8080端口被占用，修改配置：
```javascript
// 在udp-proxy-server.js中修改
const CONFIG = {
    websocketPort: 8081,  // 改为其他端口
    // ...
};
```

然后在浏览器中设置新地址：
```javascript
localStorage.setItem('udpProxyServer', 'ws://localhost:8081');
```

### 数据发送失败
1. 确认UDP连接状态
2. 检查目标IP和端口是否正确
3. 确认网络连通性

## 生产环境部署

### 1. 服务器部署
```bash
# 在服务器上
git clone your-repo
cd your-repo
npm install
node udp-proxy-server.js
```

### 2. 使用PM2管理进程
```bash
npm install -g pm2
pm2 start udp-proxy-server.js --name udp-proxy
pm2 startup
pm2 save
```

### 3. 配置HTTPS/WSS
对于生产环境，建议使用WSS（安全WebSocket）：
```javascript
// 修改前端代理地址
localStorage.setItem('udpProxyServer', 'wss://your-domain.com:8080');
```

## 技术说明

### 工作原理
```
浏览器 <--WebSocket--> 代理服务器 <--UDP--> 目标设备
```

### 支持的功能
- ✅ UDP数据发送和接收
- ✅ 多客户端连接
- ✅ 连接状态管理
- ✅ 错误处理和重连
- ✅ 数据格式转换
- ✅ 日志记录

### 性能特点
- 低延迟数据转发
- 支持二进制数据
- 自动连接管理
- 内存使用优化

现在您的UDP功能已经完全可用了！