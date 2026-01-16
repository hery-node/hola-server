import { describe, it } from 'bun:test';
import { strictEqual, deepStrictEqual } from 'assert';
import {
    parse_num, extract_number, to_fixed2, round_to_fixed2,
    range, scale, space, is_space, contains_space, is_integer,
    random_number, random_sample, lhs_samples
} from '../../src/core/number.js';

describe('number', function () {
    describe('parse_num', function () {
        it('should parse valid numbers', function () {
            strictEqual(parse_num('123'), 123);
            strictEqual(parse_num('3.14'), 3.14);
            strictEqual(parse_num(-5), -5);
        });

        it('should return 0 for invalid values', function () {
            strictEqual(parse_num('abc'), 0);
            strictEqual(parse_num(null), 0);
        });
    });

    describe('to_fixed2', function () {
        it('should parse and round to 2 decimals', function () {
            strictEqual(to_fixed2('3.14159'), 3.14);
            strictEqual(to_fixed2('2.999'), 3);
        });

        it('should return 0 for invalid values', function () {
            strictEqual(to_fixed2('abc'), 0);
        });
    });

    describe('round_to_fixed2', function () {
        it('should round to 2 decimal places', function () {
            strictEqual(round_to_fixed2(3.14159), 3.14);
            strictEqual(round_to_fixed2(2.996), 3);
        });
    });

    describe('range', function () {
        it('should generate range with single argument', function () {
            deepStrictEqual(range(3), [0, 1, 2]);
            deepStrictEqual(range(5), [0, 1, 2, 3, 4]);
        });

        it('should generate range with start and end', function () {
            deepStrictEqual(range(1, 5), [1, 2, 3, 4, 5]);
            deepStrictEqual(range(0, 4), [0, 1, 2, 3, 4]);
        });

        it('should generate range with step', function () {
            deepStrictEqual(range(0, 10, 2), [0, 2, 4, 6, 8, 10]);
        });
    });

    describe('scale', function () {
        it('should generate exponential scale', function () {
            deepStrictEqual(scale(2, 8), [2, 4, 8]);
            deepStrictEqual(scale(1, 8, 2), [1, 2, 4, 8]);
        });

        it('should work with different ratios', function () {
            deepStrictEqual(scale(1, 27, 3), [1, 3, 9, 27]);
        });
    });

    describe('space', function () {
        it('should create space object', function () {
            const s = space(0, 100);
            strictEqual(s.min, 0);
            strictEqual(s.max, 100);
        });

        it('should throw without min or max', function () {
            let threw = false;
            try { space(null, 100); } catch { threw = true; }
            strictEqual(threw, true);
        });
    });

    describe('is_space', function () {
        it('should return true for space objects', function () {
            strictEqual(is_space({ min: 0, max: 100 }), true);
            strictEqual(is_space(space(0, 10)), true);
        });

        it('should return false for non-space values', function () {
            strictEqual(is_space({ min: 0 }), false);
            strictEqual(is_space(123), false);
            strictEqual(is_space([0, 100]), false);
        });
    });

    describe('is_integer', function () {
        it('should detect integers', function () {
            strictEqual(is_integer('123'), true);
            strictEqual(is_integer('-45'), true);
            strictEqual(is_integer('0'), true);
        });

        it('should return false for non-integers', function () {
            strictEqual(is_integer('3.14'), false);
            strictEqual(is_integer('abc'), false);
        });
    });

    describe('contains_space', function () {
        it('should detect space objects in object', function () {
            strictEqual(contains_space({ a: space(0, 10), b: 5 }), true);
            strictEqual(contains_space({ a: 1, b: 2 }), false);
        });
    });

    describe('random_number', function () {
        it('should generate number in range', function () {
            for (let i = 0; i < 50; i++) {
                const num = random_number(0, 10);
                strictEqual(num >= 0 && num <= 10, true);
            }
        });

        it('should return integer for integer bounds', function () {
            for (let i = 0; i < 20; i++) {
                const num = random_number(0, 100);
                strictEqual(Number.isInteger(num), true);
            }
        });
    });

    describe('random_sample', function () {
        it('should sample from arrays', function () {
            const obj = { color: ['red', 'blue', 'green'] };
            const sample = random_sample(obj);
            strictEqual(['red', 'blue', 'green'].includes(sample.color), true);
        });

        it('should sample from spaces', function () {
            const obj = { value: space(0, 100) };
            const sample = random_sample(obj);
            strictEqual(sample.value >= 0 && sample.value <= 100, true);
        });

        it('should preserve plain values', function () {
            const obj = { fixed: 42 };
            const sample = random_sample(obj);
            strictEqual(sample.fixed, 42);
        });
    });

    describe('lhs_samples', function () {
        it('should generate Latin Hypercube Sampling ranges', function () {
            const samples = lhs_samples(0, 100, 4);
            strictEqual(samples.length, 4);
            samples.forEach(s => {
                strictEqual(typeof s.min, 'number');
                strictEqual(typeof s.max, 'number');
            });
        });
    });

    describe('extract_number', function () {
        it('should extract number successfully', function () {
            strictEqual(extract_number('123'), 123);
            strictEqual(extract_number('123 abc'), 123);
            strictEqual(extract_number(' abc 134.56 efg'), 134.56);
        });

        it('should return 0 for multiple numbers', function () {
            strictEqual(extract_number(' abc 134.56 efg 123 rg'), 0);
        });
    });
});
