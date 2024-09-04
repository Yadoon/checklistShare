const ShareDB = require('sharedb');
const Mongo = require('sharedb-mongo');
const richText = require("rich-text");
const {getConfig} = require('../config');

let dbInstance = null;
let dbInstancePromise = null;

async function createSharedDB() {
    try {
        const appConfig = await getConfig();
        console.log('配置已加载到全局变量：', appConfig);
        const mongoUrl = appConfig?.db?.['mongodb-url'] || 'mongodb://10.225.137.189:27018'; // 确保这里有一个默认值
        const db = Mongo(mongoUrl, {db: 'atlas-mongo', collection: 'ops'});
        ShareDB.types.register(richText.type);
        return new ShareDB({db});
    } catch (error) {
        console.error('获取配置出错：', error);
        const defaultConfig = {
            db: {
                'mongodb-url': 'mongodb://10.225.137.189:27018'
            },
            api: {
                'checklist-backend': 'http://report.test.com'
            }
        };
        console.warn('使用默认配置：', defaultConfig);
        const mongoUrl = defaultConfig.db['mongodb-url'];
        const db = Mongo(mongoUrl, {db: 'atlas-mongo', collection: 'ops'});
        ShareDB.types.register(richText.type);
        return new ShareDB({db});
    }
}

async function getShareDb() {
    if (!dbInstancePromise) {
        dbInstancePromise = await createSharedDB().then(db => {
            dbInstance = db;
            return db;
        });
    }
    if (!dbInstance) {
        // 如果 dbInstance 还未被赋值，等待 Promise 解析
        dbInstance = await dbInstancePromise;
    }
    return dbInstance;
}

module.exports = getShareDb;