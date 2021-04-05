const { init_router } = require('../../http/router')

module.exports = init_router({
    creatable: true,
    readable: true,
    updatable: true,
    deleteable: true,
    collection: "user",
    primary_keys: ["name"],
    fields: [
        { name: "name", required: true },
        { name: "email", type: "string" },
        { name: "age", type: "uint" },
        { name: "role", type: "array", ref: "role", required: true },
        { name: "status", type: "boolean", sys: true }
    ]
});