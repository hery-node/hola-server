/**
 * Chart data processing utility functions.
 * @module core/chart
 */

import { has_value } from './validate.js';

type ChartData = unknown[][];

/** Set chart header prefix for all columns except the first. */
export const set_chart_header = (arr: ChartData, prefix: string): void => {
    if (!arr || arr.length < 1) return;
    const headers = arr[0] as string[];
    if (!headers || headers.length < 1) return;
    for (let i = 1; i < headers.length; i++) {
        headers[i] = `${prefix}${headers[i]}`;
    }
};

/** Merge two chart data arrays by combining columns. */
export const merge_chart_data = (arr1: ChartData, arr2: ChartData): void => {
    if (!arr1 || arr1.length < 2 || !arr2 || arr2.length < 2) return;

    const max = Math.max(arr1.length, arr2.length);
    const arr1_cols = (arr1[0] as unknown[]).length;
    const arr2_cols = (arr2[0] as unknown[]).length;

    for (let i = 0; i < max; i++) {
        if (!has_value(arr1[i])) {
            arr1[i] = [...new Array(arr1_cols)].map(() => "");
            (arr1[i] as unknown[])[0] = (arr2[i] as unknown[])[0];
        }
        if (!has_value(arr2[i])) {
            arr2[i] = [...new Array(arr2_cols)].map(() => "");
        }
        arr1[i] = [...(arr1[i] as unknown[]), ...(arr2[i] as unknown[]).splice(1)];
    }
};
