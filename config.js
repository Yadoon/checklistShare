const yaml = require('js-yaml');
const NacosConfigClient = require('nacos').NacosConfigClient;
// 创建一个全局变量来存储配置
global.nacosConfig = {};
// nacos服务地址
const nacosServerAddress = 'nacos.qa.com:80';
// namespace: 名称空间必须在服务器上存在
const testNameSpase = "1748cc96-8f84-446d-9d75-6506781282d5";
const providerNameSpase = process.env.namespace || testNameSpase;
// 名称空间下的Group
const group = 'DEFAULT_GROUP';
// 命名空间下的Data Id
const dataId = 'YOKA-QA-CHECKLIST-SHARED-EDITOR.yml';

// 创建 Nacos 配置客户端实例
const configClient = new NacosConfigClient({
    serverAddr: nacosServerAddress,
    namespace: providerNameSpase,
});

const fetchAndApplyConfig = async () => {
    try {
        const content = await configClient.getConfig(dataId, group);
        console.log('[Nacos] get str：', content);
        // 解析 YAML 字符串为 JavaScript 对象
        global.nacosConfig = yaml.load(content, {schema: yaml.JSON_SCHEMA});
        console.log('[Nacos] get data：', global.nacosConfig);
        return global.nacosConfig
    } catch (error) {
        console.error('[Nacos] 获取配置失败：', error);
        throw error;
    }
};

module.exports = {
    getConfig: fetchAndApplyConfig,
};