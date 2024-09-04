var http = require('http');
var express = require('express');
const componentsRouter = require('./routes/components');
const yaml = require('js-yaml');
var WebSocket = require('ws');
var WebSocketJSONStream = require('@teamwork/websocket-json-stream');
// var config = require('./config');
const getShareDb = require('./connection/ShareDbInstance');
const {getConfig} = require("./config");
const clients = new Set(); // 存储所有客户端
startServer().then(r => null);

async function startServer() {
    const ins = await getShareDb();
    const connection = ins.connect();
    // Create a web server to serve files and listen to WebSocket connections
    var app = express();
    app.use(express.json());
    app.use('/api', componentsRouter);

    app.use(express.static('static'));
    app.use(express.static('node_modules/quill/dist'));
    var server = http.createServer(app);
    // Connect any incoming WebSocket connection to ShareDB
    var wss = new WebSocket.Server({port: 3000});
    // 获取第一个文档
    const doc1 = connection.get('collection1', 'docId1');

    doc1.fetch(function (err, snapshot) {
        if (err) {
            // 处理错误，例如通过回调函数、Promise 拒绝或抛出异常（如果外部有捕获机制）
            console.error('Failed to fetch document:', err);
            return;
        }

        // 如果文档不存在（这取决于您的具体实现和 ShareDB 版本，但这里是一个示例）
        if (doc1.type === null) {
            // 创建文档
            doc1.create([{insert: 'Hi!1'}], 'rich-text', function (err) {
                if (err) {
                    console.error('Failed to create document:', err);
                    return;
                }
                // 文档已创建，现在可以安全地订阅更改
                doc1.subscribe(function () {
                    console.log('Document 1 changed');
                    // 处理文档1的更改
                });
            });
        } else {
            // 文档已存在，直接订阅更改
            doc1.subscribe(function () {
                console.log('Document 1 changed');
                // 处理文档1的更改
            });
        }
    });

    // 获取第二个文档
    const doc2 = connection.get('collection2', 'docId2');

    doc2.fetch(function (err, snapshot) {
        if (err) {
            // 处理错误，例如通过回调函数、Promise 拒绝或抛出异常（如果外部有捕获机制）
            console.error('Failed to fetch document:', err);
            return;
        }

        // 如果文档不存在（这取决于您的具体实现和 ShareDB 版本，但这里是一个示例）
        if (doc2.type === null) {
            // 创建文档
            doc2.create([{insert: 'Hi!2'}], 'rich-text', function (err) {
                if (err) {
                    console.error('Failed to create document:', err);
                    return;
                }
                // 文档已创建，现在可以安全地订阅更改
                doc2.subscribe(function () {
                    console.log('Document 2 changed');
                    // 处理文档1的更改
                });
            });
        } else {
            // 文档已存在，直接订阅更改
            doc2.subscribe(function () {
                console.log('Document 2 changed');
                // 处理文档2的更改
            });
        }
    });

    wss.on('connection', function (ws) {
        // 为每个新的WebSocket连接创建一个WebSocketJSONStream实例
        var stream = new WebSocketJSONStream(ws);
        // 使用这个stream来监听ShareDB的连接
        ins.listen(stream);
        // 添加新连接到客户端列表
        clients.add(ws);

        // 当有新连接时，向所有已连接的客户端发送通知
        broadcast('newUserConnected');

        // 监听关闭事件，从客户端列表中移除
        ws.on('close', function () {
            clients.delete(ws);
        });

        // 错误处理
        ws.on('error', function (error) {
            console.error('WebSocket error:', error);
        })
    });
    // // 启动服务器
    server.listen(8080, () => {
        console.log('HTTP Server listening on http://localhost:8080');
    });
}

// 广播函数
function broadcast(message) {
    for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({type: 'notification', message}));
        }
    }
}