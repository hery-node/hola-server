const crypto = require('crypto');
const { get_settings } = require('../setting');

const md5 = (content) => {
    const md5 = crypto.createHash('md5');
    return md5.update(content).digest('hex');
}

const encrypt_pwd = (password) => {
    const crypto_key = get_settings().encrypt.key;

    const str = `BGT*&+${password}&76w${crypto_key}`;
    return md5(str);
}

module.exports = { encrypt_pwd };