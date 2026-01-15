/**
 * Express router initialization and loading utilities.
 * @module http/router
 */

import path from 'path';
import fs from 'fs';
import express, { Router } from 'express';
import { EntityMeta, validate_all_metas, MetaDefinition } from '../core/meta.js';
import { init_create_router } from '../router/create.js';
import { init_read_router } from '../router/read.js';
import { init_update_router } from '../router/update.js';
import { init_clone_router } from '../router/clone.js';
import { init_delete_router } from '../router/delete.js';
import { get_settings } from '../setting.js';

type InitRouterFn = (router: Router, meta: EntityMeta) => void;

/** CRUD operation configurations: [capability_key, init_function] */
const CRUD_OPERATIONS: [keyof EntityMeta, InitRouterFn][] = [
    ['creatable', init_create_router],
    ['readable', init_read_router],
    ['updatable', init_update_router],
    ['cloneable', init_clone_router],
    ['deleteable', init_delete_router],
];

/** Automatically load all router modules from configured directories. */
export const init_router_dirs = async (app: express.Express, base_dir: string): Promise<void> => {
    const settings = get_settings();
    if (!settings?.server?.routes) return;

    for (const route_dir of settings.server.routes) {
        const full_route_dir = path.join(base_dir, route_dir);
        if (!fs.existsSync(full_route_dir)) continue;

        for (const route of fs.readdirSync(full_route_dir)) {
            if (!route.endsWith('.js') && !route.endsWith('.ts')) continue;

            const router_module = await import(`${base_dir}/${route_dir}/${route}`);
            const basename = path.basename(route, path.extname(route));
            app.use('/' + basename, router_module.default || router_module);
        }
    }

    validate_all_metas();
};

/** Initialize Express router for an entity with CRUD operations. */
export const init_router = (meta: MetaDefinition): Router => {
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
