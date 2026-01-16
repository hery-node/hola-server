import { describe, it } from 'bun:test';
import { strictEqual } from 'assert';
import { random_code } from '../../src/core/random.js';

describe('random', function () {
    describe('random_code', function () {
        it('should generate number between 0 and 999999', function () {
            for (let i = 0; i < 100; i++) {
                const code = random_code();
                strictEqual(code >= 0, true);
                strictEqual(code < 1000000, true);
                strictEqual(Number.isInteger(code), true);
            }
        });

        it('should generate different values', function () {
            const codes = new Set();
            for (let i = 0; i < 100; i++) {
                codes.add(random_code());
            }
            // Should have at least some variation
            strictEqual(codes.size > 1, true);
        });
    });
});
