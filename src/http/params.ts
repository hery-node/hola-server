/**
 * Request parameter extraction utilities.
 * @module http/params
 */

import { Request } from 'express';
import { has_value, is_undefined } from '../core/validate.js';

/** Extract parameters from input object using a filter function. */
const extract_params = (input: Record<string, unknown>, params: string[], filter_fn: (val: unknown) => boolean): Record<string, unknown> => {
    const obj: Record<string, unknown> = {};
    for (const param of params) {
        if (filter_fn(input[param])) obj[param] = input[param];
    }
    return obj;
};

/** Extract specified parameters from input object (only if values are present). */
const parse_params = (input: Record<string, unknown>, params: string[]): Record<string, unknown> => extract_params(input, params, has_value);

/** Extract query parameters from request. */
export const get_params = (req: Request, params: string[]): Record<string, unknown> => parse_params(req.query as Record<string, unknown>, params);

/** Extract body parameters from request. */
export const post_params = (req: Request, params: string[]): Record<string, unknown> => parse_params(req.body, params);

/** Extract update parameters from request body, including undefined values. */
export const post_update_params = (req: Request, params: string[]): Record<string, unknown> => extract_params(req.body, params, v => !is_undefined(v));

/** Extract required parameters, returning null if any are missing. */
export const required_params = (input: Record<string, unknown>, params: string[]): Record<string, unknown> | null => {
    const result = parse_params(input, params);
    return Object.keys(result).length === params.length ? result : null;
};

/** Extract required query parameters from request. */
export const required_get_params = (req: Request, params: string[]): Record<string, unknown> | null => required_params(req.query as Record<string, unknown>, params);

/** Extract required body parameters from request. */
export const required_post_params = (req: Request, params: string[]): Record<string, unknown> | null => required_params(req.body, params);
