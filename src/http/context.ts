/**
 * Request context management using AsyncLocalStorage.
 * @module http/context
 */

import { AsyncLocalStorage } from 'async_hooks';

interface ContextStore {
    [key: string]: unknown;
}

export const asyncLocalStorage = new AsyncLocalStorage<ContextStore>();

/** Set value in current request context. */
export const set_context_value = (key: string, obj: unknown): void => {
    const store = asyncLocalStorage.getStore();
    if (store) store[key] = obj;
};

/** Get value from current request context. */
export const get_context_value = (key: string): unknown => {
    const store = asyncLocalStorage.getStore();
    return store ? store[key] : null;
};
