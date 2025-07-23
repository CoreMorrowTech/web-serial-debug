#!/bin/bash
echo "启动UDP代理服务器..."
echo ""
echo "请确保已安装Node.js和依赖包"
echo "如果未安装依赖，请先运行: npm install"
echo ""
echo "服务器启动后，请打开浏览器访问 index.html"
echo "然后选择UDP模式进行测试"
echo ""
echo "按Ctrl+C停止服务器"
echo ""
node udp-proxy-server.js