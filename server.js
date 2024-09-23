var http = require('http');
var express = require('express');
var ShareDB = require('sharedb');
var WebSocket = require('ws');
var WebSocketJSONStream = require('@teamwork/websocket-json-stream');
var json1 = require('ot-json1');
const getShareDb = require("./connection/ShareDbInstance");
const componentsRouter = require("./routes/components");
const {getConfig} = require("./config");
const HttpClient = require("./service/httpClient");
const clients = new Set(); // 存储所有客户端
const clientsMap = new Map(); // 存储所有客户端
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
    // 错误处理
    ws.on('message', (data) => {
      console.log('current_client_map:');
      clientsMap.forEach((value, key) => {
        console.log(`Key: key, Value: ${JSON.stringify(value)}`);
      });
      // 假设data是一个Buffer，且包含的是utf8编码的JSON字符串
      let jsonString;
      try {
        // 尝试将Buffer转换为utf8编码的字符串
        jsonString = data.toString('utf8');
        // 尝试将字符串解析为JSON对象
        let jsonObject = JSON.parse(jsonString);
        console.log('Received JSON object:', jsonObject);
        if (jsonObject.c) {
          const collection_id = jsonObject.c;
          if (collection_id.match(/taskset\d+/)) {
            let bindInfo = {
              taskset_id: collection_id.split('taskset')[1],
            }
            clientsMap.set(ws, bindInfo);
          }
        }
        // 在这里处理JSON对象
      } catch (error) {
        // 如果转换或解析过程中发生错误，则捕获并处理错误
        console.error('Error processing WebSocket message:', error);
      }
      // 你可以在这里处理消息，或者转发给其他监听器
    });
    // 当有新连接时，向所有已连接的客户端发送通知帮
    broadcast('newUserConnected');
    // 监听关闭事件，从客户端列表中移除
    ws.on('close', async function () {
      broadcast('userDisconnected');
      const taskset_id = Number(clientsMap.get(ws)?.taskset_id);
      console.log('taskset_id', taskset_id);
      let res;
      if (taskset_id) {
        const appConfig = await getConfig();
        const baseUrl = appConfig?.api?.['checklist-backend'] || 'http://checklist.test.com'
        const client = new HttpClient(baseUrl);
        console.log('start syncing...');
        // 调用client.get，传入路径、查询参数和headers（包含Cookie）
        res = await client.get('/server/taskset_verbose/sync', {taskset_id: taskset_id})
        console.log(res);
      }
      clientsMap.delete(ws);
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

