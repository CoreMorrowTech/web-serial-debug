# Web串口调试工具 + UDP功能

一个功能强大的Web端串口和UDP调试工具，支持数据发送、接收、格式转换等功能。

## 🌟 功能特性

### 串口功能
- ✅ Web Serial API支持
- ✅ 多种波特率选择
- ✅ 数据格式转换（文本/HEX）
- ✅ 实时数据监控
- ✅ 发送历史记录

### UDP功能 (新增)
- ✅ UDP数据发送和接收
- ✅ WebSocket代理解决浏览器限制
- ✅ 可配置的远程和本地地址
- ✅ 与串口功能共享界面
- ✅ 实时连接状态显示

## 🚀 在线使用

### 立即体验
访问在线版本：[https://your-username.github.io/your-repo-name](https://your-username.github.io/your-repo-name)

### 功能说明
1. **串口模式**：连接本地串口设备进行调试
2. **UDP模式**：通过网络进行UDP通信调试

## 💻 本地开发

### 环境要求
- Node.js 14+
- 现代浏览器（支持Web Serial API）

### 快速开始
```bash
# 1. 克隆仓库
git clone https://github.com/your-username/your-repo-name.git
cd your-repo-name

# 2. 安装依赖
npm install

# 3. 启动UDP代理服务器
npm start

# 4. 打开浏览器访问 index.html
```

### 项目结构
```
├── index.html          # 主页面
├── css/style.css       # 样式文件
├── js/
│   ├── common.js       # 串口功能
│   ├── udp.js          # UDP功能
│   └── ansi_up.min.js  # ANSI转换库
├── imgs/               # 图片资源
├── udp-proxy-server.js # UDP代理服务器
├── package.json        # 项目配置
├── railway.json        # Railway部署配置
└── Procfile           # Heroku部署配置
```

## 🌐 部署指南

### GitHub Pages + Railway部署
1. **后端部署**：将代码推送到Railway
2. **前端部署**：启用GitHub Pages
3. **配置连接**：更新代理服务器地址

### 本地部署
```bash
# 启动UDP代理服务器
node udp-proxy-server.js

# 使用本地Web服务器打开前端
# 例如使用Python:
python -m http.server 8000
# 或使用Node.js:
npx serve .
```

## 📖 使用说明

### UDP功能使用
1. 选择"UDP"选项卡
2. 配置连接参数：
   - **远程IP**：目标设备IP地址
   - **远程端口**：目标设备端口
   - **本地IP**：本地绑定IP（通常为0.0.0.0）
   - **本地端口**：本地监听端口
3. 点击"连接UDP"
4. 发送和接收数据

### 串口功能使用
1. 选择"串口"选项卡
2. 配置串口参数（波特率等）
3. 点击"连接串口"
4. 发送和接收数据

## 🔧 技术架构

### 浏览器UDP限制解决方案
```
浏览器 <--WebSocket--> 代理服务器 <--UDP--> 目标设备
```

### 核心技术
- **前端**：原生JavaScript + Web Serial API
- **后端**：Node.js + WebSocket + UDP
- **部署**：GitHub Pages + Railway

## 🛠️ 配置选项

### 代理服务器配置
```javascript
// 自定义代理服务器地址
localStorage.setItem('udpProxyServer', 'wss://web-production-b1ff1.up.railway.app');
```

### 环境变量
```bash
PORT=8080                    # 服务器端口
NODE_ENV=production         # 环境模式
MAX_CONNECTIONS=100         # 最大连接数
```

## 🐛 故障排除

### 常见问题

#### UDP连接失败
- 检查代理服务器是否运行
- 确认网络连接正常
- 验证目标设备IP和端口

#### 串口连接失败
- 确认浏览器支持Web Serial API
- 检查串口设备是否被其他程序占用
- 验证串口参数设置

#### 部署问题
- 查看GitHub Actions日志
- 检查Railway应用状态
- 确认域名和SSL配置

### 获取帮助
- 提交[Issue](https://github.com/your-username/your-repo-name/issues)

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🤝 贡献

欢迎提交Pull Request和Issue！

### 开发指南
1. Fork本仓库
2. 创建功能分支
3. 提交更改
4. 创建Pull Request

## 📞 联系方式

- 项目地址：[GitHub仓库](https://github.com/your-username/your-repo-name)
- 在线演示：[GitHub Pages](https://your-username.github.io/your-repo-name)
- 问题反馈：[Issues](https://github.com/your-username/your-repo-name/issues)

---

⭐ 如果这个项目对您有帮助，请给个Star支持一下！