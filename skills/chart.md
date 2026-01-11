# Chart Utilities Skill

## Overview

The `hola-server/core/chart.js` module provides helpers for manipulating chart data structures, typically represented as 2D arrays (array of rows, where the first row is headers).

## Importing

```javascript
const { set_chart_header, merge_chart_data } = require("hola-server/core/chart");
```

## API Reference

### `set_chart_header(arr, prefix)`
Modifies chart headers in-place by prepending a prefix to all columns except the first one (usually the x-axis/category).
- **param**: `arr` (Array[]) - 2D array [header_row, data_row1, ...].
- **param**: `prefix` (string) - String to prepend to headers.
- **returns**: `void` (Modifies array in place).

```javascript
const data = [
    ["Date", "Value", "Cost"],
    ["2023-01-01", 100, 50]
];
set_chart_header(data, "US_");
// data[0] becomes ["Date", "US_Value", "US_Cost"]
```

### `merge_chart_data(arr1, arr2)`
Merges two chart data sets (2D arrays) by appending columns from `arr2` (excluding its first ID column) to `arr1`. Handles mismatched lengths by padding with empty strings.
- **param**: `arr1` (Array[]) - Base dataset (modified in place).
- **param**: `arr2` (Array[]) - Dataset to merge.
- **returns**: `void`.

```javascript
const chart1 = [
    ["Date", "A"],
    ["Jan", 10]
];
const chart2 = [
    ["Date", "B"],
    ["Jan", 20],
    ["Feb", 25]
];

merge_chart_data(chart1, chart2);
// chart1 becomes:
// [
//   ["Date", "A", "B"],
//   ["Jan", 10, 20],
//   ["Feb", "", 25]  <-- padded row for chart1
// ]
```
