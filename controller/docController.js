const {json} = require("express");
require("@teamwork/websocket-json-stream");
const {getConfig} = require("../config");
const json1 = require("ot-json1");
const getShareDb = require("../connection/ShareDbInstance");
// Create initial document then fire callback

subscribeResult = {}

function createDoc(collection_id, doc_id) {
    // 安全地获取文档
    const doc = connection.get(collection_id, doc_id);
    doc.fetch((err, snapshot) => {
        if (err) {
            subscribeResult[`${doc_id}`] = false;
        }

        if (doc.type === null) {
            // Create the document
            doc.create({value: ''}, json1.type.uri, (err) => {
                if (err) {
                    console.error('Failed to create document:', err);
                }
                // Document has been created, now safely subscribe to changes
                doc.subscribe(() => {
                    console.log(`${collection_id}:${doc_id} changed`);
                    // Handle document changes here
                });
                console.log(json({
                    cd: 0,
                    msg: 'Document created',
                    data: {collection_id, doc_id}
                }));
            });
        } else {
            // 文档已存在，直接订阅更改
            doc.subscribe(() => {
                console.log(`${collection_id}:${doc_id} changed`);
                // 处理文档的更改
            });
            console.log(json({
                cd: 0,
                msg: 'Document exists',
                data: {collection_id, doc_id}
            }));
        }
    });
}

const batchSubscribe = async (req, res) => {
    try {
        const ins = await getShareDb();
        const connection = ins.connect()
        const {taskset_id, doc_ids} = req.body;
        // 检查请求头中是否存在cookie
        console.log("cookie:", req.headers.cookie);
        console.log("body:");
        console.log(req.body);

        if (!doc_ids) {
            // 如果没有doc_id，直接返回错误
            return res.status(200).json({
                cd: 1,
                msg: 'Missing required parameter doc_ids',
                data: {}
            });
        }

        if (!taskset_id) {
            // 如果没有taskset_id
            return res.status(200).json({
                cd: 1,
                msg: 'Missing required parameters taskset_id ',
                data: {}
            });
        }


        let collection_id = `taskset${taskset_id}`
        console.log("collection:", collection_id);
        console.log("doc_id:", doc_ids);

        const subscribeResults = {};

        // 使用 Promise.all 来等待所有异步操作完成
        await Promise.all(doc_ids.map(async (doc_id) => {
            try {
                // 安全地获取文档
                const doc = connection.get(collection_id, doc_id);
                await new Promise((resolve, reject) => {
                    doc.fetch((err, snapshot) => {
                        if (err) {
                            subscribeResults[`${doc_id}`] = false;
                            reject(err);
                        }

                        if (doc.type === null) {
                            // 创建文档
                            doc.create({value: ''}, json1.type.uri, (err) => {
                                if (err) {
                                    console.error('Failed to create document:', err);
                                    subscribeResults[`${doc_id}`] = false;
                                    reject(err);
                                }
                                // 文档已创建，现在安全订阅更改
                                doc.subscribe(() => {
                                    console.log(`${collection_id}:${doc_id} changed`);
                                    // 处理文档变化
                                });
                                subscribeResults[`${doc_id}`] = true;
                                resolve();
                            });
                        } else {
                            // 文档已存在，直接订阅更改
                            doc.subscribe(() => {
                                console.log(`${collection_id}:${doc_id} changed`);
                                // 处理文档变化
                            });
                            subscribeResults[`${doc_id}`] = true;
                            resolve();
                        }
                    });
                });
            } catch (e) {
                console.error(`Error subscribing to ${doc_id}:`, e);
                subscribeResults[`${doc_id}`] = false;
            }
        }));

        // 所有异步操作完成后返回响应
        return res.status(200).json({
            cd: 0,
            msg: 'Subscription completed',
            data: subscribeResults
        });

    } catch (e) {
        console.error(e);
        return res.status(500).json({
            cd: 1,
            msg: 'An error occurred',
            data: {}
        });
    }
};

module.exports = {batchSubscribe};
