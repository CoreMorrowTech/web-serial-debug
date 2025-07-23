# GitHub Pages部署指南

## 挑战说明

GitHub Pages是静态网站托管服务，只能托管HTML、CSS、JavaScript等静态文件，**无法运行Node.js服务器**。因此需要采用替代方案。

## 解决方案

### 方案1：分离部署（推荐）

#### 1.1 架构设计
```
GitHub Pages (前端) <--WebSocket--> 云服务器 (UDP代理)
```

#### 1.2 前端部署到GitHub Pages
```bash
# 1. 推送代码到GitHub仓库
git add .
git commit -m "Add UDP functionality"
git push origin main

# 2. 在GitHub仓库设置中启用Pages
# Settings -> Pages -> Source: Deploy from a branch -> main
```

#### 1.3 代理服务器部署到云服务
选择以下任一云服务：
- **Heroku** (免费层可用)
- **Railway** (简单部署)
- **DigitalOcean** (性能稳定)
- **阿里云/腾讯云** (国内访问快)

### 方案2：使用免费云服务

#### 2.1 Heroku部署
```bash
# 安装Heroku CLI后
heroku create your-udp-proxy
git push heroku main
```

需要添加 `Procfile`:
```
web: node udp-proxy-server.js
```

#### 2.2 Railway部署
1. 连接GitHub仓库到Railway
2. 自动检测Node.js项目
3. 一键部署

#### 2.3 Render部署
1. 连接GitHub仓库
2. 选择Web Service
3. 设置启动命令: `node udp-proxy-server.js`

### 方案3：GitHub Actions + 外部服务

#### 3.1 自动化部署
创建 `.github/workflows/deploy.yml`:
```yaml
name: Deploy UDP Proxy

on:
  push:
    branches: [ main ]

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./
        
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Deploy to Cloud Service
      # 部署到您选择的云服务
      run: |
        # 部署脚本
```

### 方案4：WebRTC P2P方案（实验性）

#### 4.1 概念
使用WebRTC DataChannel实现点对点UDP通信，无需服务器。

#### 4.2 实现思路
```javascript
// 使用WebRTC建立P2P连接
const pc = new RTCPeerConnection();
const dataChannel = pc.createDataChannel('udp');

// 通过信令服务器交换连接信息
// 建立直接的数据通道
```

## 推荐部署方案

### 最佳实践：GitHub Pages + Railway

#### 步骤1：准备代码
```bash
# 修改前端配置，指向云服务器
# 在js/udp.js中设置默认代理地址
const defaultProxyServer = 'wss://your-app.railway.app';
```

#### 步骤2：部署前端到GitHub Pages
1. 推送代码到GitHub
2. 启用Pages功能
3. 访问 `https://username.github.io/repository-name`

#### 步骤3：部署后端到Railway
1. 注册Railway账号
2. 连接GitHub仓库
3. 自动部署Node.js应用
4. 获得WSS地址

#### 步骤4：配置CORS和WSS
修改 `udp-proxy-server.js`:
```javascript
// 添加CORS支持
const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', 'https://username.github.io');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // 现有代码...
});
```

## 具体实施步骤

### 1. 修改前端配置
```javascript
// 在js/udp.js中修改默认代理地址
const getProxyServer = () => {
    // 优先使用用户配置
    const userConfig = localStorage.getItem('udpProxyServer');
    if (userConfig) return userConfig;
    
    // 生产环境使用云服务器
    if (location.hostname === 'username.github.io') {
        return 'wss://your-udp-proxy.railway.app';
    }
    
    // 开发环境使用本地服务器
    return 'ws://localhost:8080';
};
```

### 2. 创建部署配置文件
```json
// railway.json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "node udp-proxy-server.js",
    "healthcheckPath": "/status"
  }
}
```

### 3. 环境变量配置
```javascript
// 在udp-proxy-server.js中使用环境变量
const CONFIG = {
    websocketPort: process.env.PORT || 8080,
    httpPort: process.env.PORT || 3000,
    maxConnections: 100,
    timeout: 30000
};
```

### 4. 添加健康检查
```javascript
// 在udp-proxy-server.js中添加
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', uptime: process.uptime() });
});
```

## 成本分析

| 方案 | 前端成本 | 后端成本 | 总成本 |
|------|----------|----------|--------|
| GitHub Pages + Railway | 免费 | 免费层 | 免费 |
| GitHub Pages + Heroku | 免费 | 免费层 | 免费 |
| GitHub Pages + VPS | 免费 | $5/月 | $5/月 |

## 注意事项

1. **HTTPS要求**：GitHub Pages强制HTTPS，代理服务器也需要支持WSS
2. **CORS配置**：确保代理服务器允许GitHub Pages域名访问
3. **性能考虑**：免费服务可能有延迟，生产环境建议付费服务
4. **监控告警**：设置服务监控，确保代理服务器稳定运行

## 快速开始

1. **立即部署**：使用Railway一键部署
2. **配置域名**：在前端代码中设置代理地址
3. **测试功能**：验证UDP功能正常工作
4. **监控服务**：确保服务稳定运行