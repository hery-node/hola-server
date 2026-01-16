import { describe, it } from 'bun:test';
import { strictEqual } from 'assert';
import { snooze } from '../../src/core/thread.js';

describe('thread', function () {
    describe('snooze', function () {
        it('should wait for specified milliseconds', async function () {
            const start = Date.now();
            await snooze(100);
            const elapsed = Date.now() - start;
            // Allow 50ms tolerance for timing variations
            strictEqual(elapsed >= 90, true);
            strictEqual(elapsed < 200, true);
        });

        it('should return a Promise', function () {
            const result = snooze(10);
            strictEqual(result instanceof Promise, true);
        });
    });
});
