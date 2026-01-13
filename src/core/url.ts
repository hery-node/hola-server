/**
 * URL and HTTP request utility functions.
 * @module core/url
 */

import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { get_settings } from '../setting.js';

/** Create HTTP request function with preset URL and method. */
export const url = (target_url: string, method: string): (config?: AxiosRequestConfig) => Promise<AxiosResponse> => {
    const settings = get_settings();
    const axios_config = settings.axios;

    return (config?: AxiosRequestConfig) => {
        const params: AxiosRequestConfig = {
            url: target_url,
            method,
            validateStatus: () => true,
        };
        if (axios_config.proxy) {
            params.proxy = axios_config.proxy as AxiosRequestConfig['proxy'];
        }
        return axios.request({ ...params, ...(config || {}) });
    };
};
