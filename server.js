var http = require('http');
var express = require('express');
var ShareDB = require('sharedb');
var WebSocket = require('ws');
var WebSocketJSONStream = require('@teamwork/websocket-json-stream');
var json1 = require('ot-json1');
const getShareDb = require("./connection/ShareDbInstance");
const componentsRouter = require("./routes/components");
const {getConfig} = require("./config");
const clients = new Set(); // 存储所有客户端
startServer().then(r => null);


// Create initial document then fire callback
function createDoc(callback) {
  var connection = backend.connect();
  var doc = connection.get('examples', 'counter');
  doc.fetch(function (err) {
    if (err) throw err;
    if (doc.type === null) {
      doc.create({value: 0}, json1.type.uri, callback);
      return;
    }
    callback();
  });
}
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
  const appConfig = await getConfig();
  const wsPort = appConfig?.port?.['ws'] || 3000; // 确保这里有一个默认值
  var wss = new WebSocket.Server({port: wsPort});

  var doc = connection.get('examples', 'counter');
  doc.fetch(function (err) {
    if (err) throw err;
    if (doc.type === null) {
      doc.create({value: 0}, json1.type.uri, function (err) {
        if (err) {
          console.error('Failed to create document:', err);
          return;
        }
        // 文档已创建，现在可以安全地订阅更改
        doc.subscribe(function () {
          console.log('Document 1 changed');
          // 处理文档1的更改
        });
      });
    } else {
      // 文档已存在，直接订阅更改
      doc.subscribe(function () {
        console.log('Document 1 changed');
        // 处理文档1的更改
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

    // 当有新连接时，向所有已连接的客户端发送通知帮
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
  //  启动服务器
  const httpPort = appConfig?.port?.['http'] || 8080; // 确保这里有一个默认值
  server.listen(httpPort, () => {
    console.log('HTTP Server listening on http://localhost:' + httpPort.toString());
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

// function startServer() {
//   // Create a web server to serve files and listen to WebSocket connections
//   var app = express();
//   app.use(express.static('static'));
//   var server = http.createServer(app);
//
//   // Connect any incoming WebSocket connection to ShareDB
//   var wss = new WebSocket.Server({server: server});
//   wss.on('connection', function(ws) {
//     var stream = new WebSocketJSONStream(ws);
//     backend.listen(stream);
//   });
//
//   server.listen(8080);
//   console.log('Listening on http://localhost:8080');
// }
