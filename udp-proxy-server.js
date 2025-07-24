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
    // 设置CORS头 - 简化处理避免undefined值
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
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
    } else if (req.url === '/clients') {
        // 获取所有连接的客户端信息
        res.writeHead(200, { 'Content-Type': 'application/json' });
        const clientList = Array.from(connections.values()).map(client => ({
            id: client.id,
            remoteAddress: client.remoteAddress,
            clientLocalIP: client.clientLocalIP,
            clientLocalPort: client.clientLocalPort,
            connectedAt: client.connectedAt,
            hasUDP: !!client.udpSocket
        }));
        res.end(JSON.stringify({
            clients: clientList,
            totalClients: clientList.length
        }));
    } else if (req.url.startsWith('/send-to-client/') && req.method === 'POST') {
        // 向指定客户端发送UDP数据
        const clientId = req.url.split('/')[2];
        let body = '';
        
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const client = Array.from(connections.values()).find(c => c.id.toString() === clientId);
                
                if (!client) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Client not found' }));
                    return;
                }
                
                // 发送UDP数据到客户端内网
                handleUDPSendToClient(client, {
                    data: data.data || Array.from(Buffer.from(data.message || 'Hello from server', 'utf8'))
                });
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: true, 
                    message: `Data sent to client ${clientId}`,
                    targetIP: client.clientLocalIP,
                    targetPort: client.clientLocalPort
                }));
                
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON data' }));
            }
        });
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
                        <li><a href="/clients">客户端列表</a> - 查看所有连接的客户端</li>
                        <li><strong>POST /send-to-client/{clientId}</strong> - 向指定客户端内网发送UDP数据</li>
                    </ul>
                </div>
                
                <div class="info">
                    <h3>向客户端发送数据示例</h3>
                    <pre style="background: #f8f9fa; padding: 10px; border-radius: 3px;">
POST /send-to-client/1234567890
Content-Type: application/json

{
  "message": "Hello from server",
  "data": [72, 101, 108, 108, 111]
}</pre>
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

// 检查来源是否被允许（暂时简化为允许所有来源）
function isOriginAllowed(origin) {
    return true; // 简化处理，允许所有来源
}

// 创建WebSocket服务器
const wss = new WebSocket.Server({ 
    server: server,
    perMessageDeflate: false
});

console.log(`正在启动UDP代理服务器...`);
console.log(`配置端口: ${CONFIG.port}`);
console.log(`环境: ${process.env.NODE_ENV || 'development'}`);

// Railway环境信息显示
if (process.env.RAILWAY_ENVIRONMENT) {
    console.log(`=== Railway部署环境检测到 ===`);
    if (process.env.RAILWAY_PUBLIC_DOMAIN) {
        console.log(`Railway公网域名: ${process.env.RAILWAY_PUBLIC_DOMAIN}`);
    }
    if (process.env.RAILWAY_STATIC_URL) {
        console.log(`Railway静态URL: ${process.env.RAILWAY_STATIC_URL}`);
    }
    if (process.env.PORT) {
        console.log(`Railway分配端口: ${process.env.PORT}`);
    }
    console.log(`================================`);
}

// 连接管理
const connections = new Map();

wss.on('connection', function connection(ws, req) {
    const clientId = Date.now() + Math.random();
    const clientInfo = {
        id: clientId,
        ws: ws,
        udpSocket: null,
        remoteAddress: req.socket.remoteAddress,
        connectedAt: new Date(),
        serverHost: req.headers.host ? req.headers.host.split(':')[0] : null
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
            handleUDPConnect(clientInfo, data).catch(error => {
                console.error('UDP连接处理错误:', error);
                sendError(clientInfo.ws, `UDP connect failed: ${error.message}`);
            });
            break;
            
        case 'udp_send':
            handleUDPSend(clientInfo, data);
            break;
            
        case 'udp_disconnect':
            handleUDPDisconnect(clientInfo);
            break;
            
        case 'udp_send_to_client':
            handleUDPSendToClient(clientInfo, data);
            break;
            
        case 'ping':
            sendMessage(ws, { type: 'pong', timestamp: Date.now() });
            break;
            
        default:
            sendError(ws, `Unknown message type: ${data.type}`);
    }
}

// 获取服务器公网IP地址
async function getPublicIP(clientInfo) {
    try {
        // 方法1: 优先通过外部服务获取真实公网IP地址
        const https = require('https');
        const publicIPServices = [
            'https://api.ipify.org',
            'https://icanhazip.com',
            'https://ipinfo.io/ip',
            'https://checkip.amazonaws.com'
        ];
        
        for (const service of publicIPServices) {
            try {
                const ip = await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => reject(new Error('Timeout')), 3000);
                    
                    https.get(service, (res) => {
                        clearTimeout(timeout);
                        let data = '';
                        res.on('data', chunk => data += chunk);
                        res.on('end', () => {
                            const ip = data.trim();
                            // 验证IP格式
                            if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) {
                                resolve(ip);
                            } else {
                                reject(new Error('Invalid IP format'));
                            }
                        });
                    }).on('error', reject);
                });
                
                console.log(`通过 ${service} 获取到公网IP: ${ip}`);
                return ip;
            } catch (error) {
                console.log(`获取公网IP失败 (${service}): ${error.message}`);
                continue;
            }
        }
        
        // 方法2: Railway环境变量回退 (如果IP获取失败)
        if (process.env.RAILWAY_PUBLIC_DOMAIN) {
            console.log(`回退到Railway公网域名: ${process.env.RAILWAY_PUBLIC_DOMAIN}`);
            return process.env.RAILWAY_PUBLIC_DOMAIN;
        }
        
        // Railway的其他可能环境变量
        if (process.env.RAILWAY_STATIC_URL) {
            const railwayUrl = process.env.RAILWAY_STATIC_URL.replace(/^https?:\/\//, '');
            console.log(`回退到Railway静态URL: ${railwayUrl}`);
            return railwayUrl;
        }
        
        // 方法3: 从WebSocket请求头获取
        if (clientInfo.serverHost && 
            clientInfo.serverHost !== 'localhost' && 
            clientInfo.serverHost !== '127.0.0.1') {
            console.log(`回退到请求头地址: ${clientInfo.serverHost}`);
            return clientInfo.serverHost;
        }
        
        // 方法4: 回退到本机网络接口IP
        const os = require('os');
        const networkInterfaces = os.networkInterfaces();
        for (const interfaceName in networkInterfaces) {
            const interfaces = networkInterfaces[interfaceName];
            for (const iface of interfaces) {
                if (iface.family === 'IPv4' && !iface.internal) {
                    console.log(`使用本机网络接口IP: ${iface.address}`);
                    return iface.address;
                }
            }
        }
        
        // 最后回退
        console.log('无法获取公网IP，使用回退地址');
        return clientInfo.serverHost || '127.0.0.1';
        
    } catch (error) {
        console.error('获取公网IP时发生错误:', error);
        return clientInfo.serverHost || '127.0.0.1';
    }
}

// 处理UDP连接请求
async function handleUDPConnect(clientInfo, data) {
    const { ws } = clientInfo;
    const { localIP = '0.0.0.0', localPort = 0 } = data;
    
    console.log(`客户端 ${clientInfo.id} 请求UDP连接: ${localIP}:${localPort}`);
    
    try {
        // 创建UDP socket
        const udpSocket = dgram.createSocket('udp4');
        clientInfo.udpSocket = udpSocket;
        
        // 监听UDP消息
        udpSocket.on('message', (msg, rinfo) => {
            console.log(`UDP收到数据: ${msg.length} 字节，来自 ${rinfo.address}:${rinfo.port} (客户端: ${clientInfo.id})`);
            sendMessage(ws, {
                type: 'udp_data',
                data: Array.from(msg),
                remoteAddress: rinfo.address,
                remotePort: rinfo.port,
                timestamp: Date.now()
            });
        });
        
        // 保存客户端的真实内网地址信息，用于反向发送
        clientInfo.clientLocalIP = localIP;
        clientInfo.clientLocalPort = localPort;
        
        // 处理绑定错误
        udpSocket.on('error', (error) => {
            console.error(`UDP错误 (客户端 ${clientInfo.id}):`, error);
            sendError(ws, `UDP error: ${error.message}`);
            
            // 清理失败的socket
            if (clientInfo.udpSocket === udpSocket) {
                clientInfo.udpSocket = null;
            }
        });
        
        // 云环境策略：总是绑定到0.0.0.0并让系统分配端口
        // 本地环境：尝试使用客户端指定的配置
        const isCloudEnvironment = process.env.RAILWAY_ENVIRONMENT || 
                                  process.env.NODE_ENV === 'production' ||
                                  process.env.VERCEL || 
                                  process.env.HEROKU_APP_NAME;
        
        let bindIP, bindPort;
        
        if (isCloudEnvironment) {
            // 云环境：强制使用0.0.0.0和系统分配端口
            bindIP = '0.0.0.0';
            bindPort = 0; // 让系统分配可用端口
            console.log(`云环境检测到，使用安全绑定策略: ${bindIP}:${bindPort}`);
        } else {
            // 本地环境：尝试使用客户端配置，但验证IP地址
            if (localIP === '127.0.0.1' || localIP === 'localhost' || localIP === '0.0.0.0') {
                bindIP = localIP;
                bindPort = localPort;
            } else {
                // 客户端IP不是本地地址，使用0.0.0.0
                bindIP = '0.0.0.0';
                bindPort = localPort;
                console.log(`客户端IP ${localIP} 不是本地地址，改用 ${bindIP}`);
            }
        }
        
        console.log(`尝试绑定UDP到: ${bindIP}:${bindPort}`);
        
        // 绑定端口
        udpSocket.bind(bindPort, bindIP, async () => {
            const address = udpSocket.address();
            
            // 记录端口分配情况
            if (address.port !== localPort) {
                console.log(`端口自动分配: 请求端口 ${localPort} -> 分配端口 ${address.port} (客户端: ${clientInfo.id})`);
            }
            
            // 确定要返回给客户端的IP地址
            let clientVisibleIP = address.address;
            
            // 如果绑定到0.0.0.0，尝试获取服务器的实际公网IP地址
            if (address.address === '0.0.0.0') {
                try {
                    // 尝试获取公网IP地址
                    clientVisibleIP = await getPublicIP(clientInfo);
                    console.log(`IP地址解析: 绑定地址 ${address.address} -> 客户端可见地址 ${clientVisibleIP}`);
                } catch (error) {
                    console.error('获取公网IP失败，使用回退地址:', error.message);
                    clientVisibleIP = clientInfo.serverHost || '127.0.0.1';
                }
            }
            
            sendMessage(ws, {
                type: 'udp_connected',
                localAddress: clientVisibleIP,
                localPort: address.port,
                timestamp: Date.now(),
                // 添加原始请求信息，便于客户端对比
                requestedIP: localIP,
                requestedPort: localPort,
                // 添加服务器实际绑定信息
                serverBindAddress: address.address,
                serverBindPort: address.port
            });
            
            console.log(`UDP连接建立成功: ${clientVisibleIP}:${address.port} (服务器绑定: ${address.address}:${address.port}, 客户端: ${clientInfo.id})`);
            
            // 在云环境中提供额外信息
            if (isCloudEnvironment) {
                console.log(`云环境端口管理: 客户端 ${clientInfo.id} 现在可以使用 ${clientVisibleIP}:${address.port} 进行UDP通信`);
            }
        });
        
    } catch (error) {
        console.error(`UDP连接失败 (客户端 ${clientInfo.id}):`, error);
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
    
    // 增加详细日志
    console.log(`客户端 ${clientInfo.id} 尝试发送UDP数据:`);
    console.log(`  目标地址: ${remoteAddress}:${remotePort}`);
    console.log(`  数据长度: ${messageData ? messageData.length : 0} 字节`);
    console.log(`  本地绑定: ${udpSocket.address ? udpSocket.address().address + ':' + udpSocket.address().port : '未知'}`);
    
    // 验证参数
    if (!remoteAddress || !remotePort) {
        const errorMsg = `Invalid remote address: ${remoteAddress}:${remotePort}`;
        console.error(errorMsg);
        sendError(ws, errorMsg);
        return;
    }
    
    if (!messageData || messageData.length === 0) {
        const errorMsg = 'No data to send';
        console.error(errorMsg);
        sendError(ws, errorMsg);
        return;
    }
    
    try {
        const buffer = Buffer.from(messageData);
        console.log(`  发送缓冲区创建成功，大小: ${buffer.length} 字节`);
        
        // 在云环境中添加额外的网络检查
        if (process.env.RAILWAY_ENVIRONMENT) {
            console.log(`  Railway环境检测到，执行UDP发送...`);
        }
        
        udpSocket.send(buffer, remotePort, remoteAddress, (error) => {
            if (error) {
                console.error(`UDP发送失败 (客户端 ${clientInfo.id}):`, error);
                console.error(`  错误代码: ${error.code}`);
                console.error(`  错误消息: ${error.message}`);
                console.error(`  目标: ${remoteAddress}:${remotePort}`);
                
                // 根据错误类型提供更具体的错误信息
                let errorMessage = `UDP send failed: ${error.message}`;
                if (error.code === 'ENETUNREACH') {
                    errorMessage += ' (Network unreachable - 可能是云环境网络限制)';
                } else if (error.code === 'EHOSTUNREACH') {
                    errorMessage += ' (Host unreachable - 目标主机不可达)';
                } else if (error.code === 'ECONNREFUSED') {
                    errorMessage += ' (Connection refused - 目标端口未监听)';
                } else if (error.code === 'EPERM') {
                    errorMessage += ' (Permission denied - 可能是防火墙阻止)';
                }
                
                sendError(ws, errorMessage);
            } else {
                console.log(`UDP发送成功 (客户端 ${clientInfo.id}): ${buffer.length} 字节到 ${remoteAddress}:${remotePort}`);
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
        console.error(`UDP发送异常 (客户端 ${clientInfo.id}):`, error);
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

// 处理向客户端内网IP发送UDP数据的请求
function handleUDPSendToClient(clientInfo, data) {
    const { ws, udpSocket } = clientInfo;
    
    if (!udpSocket) {
        sendError(ws, 'UDP not connected');
        return;
    }
    
    // 使用客户端的内网IP作为目标地址
    const targetIP = clientInfo.clientLocalIP || '127.0.0.1';
    const targetPort = clientInfo.clientLocalPort || 8081;
    const { data: messageData } = data;
    
    console.log(`服务器主动向客户端内网发送UDP数据:`);
    console.log(`  目标地址: ${targetIP}:${targetPort}`);
    console.log(`  数据长度: ${messageData ? messageData.length : 0} 字节`);
    console.log(`  客户端ID: ${clientInfo.id}`);
    
    // 验证参数
    if (!messageData || messageData.length === 0) {
        const errorMsg = 'No data to send to client';
        console.error(errorMsg);
        sendError(ws, errorMsg);
        return;
    }
    
    try {
        const buffer = Buffer.from(messageData);
        console.log(`  发送缓冲区创建成功，大小: ${buffer.length} 字节`);
        
        // 向客户端内网IP发送UDP数据
        udpSocket.send(buffer, targetPort, targetIP, (error) => {
            if (error) {
                console.error(`向客户端内网发送UDP失败 (客户端 ${clientInfo.id}):`, error);
                console.error(`  错误代码: ${error.code}`);
                console.error(`  错误消息: ${error.message}`);
                console.error(`  目标: ${targetIP}:${targetPort}`);
                
                // 根据错误类型提供更具体的错误信息
                let errorMessage = `UDP send to client failed: ${error.message}`;
                if (error.code === 'ENETUNREACH') {
                    errorMessage += ' (Network unreachable - 客户端内网不可达，可能需要NAT穿透)';
                } else if (error.code === 'EHOSTUNREACH') {
                    errorMessage += ' (Host unreachable - 客户端主机不可达)';
                } else if (error.code === 'ECONNREFUSED') {
                    errorMessage += ' (Connection refused - 客户端端口未监听)';
                }
                
                sendError(ws, errorMessage);
            } else {
                console.log(`向客户端内网发送UDP成功 (客户端 ${clientInfo.id}): ${buffer.length} 字节到 ${targetIP}:${targetPort}`);
                sendMessage(ws, {
                    type: 'udp_sent_to_client',
                    bytesSent: buffer.length,
                    targetAddress: targetIP,
                    targetPort: targetPort,
                    timestamp: Date.now()
                });
            }
        });
    } catch (error) {
        console.error(`向客户端内网发送UDP异常 (客户端 ${clientInfo.id}):`, error);
        sendError(ws, `UDP send to client error: ${error.message}`);
    }
}

// 清理资源
function cleanup(clientInfo) {
    if (clientInfo.udpSocket) {
        try {
            const address = clientInfo.udpSocket.address();
            console.log(`清理UDP连接: ${address.address}:${address.port} (客户端: ${clientInfo.id})`);
        } catch (error) {
            // Socket可能已经关闭，忽略错误
        }
        
        clientInfo.udpSocket.removeAllListeners();
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
const PORT = CONFIG.port;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`UDP代理服务器启动成功!`);
    console.log(`HTTP服务器运行在端口 ${PORT}`);
    console.log(`WebSocket服务器运行在端口 ${PORT}`);
    console.log(`健康检查端点: /health`);
    console.log(`状态API端点: /status`);
    
    if (process.env.RAILWAY_ENVIRONMENT) {
        console.log(`=== Railway环境部署成功 ===`);
        
        // 构建公网访问地址
        let publicUrl = '';
        if (process.env.RAILWAY_PUBLIC_DOMAIN) {
            publicUrl = `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
        } else if (process.env.RAILWAY_STATIC_URL) {
            publicUrl = process.env.RAILWAY_STATIC_URL;
        }
        
        if (publicUrl) {
            console.log(`公网HTTP访问: ${publicUrl}`);
            console.log(`公网WebSocket: ${publicUrl.replace('https://', 'wss://')}`);
            console.log(`健康检查: ${publicUrl}/health`);
            console.log(`状态API: ${publicUrl}/status`);
        }
        
        console.log(`客户端应使用WebSocket地址连接UDP代理服务`);
        console.log(`===============================`);
    } else {
        console.log(`本地访问地址: http://localhost:${PORT}`);
        console.log(`本地WebSocket: ws://localhost:${PORT}`);
    }
});

// 监听服务器错误
server.on('error', (error) => {
    console.error('服务器启动错误:', error);
    if (error.code === 'EADDRINUSE') {
        console.error(`端口 ${PORT} 已被占用`);
    }
    process.exit(1);
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