/**
 * Template execution utilities using Node.js VM.
 * @module core/lhs
 */

import vm from 'node:vm';
import { range, scale, space } from './number.js';

/** Context value types for VM execution. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ContextValue = string | number | boolean | null | undefined | ((...args: any[]) => any) | ContextValue[] | { [key: string]: ContextValue };

/** Get default context with number utilities. */
export const get_context = (): Record<string, ContextValue> => ({ range, scale, space });

/** Run code in VM context. */
export const run_in_context = (code: string, ctx: Record<string, ContextValue>): Record<string, ContextValue> => {
    vm.createContext(ctx);
    vm.runInContext(code, ctx);
    return ctx;
};

/** Verify template string is valid JavaScript. Returns error message if invalid, null if valid. */
export const verify_template = (template: string, knob: Record<string, ContextValue>): string | null => {
    try {
        run_in_context("__output__=`" + template + "`;", knob);
        return null;
    } catch (err) {
        return (err as Error).message;
    }
};

/** Execute template string and return result. */
export const execute_template = (template: string, knob: Record<string, ContextValue>): string => {
    const ctx = run_in_context("__output__=`" + template + "`;", knob);
    return ctx["__output__"] as string;
};
