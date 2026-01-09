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

/**
 * Automatically load all router modules from configured directories.
 * Scans directories specified in settings.server.routes and mounts each router.
 * After loading, validates all entity metadata definitions.
 * @param {Object} app - Express application instance.
 * @param {string} base_dir - Base directory of the project.
 */
const init_router_dirs = (app, base_dir) => {
    const settings = get_settings();
    if (!settings || !settings.server || !settings.server.routes) {
        return;
    }

    const route_dirs = settings.server.routes;

    route_dirs.forEach((route_dir) => {
        const full_route_dir = path.join(base_dir, route_dir);
        if (!fs.existsSync(full_route_dir)) {
            return;
        }

        const routes = fs.readdirSync(full_route_dir);
        routes.forEach((route) => {
            if (!route.endsWith('.js')) {
                return;
            }

            const router = require(`${base_dir}/${route_dir}/${route}`);
            const basename = path.basename(route, '.js');
            app.use('/' + basename, router);
        });
    });

    // After initializing all routers, validate all metadata definitions
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

    if (meta_entity.creatable) {
        init_create_router(router, meta_entity);
    }

    if (meta_entity.readable) {
        init_read_router(router, meta_entity);
    }

    if (meta_entity.updatable) {
        init_update_router(router, meta_entity);
    }

    if (meta_entity.cloneable) {
        init_clone_router(router, meta_entity);
    }

    if (meta_entity.deleteable) {
        init_delete_router(router, meta_entity);
    }

    // Allow custom route registration
    if (meta.route && typeof meta.route === 'function') {
        meta.route(router, meta_entity);
    }

    return router;
};

module.exports = { init_router_dirs, init_router };
