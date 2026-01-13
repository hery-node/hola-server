/**
 * Random generation utility functions.
 * @module core/random
 */

/** Generate random 6-digit code. */
export const random_code = (): number => Math.floor(Math.random() * 1000000);
