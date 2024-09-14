const crypto = require('crypto');
const getShareDb = require('../connection/ShareDbInstance');
const express = require('express');
const HttpClient = require('../service/httpClient');
const {json} = require("express");
require("@teamwork/websocket-json-stream");
const {getConfig} = require("../config");

function generateHash(projectId, reportType) {
    const hash = crypto.createHash('sha256');
    hash.update(`${projectId}-${reportType}`);
    return hash.digest('hex');
}

const getOrCreateDoc = async (req, res) => {
    try {
        const ins = await getShareDb();
        const connection = ins.connect()
        const {taskset_id, doc_id} = req.body;
        // 检查请求头中是否存在cookie
        console.log("cookie:", req.headers.cookie);
        console.log("body:");
        console.log(req.body);

        if (!doc_id) {
            // 如果没有doc_id，直接返回错误
            return res.status(200).json({
                cd: 1,
                msg: 'Missing required parameter doc_id',
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


        let collection = `taskset${taskset_id}`
        console.log("collection:", collection);
        console.log("doc_id:", doc_id);
        // 安全地获取文档
        const doc = connection.get(collection, doc_id);
        // taskset_id > 0 表任务在mysql存在.查询mysql中的数据
        let mysqlTaskset
        let validFlag = false
        if (taskset_id > 0) {
            const appConfig = await getConfig();
            const baseUrl = appConfig?.api?.['checklist-backend'] || 'http://checklist.test.com'
            const client = new HttpClient(baseUrl);
            // 调用client.get，传入路径、查询参数和headers（包含Cookie）
            mysqlTaskset = await client.get('/server/taskset_verbose', {id: taskset_id}, req.headers.cookie)
            if (mysqlTaskset && mysqlTaskset.cd === 0 && mysqlTaskset.data && Array.isArray(mysqlTaskset.data) && mysqlTaskset.data.length > 0) {
                validFlag = mysqlTaskset.data[0].id === taskset_id;
            }
        }
        console.log("validFlag:", validFlag);
        doc.fetch((err, snapshot) => {
            if (err) {
                //  拉取sharedb失败时返回元数据
                if (taskset_id > 0 && validFlag) {
                    return res.status(200).json(mysqlTaskset);
                } else {
                    return res.status(500).json({
                        cd: 1,
                        msg: 'Failed to fetch document',
                        data: {collection, doc_id}
                    });
                }
            }

            if (doc.type === null) {
                // Create the document
                doc.create([{insert: ''}], 'rich-text', (err) => {
                    if (err) {
                        console.error('Failed to create document:', err);
                    }
                    // Document has been created, now safely subscribe to changes
                    doc.subscribe(() => {
                        console.log(`${collection}:${doc_id} changed`);
                        // Handle document changes here
                    });
                    console.log(json({
                        cd: 0,
                        msg: 'Document created',
                        data: {collection, doc_id}
                    }));
                });
                if (validFlag) {
                    return res.status(200).json(mysqlTaskset);
                } else {
                    return res.status(200).json({
                        cd: 0,
                        msg: 'Document created',
                        data: {collection, doc_id}
                    });
                }
            } else {
                // 文档已存在，直接订阅更改
                doc.subscribe(() => {
                    console.log(`${collection}:${doc_id} changed`);
                    // 处理文档的更改
                });
                return res.status(200).json({
                    cd: 0,
                    msg: 'Document exists',
                    data: {collection, doc_id}
                });
            }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            cd: 1,
            msg: 'An error occurred',
            data: {}
        });
    }
};

module.exports = {getOrCreateDoc};
