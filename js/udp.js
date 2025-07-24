;(function () {
    // UDP相关变量
    let udpSocket = null;
    let udpConnected = false;
    let currentConnectionType = 'serial'; // 'serial' 或 'udp'
    
    // UDP配置选项
    let udpOptions = {
        remoteIP: '127.0.0.1',
        remotePort: 8080,
        localIP: '0.0.0.0',
        localPort: 8081
    };

    // 读取UDP配置
    let savedUdpOptions = localStorage.getItem('udpOptions');
    if (savedUdpOptions) {
        udpOptions = JSON.parse(savedUdpOptions);
        document.getElementById('udp-remote-ip').value = udpOptions.remoteIP;
        document.getElementById('udp-remote-port').value = udpOptions.remotePort;
        document.getElementById('udp-local-ip').value = udpOptions.localIP;
        document.getElementById('udp-local-port').value = udpOptions.localPort;
    }

    // 连接类型切换事件
    document.querySelectorAll('input[name="connection-type"]').forEach(radio => {
        radio.addEventListener('change', function() {
            currentConnectionType = this.value;
            switchConnectionType(this.value);
        });
    });

    // 切换连接类型
    function switchConnectionType(type) {
        const serialConfig = document.getElementById('serial-config');
        const udpConfig = document.getElementById('udp-config');
        const logTitle = document.getElementById('log-title');
        
        if (type === 'serial') {
            serialConfig.style.display = 'block';
            udpConfig.style.display = 'none';
            logTitle.textContent = '串口日志';
        } else if (type === 'udp') {
            serialConfig.style.display = 'none';
            udpConfig.style.display = 'block';
            logTitle.textContent = 'UDP日志';
        }
    }

    // UDP配置参数变化事件
    document.getElementById('udp-remote-ip').addEventListener('change', function() {
        udpOptions.remoteIP = this.value;
        saveUdpOptions();
    });

    document.getElementById('udp-remote-port').addEventListener('change', function() {
        udpOptions.remotePort = parseInt(this.value);
        saveUdpOptions();
    });

    document.getElementById('udp-local-ip').addEventListener('change', function() {
        udpOptions.localIP = this.value;
        saveUdpOptions();
    });

    document.getElementById('udp-local-port').addEventListener('change', function() {
        udpOptions.localPort = parseInt(this.value);
        saveUdpOptions();
    });

    // 保存UDP配置
    function saveUdpOptions() {
        localStorage.setItem('udpOptions', JSON.stringify(udpOptions));
    }

    // UDP连接/断开按钮事件
    document.getElementById('udp-connect-or-disconnect').addEventListener('click', function() {
        if (udpConnected) {
            disconnectUDP();
        } else {
            connectUDP();
        }
    });

    // 连接UDP
    async function connectUDP() {
        try {
            // 检查浏览器是否支持UDP Socket API (实验性功能)
            if (!('UDPSocket' in window)) {
                // 使用WebSocket作为UDP的替代方案
                connectWebSocketUDP();
                return;
            }

            // 使用原生UDP Socket (如果支持)
            udpSocket = new UDPSocket({
                localAddress: udpOptions.localIP,
                localPort: udpOptions.localPort
            });

            await udpSocket.opened;
            udpConnected = true;
            updateUDPStatus(true);
            addLogErr('UDP连接成功: ' + udpOptions.localIP + ':' + udpOptions.localPort);

            // 监听UDP数据
            udpSocket.readable.getReader().read().then(function processUDPData({value, done}) {
                if (done) return;
                if (value) {
                    handleUDPReceive(value.data, value.remoteAddress, value.remotePort);
                }
                return udpSocket.readable.getReader().read().then(processUDPData);
            });

        } catch (error) {
            addLogErr('UDP连接失败: ' + error.message);
            // 回退到WebSocket方案
            connectWebSocketUDP();
        }
    }

    // 使用WebSocket代理UDP连接
    function connectWebSocketUDP() {
        try {
            // 获取代理服务器地址（可配置）
            const proxyServer = getProxyServerUrl();
            
            addLogErr('正在通过WebSocket代理连接UDP...');
            addLogErr('代理服务器: ' + proxyServer);
            
            // 创建WebSocket连接到代理服务器
            const ws = new WebSocket(proxyServer);
            
            ws.onopen = function() {
                addLogErr('WebSocket代理连接成功，正在建立UDP连接...');
                
                // 请求建立UDP连接
                ws.send(JSON.stringify({
                    type: 'udp_connect',
                    localIP: udpOptions.localIP,
                    localPort: udpOptions.localPort
                }));
            };
            
            ws.onmessage = function(event) {
                try {
                    const data = JSON.parse(event.data);
                    handleProxyMessage(data);
                } catch (error) {
                    addLogErr('代理消息解析错误: ' + error.message);
                }
            };
            
            ws.onclose = function(event) {
                udpConnected = false;
                updateUDPStatus(false);
                udpSocket = null;
                addLogErr('WebSocket代理连接已断开 (代码: ' + event.code + ')');
            };
            
            ws.onerror = function(error) {
                addLogErr('WebSocket代理连接错误，请检查代理服务器是否运行');
                addLogErr('错误详情: ' + error.message || '连接失败');
                addLogErr('解决方案：');
                addLogErr('1. 启动UDP代理服务器: node udp-proxy-server.js');
                addLogErr('2. 或使用支持UDP Socket API的浏览器');
                addLogErr('3. 或配置其他UDP代理服务器地址');
            };
            
            // 保存WebSocket引用
            udpSocket = ws;
            
        } catch (error) {
            addLogErr('WebSocket代理连接失败: ' + error.message);
        }
    }
    
    // 处理代理服务器消息
    function handleProxyMessage(data) {
        switch (data.type) {
            case 'welcome':
                addLogErr('已连接到UDP代理服务器 (客户端ID: ' + data.clientId + ')');
                break;
                
            case 'udp_connected':
                udpConnected = true;
                updateUDPStatus(true);
                
                // 获取服务器分配的地址和端口
                const serverAssignedIP = data.localAddress;
                const serverAssignedPort = data.localPort;
                const requestedIP = data.requestedIP || udpOptions.localIP;
                const requestedPort = data.requestedPort || udpOptions.localPort;
                
                // 检查并处理端口变化
                if (serverAssignedPort !== requestedPort) {
                    if (requestedPort === 0) {
                        addLogErr(`✅ 系统自动分配端口: ${serverAssignedPort}`);
                    } else {
                        addLogErr(`⚠️  端口已更改: ${requestedPort} → ${serverAssignedPort} (云环境自动分配)`);
                    }
                    
                    // 更新本地配置
                    udpOptions.localPort = serverAssignedPort;
                    document.getElementById('udp-local-port').value = serverAssignedPort;
                    saveUdpOptions();
                }
                
                // 检查并处理IP变化
                if (serverAssignedIP !== requestedIP) {
                    addLogErr(`⚠️  IP地址已更改: ${requestedIP} → ${serverAssignedIP} (云环境安全策略)`);
                    
                    // 更新本地配置
                    udpOptions.localIP = serverAssignedIP;
                    document.getElementById('udp-local-ip').value = serverAssignedIP;
                    saveUdpOptions();
                }
                
                addLogErr(`✅ UDP连接成功: ${serverAssignedIP}:${serverAssignedPort}`);
                
                // 提供用户友好的说明
                if (serverAssignedPort !== requestedPort || serverAssignedIP !== requestedIP) {
                    addLogErr('📝 配置已自动更新，下次连接将使用新的地址和端口');
                }
                break;
                
            case 'udp_data':
                handleUDPReceive(data.data, data.remoteAddress, data.remotePort);
                break;
                
            case 'udp_sent':
                addLogErr('UDP数据已发送到: ' + data.remoteAddress + ':' + data.remotePort + ' (' + data.bytesSent + ' 字节)');
                break;
                
            case 'udp_disconnected':
                udpConnected = false;
                updateUDPStatus(false);
                addLogErr('UDP连接已断开');
                break;
                
            case 'error':
                addLogErr('代理服务器错误: ' + data.message);
                break;
                
            case 'pong':
                // 心跳响应
                break;
                
            default:
                console.log('未知代理消息类型:', data.type);
        }
    }

    // 断开UDP连接
    function disconnectUDP() {
        if (udpSocket) {
            if (udpSocket.send) {
                // WebSocket代理模式
                udpSocket.send(JSON.stringify({
                    type: 'udp_disconnect'
                }));
                udpSocket.close();
            } else {
                // 原生UDP Socket模式
                udpSocket.close();
            }
            udpSocket = null;
        }
        udpConnected = false;
        updateUDPStatus(false);
        addLogErr('UDP连接已断开');
    }

    // 更新UDP状态显示
    function updateUDPStatus(connected) {
        const statusDiv = document.getElementById('udp-status');
        const button = document.getElementById('udp-connect-or-disconnect');
        
        if (connected) {
            statusDiv.innerHTML = '<div class="alert alert-success" role="alert">UDP已连接</div>';
            button.textContent = '断开UDP';
            button.classList.remove('btn-primary');
            button.classList.add('btn-danger');
        } else {
            statusDiv.innerHTML = '<div class="alert alert-secondary" role="alert">UDP未连接</div>';
            button.textContent = '连接UDP';
            button.classList.remove('btn-danger');
            button.classList.add('btn-primary');
        }
    }

    // 处理UDP接收数据
    function handleUDPReceive(data, remoteAddress, remotePort) {
        if (currentConnectionType === 'udp') {
            // 将数据转换为Uint8Array格式，与串口数据格式保持一致
            let dataArray;
            if (data instanceof ArrayBuffer) {
                dataArray = new Uint8Array(data);
            } else if (typeof data === 'string') {
                dataArray = new TextEncoder().encode(data);
            } else {
                dataArray = new Uint8Array(data);
            }
            
            // 添加远程地址信息到日志
            addLogErr('UDP收到数据来自: ' + remoteAddress + ':' + remotePort);
            
            // 使用现有的串口日志函数显示数据
            if (window.addLog) {
                window.addLog(Array.from(dataArray), true);
            }
        }
    }

    // 发送UDP数据
    async function sendUDPData(data) {
        if (!udpConnected) {
            addLogErr('请先连接UDP');
            return false;
        }

        try {
            if (udpSocket && udpSocket.writable) {
                // 原生UDP Socket API
                const writer = udpSocket.writable.getWriter();
                await writer.write({
                    data: data,
                    remoteAddress: udpOptions.remoteIP,
                    remotePort: udpOptions.remotePort
                });
                writer.releaseLock();
            } else if (udpSocket && udpSocket.send) {
                // WebSocket代理模式
                udpSocket.send(JSON.stringify({
                    type: 'udp_send',
                    data: Array.from(data),
                    remoteAddress: udpOptions.remoteIP,
                    remotePort: udpOptions.remotePort
                }));
            } else {
                addLogErr('UDP连接状态异常');
                return false;
            }
            
            // 使用现有的串口日志函数显示发送的数据
            if (window.addLog) {
                window.addLog(Array.from(data), false);
            }
            return true;
        } catch (error) {
            addLogErr('UDP发送失败: ' + error.message);
            return false;
        }
    }

    // 获取代理服务器URL
    function getProxyServerUrl() {
        // 优先使用用户自定义配置
        const userConfig = localStorage.getItem('udpProxyServer');
        if (userConfig) return userConfig;
        
        // 根据部署环境自动选择
        const hostname = location.hostname;
        const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
        
        // GitHub Pages部署
        if (hostname && hostname.includes('github.io')) {
            // 这里需要替换为您的实际代理服务器地址
            return 'wss://web-production-b1ff1.up.railway.app';
        }
        
        // 本地开发环境（包括直接打开HTML文件的情况）
        if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1' || location.protocol === 'file:') {
            return 'ws://localhost:8080';
        }
        
        // 其他环境，尝试同域名
        return `${protocol}//${hostname}:8080`;
    }
    
    // 设置代理服务器地址
    function setProxyServerUrl(url) {
        localStorage.setItem('udpProxyServer', url);
        addLogErr('代理服务器地址已更新: ' + url);
    }

    // 导出函数供其他模块使用
    window.udpModule = {
        getCurrentConnectionType: () => currentConnectionType,
        isUDPConnected: () => udpConnected,
        sendUDPData: sendUDPData,
        connectUDP: connectUDP,
        disconnectUDP: disconnectUDP,
        setProxyServerUrl: setProxyServerUrl,
        getProxyServerUrl: getProxyServerUrl
    };

})();