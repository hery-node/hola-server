const { init_router } = require('../../http/router')

module.exports = init_router({
    creatable: true,
    readable: true,
    updatable: true,
    deleteable: true,
    collection: "role",
    primary_keys: ["name"],
    ref_label: "name",
    fields: [
        { name: "name", type: "string", required: true },
        { name: "desc", type: "string" }
    ]
});;