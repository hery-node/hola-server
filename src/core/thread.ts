/**
 * Threading and async utility functions.
 * @module core/thread
 */

/** Sleep for specified milliseconds using Bun's native sleep. */
export const snooze = (ms: number): Promise<void> => Bun.sleep(ms);
