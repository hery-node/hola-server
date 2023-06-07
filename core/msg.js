const wxm = require('wxmnode');

const init_wxm = (name, password) => {
    wxm.init(name, password);
}

const send_msg = async (content, type, detail) => {
    return await wxm.sendMsg(content, type, detail);
}

module.exports = { init_wxm, send_msg }