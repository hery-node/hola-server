const { strictEqual, deepStrictEqual } = require('assert');
const { shuffle, remove_element, pop_n, shift_n, sum, avg, combine, sort_desc, sort_asc, sort_by_key_seq, unique, map_array_to_obj } = require('../../core/array');

describe('array', function () {
    describe('shuffle', function () {
        it('should shuffle array in place', function () {
            const arr = [1, 2, 3, 4, 5];
            const original = [...arr];
            shuffle(arr);
            strictEqual(arr.length, original.length);
            // All elements should still be present
            original.forEach(el => strictEqual(arr.includes(el), true));
        });
    });

    describe('remove_element', function () {
        it('should remove elements by field value', function () {
            const arr = [{ id: 1 }, { id: 2 }, { id: 1 }, { id: 3 }];
            remove_element(arr, 'id', 1);
            strictEqual(arr.length, 2);
            strictEqual(arr[0].id, 2);
            strictEqual(arr[1].id, 3);
        });

        it('should handle empty array', function () {
            const arr = [];
            remove_element(arr, 'id', 1);
            strictEqual(arr.length, 0);
        });
    });

    describe('pop_n', function () {
        it('should pop n elements from end', function () {
            const arr = [1, 2, 3, 4, 5];
            const result = pop_n(arr, 2);
            deepStrictEqual(result, [5, 4]);
            strictEqual(arr.length, 3);
        });

        it('should return undefined for empty array', function () {
            const arr = [];
            const result = pop_n(arr, 2);
            strictEqual(result, undefined);
        });
    });

    describe('shift_n', function () {
        it('should shift n elements from start', function () {
            const arr = [1, 2, 3, 4, 5];
            const result = shift_n(arr, 2);
            deepStrictEqual(result, [1, 2]);
            strictEqual(arr.length, 3);
        });

        it('should return undefined for empty array', function () {
            const arr = [];
            const result = shift_n(arr, 2);
            strictEqual(result, undefined);
        });
    });

    describe('sum', function () {
        it('should calculate sum of numbers', function () {
            strictEqual(sum([1, 2, 3, 4, 5]), 15);
            strictEqual(sum([1.1, 2.2, 3.3]), 6.6);
        });

        it('should return 0 for empty array', function () {
            strictEqual(sum([]), 0);
        });
    });

    describe('avg', function () {
        it('should calculate average of numbers', function () {
            strictEqual(avg([1, 2, 3, 4, 5]), 3);
            strictEqual(avg([10, 20]), 15);
        });

        it('should return 0 for empty array', function () {
            strictEqual(avg([]), 0);
        });
    });

    describe('combine', function () {
        it('should create cartesian product', function () {
            const arr1 = [{ a: 1 }, { a: 2 }];
            const arr2 = [{ b: 3 }, { b: 4 }];
            const result = combine(arr1, arr2);
            strictEqual(result.length, 4);
            deepStrictEqual(result[0], { a: 1, b: 3 });
            deepStrictEqual(result[1], { a: 1, b: 4 });
            deepStrictEqual(result[2], { a: 2, b: 3 });
            deepStrictEqual(result[3], { a: 2, b: 4 });
        });
    });

    describe('sort_desc', function () {
        it('should sort array descending by attribute', function () {
            const arr = [{ val: 3 }, { val: 1 }, { val: 2 }];
            sort_desc(arr, 'val');
            strictEqual(arr[0].val, 3);
            strictEqual(arr[1].val, 2);
            strictEqual(arr[2].val, 1);
        });
    });

    describe('sort_asc', function () {
        it('should sort array ascending by attribute', function () {
            const arr = [{ val: 3 }, { val: 1 }, { val: 2 }];
            sort_asc(arr, 'val');
            strictEqual(arr[0].val, 1);
            strictEqual(arr[1].val, 2);
            strictEqual(arr[2].val, 3);
        });
    });

    describe('sort_by_key_seq', function () {
        it('should sort by predefined key sequence', function () {
            const arr = [{ type: 'c' }, { type: 'a' }, { type: 'b' }];
            const keys = ['a', 'b', 'c'];
            sort_by_key_seq(arr, 'type', keys);
            strictEqual(arr[0].type, 'a');
            strictEqual(arr[1].type, 'b');
            strictEqual(arr[2].type, 'c');
        });
    });

    describe('unique', function () {
        it('should remove duplicate primitives', function () {
            const result = unique([1, 2, 2, 3, 1]);
            deepStrictEqual(result, [1, 2, 3]);
        });

        it('should remove duplicate objects', function () {
            const result = unique([{ a: 1 }, { a: 2 }, { a: 1 }]);
            strictEqual(result.length, 2);
        });
    });

    describe('map_array_to_obj', function () {
        it('should convert array to key-value object', function () {
            const arr = [{ key: 'a', val: 1 }, { key: 'b', val: 2 }];
            const result = map_array_to_obj(arr, 'key', 'val');
            deepStrictEqual(result, { a: 1, b: 2 });
        });
    });
});
