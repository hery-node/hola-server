import { strictEqual, deepStrictEqual } from 'assert';
import { is_undefined, has_value, validate_required_fields } from '../../src/core/validate.js';

describe('validate', function () {
    describe('is_undefined', function () {
        it('should return true for undefined', function () {
            strictEqual(is_undefined(undefined), true);
        });

        it('should return false for null', function () {
            strictEqual(is_undefined(null), false);
        });

        it('should return false for defined values', function () {
            strictEqual(is_undefined(0), false);
            strictEqual(is_undefined(''), false);
            strictEqual(is_undefined(false), false);
        });
    });

    describe('has_value', function () {
        it('should return false for null', function () {
            strictEqual(has_value(null), false);
        });

        it('should return false for undefined', function () {
            strictEqual(has_value(undefined), false);
        });

        it('should return false for NaN', function () {
            strictEqual(has_value(NaN), false);
        });

        it('should return false for empty string', function () {
            strictEqual(has_value(''), false);
            strictEqual(has_value('   '), false);
        });

        it('should return true for valid values', function () {
            strictEqual(has_value(0), true);
            strictEqual(has_value(false), true);
            strictEqual(has_value('hello'), true);
            strictEqual(has_value([]), true);
            strictEqual(has_value({}), true);
        });
    });

    describe('validate_required_fields', function () {
        it('should return empty array when all fields present', function () {
            const obj = { name: 'John', age: 30 };
            const result = validate_required_fields(obj, ['name', 'age']);
            strictEqual(result.length, 0);
        });

        it('should return missing field names', function () {
            const obj = { name: 'John' };
            const result = validate_required_fields(obj, ['name', 'age', 'email']);
            deepStrictEqual(result, ['age', 'email']);
        });

        it('should treat empty strings as missing', function () {
            const obj = { name: '', age: 30 };
            const result = validate_required_fields(obj, ['name', 'age']);
            deepStrictEqual(result, ['name']);
        });
    });
});
