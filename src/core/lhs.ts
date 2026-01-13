/**
 * Template execution utilities using Node.js VM.
 * @module core/lhs
 */

import vm from 'node:vm';
import { range, scale, space } from './number.js';

/** Get default context with number utilities. */
export const get_context = (): Record<string, unknown> => ({ range, scale, space });

/** Run code in VM context. */
export const run_in_context = (code: string, ctx: Record<string, unknown>): Record<string, unknown> => {
    vm.createContext(ctx);
    vm.runInContext(code, ctx);
    return ctx;
};

/** Verify template string is valid JavaScript. Returns error message if invalid, null if valid. */
export const verify_template = (template: string, knob: Record<string, unknown>): string | null => {
    try {
        run_in_context("__output__=`" + template + "`;", knob);
        return null;
    } catch (err) {
        return (err as Error).message;
    }
};

/** Execute template string and return result. */
export const execute_template = (template: string, knob: Record<string, unknown>): string => {
    const ctx = run_in_context("__output__=`" + template + "`;", knob);
    return ctx["__output__"] as string;
};
