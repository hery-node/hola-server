const { AsyncLocalStorage } = require('async_hooks');
const asyncLocalStorage = new AsyncLocalStorage();

const set_context_value = (key, obj) => {
    const store = asyncLocalStorage.getStore();
    store && (store[key] = obj);
}

const get_context_value = (key) => {
    const store = asyncLocalStorage.getStore();
    if (!store) {
        return null;
    }
    return store[key];
}

module.exports = { asyncLocalStorage, set_context_value, get_context_value }
