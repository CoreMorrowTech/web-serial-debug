# GitHub Pages + Railway 部署完整指南

## 🎯 部署目标
- **前端**: GitHub Pages (免费静态托管)
- **后端**: Railway (免费UDP代理服务器)
- **结果**: 完全可用的在线UDP调试工具

## 📋 准备工作

### 1. 确保文件完整
确认您的项目包含以下文件：
```
├── index.html
├── css/
├── js/
├── imgs/
├── udp-proxy-server.js
├── package.json
├── railway.json
├── Procfile
├── .github/workflows/deploy.yml
└── README.md
```

### 2. 修改代理服务器地址
编辑 `js/udp.js` 文件，将第332行的代理地址改为您的实际地址：
```javascript
// GitHub Pages部署
if (hostname.includes('github.io')) {
    // 🔥 重要：这里需要替换为您的实际Railway应用地址
    return 'wss://your-app-name.railway.app';
}
```

## 🚀 部署步骤

### 第一步：部署后端到Railway

#### 1.1 注册Railway账号
1. 访问 [railway.app](https://railway.app)
2. 使用GitHub账号登录
3. 授权Railway访问您的仓库

#### 1.2 创建新项目
1. 点击 "New Project"
2. 选择 "Deploy from GitHub repo"
3. 选择您的UDP调试工具仓库
4. Railway会自动检测到Node.js项目

#### 1.3 配置环境变量（可选）
```bash
NODE_ENV=production
PORT=8080
```

#### 1.4 获取部署地址
部署完成后，Railway会提供一个地址，类似：
```
https://your-app-name.railway.app
```

### 第二步：更新前端配置

#### 2.1 修改代理地址
将Railway提供的地址更新到代码中：
```javascript
// 在js/udp.js第332行附近
if (hostname.includes('github.io')) {
    return 'wss://your-app-name.railway.app'; // 替换为实际地址
}
```

#### 2.2 提交代码
```bash
git add .
git commit -m "Update proxy server URL for production"
git push origin main
```

### 第三步：部署前端到GitHub Pages

#### 3.1 启用GitHub Pages
1. 进入GitHub仓库设置
2. 找到 "Pages" 选项
3. Source选择 "GitHub Actions"
4. 保存设置

#### 3.2 触发部署
推送代码后，GitHub Actions会自动运行：
```bash
git push origin main
```

#### 3.3 查看部署状态
1. 在仓库的 "Actions" 标签页查看部署进度
2. 部署成功后，访问: `https://your-username.github.io/your-repo-name`

## ✅ 验证部署

### 1. 检查前端
访问GitHub Pages地址，确认：
- [ ] 页面正常加载
- [ ] UDP选项卡可见
- [ ] 配置界面正常

### 2. 检查后端
访问Railway应用地址，确认：
- [ ] 显示服务器状态页面
- [ ] `/status` API返回正常
- [ ] `/health` 健康检查正常

### 3. 测试UDP功能
1. 在前端选择UDP模式
2. 配置UDP参数
3. 点击连接，查看日志：
```
正在通过WebSocket代理连接UDP...
代理服务器: wss://your-app-name.railway.app
WebSocket代理连接成功，正在建立UDP连接...
已连接到UDP代理服务器 (客户端ID: xxx)
UDP连接成功: 0.0.0.0:8081
```

## 🔧 故障排除

### 问题1: WebSocket连接失败
**症状**: 显示"WebSocket代理连接错误"
**解决**:
1. 检查Railway应用是否正常运行
2. 确认代理地址是否正确（注意wss://前缀）
3. 检查浏览器控制台错误信息

### 问题2: CORS错误
**症状**: 浏览器控制台显示跨域错误
**解决**:
1. 确认Railway应用包含CORS配置
2. 检查GitHub Pages域名是否在允许列表中

### 问题3: GitHub Actions部署失败
**症状**: Actions显示红色错误
**解决**:
1. 检查仓库是否启用了Pages功能
2. 确认workflow文件语法正确
3. 查看Actions日志详细错误信息

## 🎛️ 高级配置

### 自定义域名
如果您有自定义域名：

1. **GitHub Pages自定义域名**:
   - 在仓库设置中配置自定义域名
   - 更新DNS记录

2. **Railway自定义域名**:
   - 在Railway项目设置中添加自定义域名
   - 配置DNS CNAME记录

### 环境变量配置
在Railway中设置环境变量：
```bash
# 生产环境标识
NODE_ENV=production

# 允许的来源（如果使用自定义域名）
ALLOWED_ORIGINS=https://your-domain.com,https://your-username.github.io

# 连接限制
MAX_CONNECTIONS=200
```

### 监控和日志
1. **Railway监控**: 在Railway控制台查看应用状态
2. **GitHub Pages状态**: 在仓库Settings > Pages查看部署状态
3. **实时日志**: Railway提供实时日志查看功能

## 📊 成本分析

| 服务 | 免费额度 | 付费价格 |
|------|----------|----------|
| GitHub Pages | 无限制 | 免费 |
| Railway | 500小时/月 | $5/月起 |
| **总计** | **免费使用** | **$5/月** |

## 🔄 更新部署

### 更新前端
```bash
# 修改代码后
git add .
git commit -m "Update frontend"
git push origin main
# GitHub Actions自动部署
```

### 更新后端
```bash
# 修改udp-proxy-server.js后
git add .
git commit -m "Update backend"
git push origin main
# Railway自动重新部署
```

## 🎉 完成！

部署完成后，您将拥有：
- ✅ 在线可访问的UDP调试工具
- ✅ 完全免费的基础服务
- ✅ 自动化的部署流程
- ✅ 可扩展的架构设计

现在您可以分享GitHub Pages链接给其他人使用您的UDP调试工具了！