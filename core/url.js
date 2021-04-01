const axios = require('axios');

const url = function (url, method, proxy) {
    return function (config) {
        let params = {
            url: url,
            method: method
        };
        if (proxy) {
            params.proxy = proxy;
        }
        return axios.request({ ...params, ...config });
    }
};


module.exports = { url }
