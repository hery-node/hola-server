/**
 * @fileoverview Message sending utility functions using wxmnode.
 * @module core/msg
 */

const wxm = require('wxmnode');

/**
 * Initialize wxm with credentials.
 * @param {string} name - Account name.
 * @param {string} password - Account password.
 */
const init_wxm = (name, password) => wxm.init(name, password);

/**
 * Send message via wxm.
 * @param {string} content - Message content.
 * @param {string} type - Message type.
 * @param {Object} detail - Additional message details.
 * @returns {Promise<Object>} Message send result.
 */
const send_msg = async (content, type, detail) => await wxm.sendMsg(content, type, detail);

module.exports = { init_wxm, send_msg };