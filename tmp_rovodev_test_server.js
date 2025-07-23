// 测试UDP代理服务器启动
console.log('测试UDP代理服务器...');

try {
    // 启动服务器
    require('./udp-proxy-server.js');
    console.log('✅ 服务器启动成功！');
} catch (error) {
    console.error('❌ 服务器启动失败:', error.message);
    process.exit(1);
}