/**
 * @fileoverview Express router initialization and loading utilities.
 * @module http/router
 */

const path = require("path");
const fs = require("fs");
const express = require('express');

const { EntityMeta, validate_all_metas } = require('../core/meta');
const { init_create_router } = require('../router/create');
const { init_read_router } = require('../router/read');
const { init_update_router } = require('../router/update');
const { init_clone_router } = require('../router/clone');
const { init_delete_router } = require('../router/delete');
const { get_settings } = require('../setting');

/** CRUD operation configurations: [capability_key, init_function] */
const CRUD_OPERATIONS = [
    ['creatable', init_create_router],
    ['readable', init_read_router],
    ['updatable', init_update_router],
    ['cloneable', init_clone_router],
    ['deleteable', init_delete_router],
];

/**
 * Automatically load all router modules from configured directories.
 * Scans directories specified in settings.server.routes and mounts each router.
 * After loading, validates all entity metadata definitions.
 * @param {Object} app - Express application instance.
 * @param {string} base_dir - Base directory of the project.
 */
const init_router_dirs = (app, base_dir) => {
    const settings = get_settings();
    if (!settings?.server?.routes) {
        return;
    }

    for (const route_dir of settings.server.routes) {
        const full_route_dir = path.join(base_dir, route_dir);
        if (!fs.existsSync(full_route_dir)) {
            continue;
        }

        for (const route of fs.readdirSync(full_route_dir)) {
            if (!route.endsWith('.js')) {
                continue;
            }

            const router = require(`${base_dir}/${route_dir}/${route}`);
            const basename = path.basename(route, '.js');
            app.use('/' + basename, router);
        }
    }

    validate_all_metas();
};

/**
 * Initialize Express router for an entity with CRUD operations.
 * Registers routes based on entity metadata capabilities (creatable, readable, etc.).
 * @param {Object} meta - Entity metadata configuration.
 * @returns {Object} Configured Express router.
 */
const init_router = (meta) => {
    const router = express.Router();
    const meta_entity = new EntityMeta(meta);

    for (const [capability, init_fn] of CRUD_OPERATIONS) {
        if (meta_entity[capability]) {
            init_fn(router, meta_entity);
        }
    }

    if (typeof meta.route === 'function') {
        meta.route(router, meta_entity);
    }

    return router;
};

module.exports = { init_router_dirs, init_router };
