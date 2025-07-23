#!/usr/bin/env node
/**
 * UDP WebSocket代理服务器
 * 用于解决浏览器无法直接创建UDP连接的问题
 */

const WebSocket = require('ws');
const dgram = require('dgram');
const http = require('http');

// 配置
const CONFIG = {
    port: process.env.PORT || 8080,
    maxConnections: 100,
    timeout: 30000, // 30秒超时
    allowedOrigins: [
        'https://*.github.io',
        'http://localhost:*',
        'http://127.0.0.1:*',
        'https://localhost:*'
    ]
};

// 创建HTTP服务器（可选，用于状态页面）
const server = http.createServer((req, res) => {
    // 设置CORS头
    const origin = req.headers.origin;
    if (isOriginAllowed(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    // 处理预检请求
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    if (req.url === '/status') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'running',
            connections: wss.clients.size,
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || 'development',
            version: '1.0.0'
        }));
    } else if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString()
        }));
    } else {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>UDP WebSocket代理服务器</title>
                <meta charset="utf-8">
                <style>
                    body { font-family: Arial, sans-serif; margin: 40px; }
                    .status { background: #e8f5e8; padding: 15px; border-radius: 5px; }
                    .info { background: #e8f4fd; padding: 10px; border-radius: 5px; margin: 10px 0; }
                </style>
            </head>
            <body>
                <h1>UDP WebSocket代理服务器</h1>
                <div class="status">
                    <h3>✅ 服务器运行中</h3>
                    <p><strong>服务端口:</strong> ${CONFIG.port}</p>
                    <p><strong>当前连接数:</strong> <span id="connections">${wss.clients.size}</span></p>
                    <p><strong>运行时间:</strong> ${Math.floor(process.uptime())}秒</p>
                </div>
                
                <div class="info">
                    <h3>API端点</h3>
                    <ul>
                        <li><a href="/status">状态API</a> - JSON格式状态信息</li>
                        <li><a href="/health">健康检查</a> - 服务健康状态</li>
                    </ul>
                </div>
                
                <div class="info">
                    <h3>WebSocket连接</h3>
                    <p>连接地址: <code>${req.headers.host ? (req.headers['x-forwarded-proto'] || 'ws') + '://' + req.headers.host : 'ws://localhost:' + CONFIG.port}</code></p>
                </div>
                
                <script>
                    // 定期更新连接数
                    setInterval(() => {
                        fetch('/status')
                            .then(r => r.json())
                            .then(data => {
                                document.getElementById('connections').textContent = data.connections;
                            })
                            .catch(() => {});
                    }, 5000);
                </script>
            </body>
            </html>
        `);
    }
});

// 检查来源是否被允许
function isOriginAllowed(origin) {
    if (!origin) return true; // 允许无来源的请求（如直接访问）
    
    return CONFIG.allowedOrigins.some(allowed => {
        if (allowed.includes('*')) {
            const pattern = allowed.replace(/\*/g, '.*');
            return new RegExp(pattern).test(origin);
        }
        return allowed === origin;
    });
}

// 创建WebSocket服务器
const wss = new WebSocket.Server({ 
    server: server
});

console.log(`UDP代理服务器启动:`);
console.log(`- 服务端口: ${CONFIG.port}`);

// 连接管理
const connections = new Map();

wss.on('connection', function connection(ws, req) {
    const clientId = Date.now() + Math.random();
    const clientInfo = {
        id: clientId,
        ws: ws,
        udpSocket: null,
        remoteAddress: req.socket.remoteAddress,
        connectedAt: new Date()
    };
    
    connections.set(clientId, clientInfo);
    console.log(`新客户端连接: ${clientInfo.remoteAddress} (ID: ${clientId})`);
    
    // 连接超时处理
    const timeout = setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.close(1000, 'Connection timeout');
        }
    }, CONFIG.timeout);
    
    ws.on('message', function incoming(message) {
        try {
            const data = JSON.parse(message);
            handleMessage(clientInfo, data);
        } catch (error) {
            console.error('消息解析错误:', error);
            sendError(ws, 'Invalid message format');
        }
    });
    
    ws.on('close', function() {
        clearTimeout(timeout);
        cleanup(clientInfo);
        connections.delete(clientId);
        console.log(`客户端断开: ${clientInfo.remoteAddress} (ID: ${clientId})`);
    });
    
    ws.on('error', function(error) {
        console.error('WebSocket错误:', error);
        cleanup(clientInfo);
    });
    
    // 发送欢迎消息
    sendMessage(ws, {
        type: 'welcome',
        clientId: clientId,
        serverInfo: {
            version: '1.0.0',
            maxConnections: CONFIG.maxConnections
        }
    });
});

// 处理客户端消息
function handleMessage(clientInfo, data) {
    const { ws } = clientInfo;
    
    switch (data.type) {
        case 'udp_connect':
            handleUDPConnect(clientInfo, data);
            break;
            
        case 'udp_send':
            handleUDPSend(clientInfo, data);
            break;
            
        case 'udp_disconnect':
            handleUDPDisconnect(clientInfo);
            break;
            
        case 'ping':
            sendMessage(ws, { type: 'pong', timestamp: Date.now() });
            break;
            
        default:
            sendError(ws, `Unknown message type: ${data.type}`);
    }
}

// 处理UDP连接请求
function handleUDPConnect(clientInfo, data) {
    const { ws } = clientInfo;
    const { localIP = '0.0.0.0', localPort = 0 } = data;
    
    try {
        // 创建UDP socket
        const udpSocket = dgram.createSocket('udp4');
        clientInfo.udpSocket = udpSocket;
        
        // 监听UDP消息
        udpSocket.on('message', (msg, rinfo) => {
            sendMessage(ws, {
                type: 'udp_data',
                data: Array.from(msg),
                remoteAddress: rinfo.address,
                remotePort: rinfo.port,
                timestamp: Date.now()
            });
        });
        
        // 监听错误
        udpSocket.on('error', (error) => {
            console.error('UDP错误:', error);
            sendError(ws, `UDP error: ${error.message}`);
        });
        
        // 绑定端口
        udpSocket.bind(localPort, localIP, () => {
            const address = udpSocket.address();
            sendMessage(ws, {
                type: 'udp_connected',
                localAddress: address.address,
                localPort: address.port,
                timestamp: Date.now()
            });
            console.log(`UDP连接建立: ${address.address}:${address.port} (客户端: ${clientInfo.id})`);
        });
        
    } catch (error) {
        console.error('UDP连接失败:', error);
        sendError(ws, `UDP connect failed: ${error.message}`);
    }
}

// 处理UDP发送请求
function handleUDPSend(clientInfo, data) {
    const { ws, udpSocket } = clientInfo;
    
    if (!udpSocket) {
        sendError(ws, 'UDP not connected');
        return;
    }
    
    const { data: messageData, remoteAddress, remotePort } = data;
    
    try {
        const buffer = Buffer.from(messageData);
        udpSocket.send(buffer, remotePort, remoteAddress, (error) => {
            if (error) {
                sendError(ws, `UDP send failed: ${error.message}`);
            } else {
                sendMessage(ws, {
                    type: 'udp_sent',
                    bytesSent: buffer.length,
                    remoteAddress: remoteAddress,
                    remotePort: remotePort,
                    timestamp: Date.now()
                });
            }
        });
    } catch (error) {
        sendError(ws, `UDP send error: ${error.message}`);
    }
}

// 处理UDP断开请求
function handleUDPDisconnect(clientInfo) {
    const { ws } = clientInfo;
    
    if (clientInfo.udpSocket) {
        clientInfo.udpSocket.close();
        clientInfo.udpSocket = null;
        sendMessage(ws, {
            type: 'udp_disconnected',
            timestamp: Date.now()
        });
        console.log(`UDP连接关闭 (客户端: ${clientInfo.id})`);
    }
}

// 清理资源
function cleanup(clientInfo) {
    if (clientInfo.udpSocket) {
        clientInfo.udpSocket.close();
        clientInfo.udpSocket = null;
    }
}

// 发送消息
function sendMessage(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
    }
}

// 发送错误消息
function sendError(ws, error) {
    sendMessage(ws, {
        type: 'error',
        message: error,
        timestamp: Date.now()
    });
}

// 启动HTTP服务器
server.listen(CONFIG.port, () => {
    console.log(`HTTP服务器运行在端口 ${CONFIG.port}`);
    console.log(`WebSocket服务器运行在端口 ${CONFIG.port}`);
    console.log(`访问地址: http://localhost:${CONFIG.port}`);
});

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n正在关闭服务器...');
    
    // 关闭所有连接
    connections.forEach(clientInfo => {
        cleanup(clientInfo);
        if (clientInfo.ws.readyState === WebSocket.OPEN) {
            clientInfo.ws.close(1000, 'Server shutdown');
        }
    });
    
    // 关闭服务器
    wss.close(() => {
        server.close(() => {
            console.log('服务器已关闭');
            process.exit(0);
        });
    });
});

// 错误处理
process.on('uncaughtException', (error) => {
    console.error('未捕获的异常:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('未处理的Promise拒绝:', reason);
});