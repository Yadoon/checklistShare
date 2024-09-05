var ReconnectingWebSocket = require('reconnecting-websocket');
var sharedb = require('sharedb/lib/client');
var richText = require('rich-text');
var Quill = require('quill');
sharedb.types.register(richText.type);

// Open WebSocket connection to ShareDB server
var socket = new ReconnectingWebSocket('ws://' + window.location.hostname + ':3000', [], {
    // ShareDB handles dropped messages, and buffering them while the socket
    // is closed has undefined behavior
    maxEnqueuedMessages: 0
});
var connection = new sharedb.Connection(socket);

// For testing reconnection
window.disconnect = function () {
    connection.close();
};
window.connect = function () {
    var socket = new ReconnectingWebSocket('ws://' + window.location.hostname + ':3000', [], {
        // ShareDB handles dropped messages, and buffering them while the socket
        // is closed has undefined behavior
        maxEnqueuedMessages: 0
    });
    connection.bindToSocket(socket);
};

// Create local Doc instance mapped to 'examples' collection document with id 'richtext'
var doc1 = connection.get('collection1', 'docId1');
doc1.subscribe(function (err) {
    if (err) throw err;
    var quill1 = new Quill('#editor1', {theme: 'snow'});
    quill1.setContents(doc1.data);
    quill1.on('text-change', function (delta, oldDelta, source) {
        if (source !== 'user') return;
        doc1.submitOp(delta, {source: quill1});
    });
    doc1.on('op', function (op, source) {
        if (source === quill1) return;
        quill1.updateContents(op);
    });
});

// Create local Doc instance mapped to 'examples' collection document with id 'richtext'
var doc2 = connection.get('collection2', 'docId2');
doc2.subscribe(function (err) {
    if (err) throw err;
    var quill2 = new Quill('#editor2', {theme: 'snow'});
    quill2.setContents(doc2.data);
    quill2.on('text-change', function (delta, oldDelta, source) {
        if (source !== 'user') return;
        doc2.submitOp(delta, {source: quill2});
    });
    doc2.on('op', function (op, source) {
        if (source === quill2) return;
        quill2.updateContents(op);
    });
});

var quillEditor = new Quill('#editor3', {theme: 'snow'});
document.addEventListener('DOMContentLoaded', function () {
    // 获取按钮元素
    var button = document.getElementById('createEditButton');

    // 添加点击事件监听器
    button.addEventListener('click', function () {
        createOrEditDocument();
    });
});

function createOrEditDocument() {
    // 假设你有一个生成 UUID 的函数
    const doc_id = "version" // 使用 UUID 作为 docId
    // 实际id: 如果查询接口报告没有绑定的id,前端生成一个id,否则使用绑定的id
    //const collection = 'checklist' + Date.now(); // 假定的集合名称
    // 固定id用于测试
    const taskset_id = 7
    let collection = 'taskset' + taskset_id.toString()
    // 发送请求到服务器以创建或获取文档
    fetch('api/get-or-create-doc', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({taskset_id:taskset_id, doc_id:doc_id})
    })
        .then(response => response.json())
        .then(data => {
            // 使用从服务器获取的文档信息
            const doc = connection.get(collection, doc_id);
            doc.subscribe(function (err) {
                if (err) throw err;
                // 初始化 Quill 编辑器并与 Doc 实例关联
                quillEditor.setContents(doc.data);
                // 设置事件监听器以同步编辑操作
                quillEditor.on('text-change', (delta, oldDelta, source) => {
                    if (source !== 'user') return;
                    doc.submitOp(delta, {source: quillEditor});
                });
                doc.on('op', (op, source) => {
                    if (source === quillEditor) return;
                    quillEditor.updateContents(op);
                });
            });
        })
        .catch(error => console.error('Error creating or getting document:', error));
}
