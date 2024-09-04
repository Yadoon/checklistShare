const axios = require('axios');

class HttpClient {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }

    /**
     * 发送GET请求
     * @param {string} path - 请求路径
     * @param params
     * @param {Object} [options] - 请求选项，例如headers
     * @param {string} cookie
     * @returns {Promise<Object>} 返回一个Promise，解析为响应对象
     */
    async get(path, params = {}, cookie = '', options = {}) {
        // 将查询参数作为axios请求配置的一部分传递
        try {
            options.headers = options.headers || {};
            options.headers.cookie = cookie;
            const response = await axios.get(`${this.baseUrl}${path}`, {...options, params});
            return response.data;
        } catch (error) {
            console.error('请求出错:', error);
            throw error;
        }
    }
}

module.exports = HttpClient;
