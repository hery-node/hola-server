import { strictEqual, deepStrictEqual } from 'assert';
import { set_chart_header, merge_chart_data } from '../../src/core/chart.js';

describe('chart', function () {
    describe('set_chart_header', function () {
        it('should add prefix to headers except first', function () {
            const arr = [['Date', 'Value1', 'Value2'], [1, 2, 3]];
            set_chart_header(arr, 'Prefix_');
            strictEqual(arr[0][0], 'Date');
            strictEqual(arr[0][1], 'Prefix_Value1');
            strictEqual(arr[0][2], 'Prefix_Value2');
        });

        it('should handle empty array', function () {
            const arr = [];
            set_chart_header(arr, 'Prefix_');
            strictEqual(arr.length, 0);
        });

        it('should handle single column', function () {
            const arr = [['Date']];
            set_chart_header(arr, 'Prefix_');
            strictEqual(arr[0][0], 'Date');
        });
    });

    describe('merge_chart_data', function () {
        it('should merge two chart data arrays', function () {
            const arr1 = [['Date', 'A'], ['2024', 1]];
            const arr2 = [['Date', 'B'], ['2024', 2]];
            merge_chart_data(arr1, arr2);
            deepStrictEqual(arr1[0], ['Date', 'A', 'B']);
            deepStrictEqual(arr1[1], ['2024', 1, 2]);
        });

        it('should handle arrays of different lengths', function () {
            const arr1 = [['Date', 'A'], ['2024', 1], ['2025', 2]];
            const arr2 = [['Date', 'B'], ['2024', 3]];
            merge_chart_data(arr1, arr2);
            strictEqual(arr1.length, 3);
            strictEqual(arr1[0].length, 3);
        });

        it('should handle empty arrays', function () {
            const arr1 = [];
            const arr2 = [['Date', 'B']];
            merge_chart_data(arr1, arr2);
            strictEqual(arr1.length, 0);
        });
    });
});
