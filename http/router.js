const path = require("path");
const fs = require("fs");
const express = require('express');

const { EntityMeta, validate_all_metas } = require('../core/meta');
const { init_create_router } = require('../router/create');
const { init_read_router } = require('../router/read');
const { init_update_router } = require('../router/update');
const { init_delete_router } = require('../router/delete');
const { get_settings } = require('../setting');

/**
 * Automatically load all the routers from the router directory
 * @param {express app} app 
 * @param {base dir of the project} base_dir 
 */
const init_router_dirs = (app, base_dir) => {
    const route_dirs = get_settings().server.routes;

    route_dirs.forEach(route_dir => {
        const full_route_dir = path.join(base_dir, route_dir);
        const routes = fs.readdirSync(full_route_dir);
        routes.forEach(route => {
            const router = require(`${base_dir}/${route_dir}/${route}`);
            const basename = path.basename(route, '.js');
            app.use('/' + basename, router);
        });
    });

    //after init all the router, then validate all the meta informations
    validate_all_metas();
}

/**
 * Init all the router for the entity
 * @param {meta config of the entity} meta 
 */
const init_router = function (meta) {
    const router = express.Router();
    const meta_entity = new EntityMeta(meta);

    if (meta_entity.creatable) {
        init_create_router(router, meta_entity);
    }

    if (meta_entity.readable) {
        init_read_router(router, meta_entity);
    }

    if (meta_entity.updatable) {
        init_update_router(router, meta_entity);
    }

    if (meta_entity.deleteable) {
        init_delete_router(router, meta_entity);
    }

    if (meta.route) {
        meta.route(router, meta_entity);
    }

    return router;
}

module.exports = { init_router_dirs, init_router };
