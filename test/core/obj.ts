import { strictEqual, deepStrictEqual } from 'assert';
import { copy_obj, is_object } from '../../src/core/obj.js';

describe('obj', function () {
    describe('copy_obj', function () {
        it('should copy specified attributes', function () {
            const obj = { a: 1, b: 2, c: 3 };
            const result = copy_obj(obj, ['a', 'c']);
            deepStrictEqual(result, { a: 1, c: 3 });
        });

        it('should handle missing attributes', function () {
            const obj = { a: 1 };
            const result = copy_obj(obj, ['a', 'b']);
            deepStrictEqual(result, { a: 1, b: undefined });
        });

        it('should return empty object for empty attrs', function () {
            const obj = { a: 1, b: 2 };
            const result = copy_obj(obj, []);
            deepStrictEqual(result, {});
        });
    });

    describe('is_object', function () {
        it('should return true for plain objects', function () {
            strictEqual(is_object({}), true);
            strictEqual(is_object({ a: 1 }), true);
        });

        it('should return false for null', function () {
            strictEqual(is_object(null), false);
        });

        it('should return false for arrays', function () {
            strictEqual(is_object([]), false);
            strictEqual(is_object([1, 2, 3]), false);
        });

        it('should return false for primitives', function () {
            strictEqual(is_object('string'), false);
            strictEqual(is_object(123), false);
            strictEqual(is_object(true), false);
            strictEqual(is_object(undefined), false);
        });
    });
});
