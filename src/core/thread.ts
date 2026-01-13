/**
 * Threading and async utility functions.
 * @module core/thread
 */

/** Sleep for specified milliseconds. */
export const snooze = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
