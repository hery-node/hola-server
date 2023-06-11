const axios = require('axios');
const { get_settings } = require("../setting");

const url = function (url, method) {
    const settings = get_settings();
    const axios_config = settings.axios;

    return function (config) {
        let params = {
            url: url,
            method: method,
            validateStatus: false
        };
        if (axios_config.proxy) {
            params.proxy = axios_config.proxy;
        }
        return axios.request({ ...params, ...config });
    }
};


module.exports = { url }
