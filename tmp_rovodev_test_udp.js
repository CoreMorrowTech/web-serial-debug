#!/usr/bin/env node
/**
 * Test script to verify UDP proxy server fixes
 */

const WebSocket = require('ws');

// Test configuration
const TEST_CONFIG = {
    serverUrl: 'ws://localhost:8080',
    testCases: [
        { localIP: '172.20.224.1', localPort: 8081, description: 'Client IP that caused EADDRNOTAVAIL' },
        { localIP: '192.168.1.101', localPort: 8081, description: 'Another client IP that caused EADDRNOTAVAIL' },
        { localIP: '0.0.0.0', localPort: 0, description: 'Standard bind-all case' }
    ]
};

async function testUDPConnection(testCase) {
    return new Promise((resolve, reject) => {
        console.log(`\n测试: ${testCase.description}`);
        console.log(`尝试连接: ${testCase.localIP}:${testCase.localPort}`);
        
        const ws = new WebSocket(TEST_CONFIG.serverUrl);
        let testResult = { success: false, error: null, serverResponse: null };
        
        const timeout = setTimeout(() => {
            ws.close();
            testResult.error = 'Timeout';
            resolve(testResult);
        }, 10000);
        
        ws.on('open', () => {
            console.log('WebSocket连接成功');
            // 发送UDP连接请求
            ws.send(JSON.stringify({
                type: 'udp_connect',
                localIP: testCase.localIP,
                localPort: testCase.localPort
            }));
        });
        
        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data);
                console.log('收到消息:', message.type);
                
                if (message.type === 'udp_connected') {
                    console.log(`✅ UDP连接成功: ${message.localAddress}:${message.localPort}`);
                    testResult.success = true;
                    testResult.serverResponse = message;
                    clearTimeout(timeout);
                    ws.close();
                    resolve(testResult);
                } else if (message.type === 'error') {
                    console.log(`❌ UDP连接失败: ${message.message}`);
                    testResult.error = message.message;
                    clearTimeout(timeout);
                    ws.close();
                    resolve(testResult);
                }
            } catch (error) {
                console.error('消息解析错误:', error);
            }
        });
        
        ws.on('error', (error) => {
            console.log(`❌ WebSocket连接错误: ${error.message}`);
            testResult.error = error.message;
            clearTimeout(timeout);
            resolve(testResult);
        });
        
        ws.on('close', () => {
            console.log('WebSocket连接关闭');
        });
    });
}

async function runTests() {
    console.log('开始测试UDP代理服务器修复...');
    console.log('确保服务器正在运行: node udp-proxy-server.js');
    
    const results = [];
    
    for (const testCase of TEST_CONFIG.testCases) {
        try {
            const result = await testUDPConnection(testCase);
            results.push({ testCase, result });
            
            // 等待一秒再进行下一个测试
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            console.error(`测试失败: ${error.message}`);
            results.push({ testCase, result: { success: false, error: error.message } });
        }
    }
    
    // 输出测试结果总结
    console.log('\n=== 测试结果总结 ===');
    results.forEach(({ testCase, result }, index) => {
        const status = result.success ? '✅ 成功' : '❌ 失败';
        console.log(`${index + 1}. ${testCase.description}: ${status}`);
        if (result.error) {
            console.log(`   错误: ${result.error}`);
        }
        if (result.serverResponse) {
            console.log(`   服务器绑定: ${result.serverResponse.localAddress}:${result.serverResponse.localPort}`);
        }
    });
    
    const successCount = results.filter(r => r.result.success).length;
    console.log(`\n总计: ${successCount}/${results.length} 测试通过`);
    
    if (successCount === results.length) {
        console.log('🎉 所有测试通过！EADDRNOTAVAIL问题已修复。');
    } else {
        console.log('⚠️  部分测试失败，需要进一步调试。');
    }
}

// 运行测试
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = { runTests, testUDPConnection };