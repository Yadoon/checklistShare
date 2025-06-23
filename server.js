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
startServer().then(r => null).catch(err => {
  console.error('服务启动失败:', err);
  process.exit(1);
});


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
  try {
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
      if (err) {
        console.error('获取文档失败:', err);
        return;
      }
      if (doc.type === null) {
        doc.create({value: 0}, json1.type.uri, function (err) {
          if (err) {
            console.error('创建文档失败:', err);
            return;
          }
          // 文档已创建，现在可以安全地订阅更改
          doc.subscribe(function (err) {
            if (err) {
              console.error('订阅文档变更失败:', err);
              return;
            }
            console.log('Document 1 changed');
            // 处理文档1的更改
          });
        });
      } else {
        // 文档已存在，直接订阅更改
        doc.subscribe(function (err) {
          if (err) {
            console.error('订阅文档变更失败:', err);
            return;
          }
          console.log('Document 1 changed');
          // 处理文档1的更改
        });
      }
    });

    wss.on('connection', function (ws) {
      // 为每个新的WebSocket连接创建一个WebSocketJSONStream实例
      var stream = new WebSocketJSONStream(ws);
      
      // 为stream添加错误处理
      stream.on('error', function(error) {
        console.error('WebSocketJSONStream 错误:', error);
        // 避免错误传播导致服务器崩溃
      });
      
      // 使用这个stream来监听ShareDB的连接
      try {
        ins.listen(stream);
      } catch (error) {
        console.error('ShareDB 监听错误:', error);
        // 如果监听失败，关闭WebSocket连接
        if (ws.readyState === WebSocket.OPEN) {
          ws.close(1011, '服务器内部错误');
        }
        return;
      }
      
      // 添加新连接到客户端列表
      clients.add(ws);
      
      // 错误处理
      ws.on('message', (data) => {
        try {
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
            console.error('处理WebSocket消息错误:', error);
            // 发送错误响应给客户端
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'error',
                message: '无效的消息格式'
              }));
            }
          }
        } catch (error) {
          console.error('处理消息时发生未预期的错误:', error);
        }
        // 你可以在这里处理消息，或者转发给其他监听器
      });
      
      // 当有新连接时，向所有已连接的客户端发送通知帮
      try {
        broadcast('newUserConnected');
      } catch (error) {
        console.error('广播新用户连接消息失败:', error);
      }
      
      // 监听关闭事件，从客户端列表中移除
      ws.on('close', async function () {
        try {
          broadcast('userDisconnected');
          const taskset_id = Number(clientsMap.get(ws)?.taskset_id);
          console.log('taskset_id', taskset_id);
          let res;
          if (taskset_id) {
            try {
              const appConfig = await getConfig();
              const baseUrl = appConfig?.api?.['checklist-backend'] || 'http://checklist.test.com'
              const client = new HttpClient(baseUrl);
              console.log('start syncing...');
              // 调用client.get，传入路径、查询参数和headers（包含Cookie）
              res = await client.get('/server/taskset_verbose/sync', {taskset_id: taskset_id});
              console.log(res);
            } catch (httpError) {
              console.error('同步请求失败:', httpError);
            }
          }
          clientsMap.delete(ws);
          clients.delete(ws);
        } catch (error) {
          console.error('处理WebSocket关闭事件时发生错误:', error);
          // 确保客户端被移除
          clientsMap.delete(ws);
          clients.delete(ws);
        }
      });

      // 错误处理
      ws.on('error', function (error) {
        console.error('WebSocket错误:', error);
        // 确保发生错误时客户端被清理
        try {
          clientsMap.delete(ws);
          clients.delete(ws);
        } catch (cleanupError) {
          console.error('清理WebSocket资源时发生错误:', cleanupError);
        }
      });
    });
    
    // 处理WebSocket服务器错误
    wss.on('error', function(error) {
      console.error('WebSocket服务器错误:', error);
    });

    //  启动服务器
    const httpPort = appConfig?.port?.['http'] || 8080; // 确保这里有一个默认值
    server.listen(httpPort, () => {
      console.log('HTTP Server listening on http://localhost:' + httpPort.toString());
    });
    
    // 添加HTTP服务器错误处理
    server.on('error', function(error) {
      console.error('HTTP服务器错误:', error);
    });
    
    // 添加未捕获异常处理
    process.on('uncaughtException', (err) => {
      console.error('未捕获的异常:', err);
      // 不立即退出，让服务继续运行
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error('未处理的Promise拒绝:', reason);
    });
    
  } catch (error) {
    console.error('服务器启动过程中发生错误:', error);
    throw error; // 重新抛出以便主程序可以处理
  }
}

// 广播函数
function broadcast(message) {
  for (const client of clients) {
    try {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({type: 'notification', message}));
      }
    } catch (error) {
      console.error('广播消息失败:', error);
      // 继续处理其他客户端
    }
  }
}

