# Array Utilities Skill

## Overview

The `hola-server/core/array.js` module provides a set of utility functions for common array manipulations. This skill guide explains how to use these helpers effectively.

## Importing

```javascript
const { 
    shuffle, remove_element, pop_n, shift_n, 
    sum, avg, map_array_to_obj, 
    sort_desc, sort_asc, sort_by_key_seq, 
    combine, unique 
} from "hola-server/core/array";
```

## API Reference

### 1. Modification & Extraction

#### `shuffle(arr)`
Randomly shuffles array elements in place.
- **param**: `arr` (Array) - The array to shuffle.
- **returns**: `void` (Modifies array in place).

```javascript
const list = [1, 2, 3, 4, 5];
shuffle(list);
// list is now randomized, e.g., [3, 1, 5, 2, 4]
```

#### `remove_element(array, field, value)`
Removes elements from an array of objects where the specified field matches the value.
- **param**: `array` (Object[]) - Array of objects.
- **param**: `field` (string) - Property name to match against.
- **param**: `value` (*) - Value to look for.
- **returns**: `void` (Modifies array in place).

```javascript
const users = [{id: 1, name: 'Alice'}, {id: 2, name: 'Bob'}];
remove_element(users, 'id', 1);
// users is now [{id: 2, name: 'Bob'}]
```

#### `pop_n(array, n)` / `shift_n(array, n)`
Extracts (removes and returns) `n` elements from the end (`pop_n`) or start (`shift_n`) of an array.
- **param**: `array` (Array) - Source array (modified).
- **param**: `n` (number) - Number of elements to extract.
- **returns**: `Array` or `undefined` - Array of extracted elements, or undefined if array became empty before extracting `n` items? N.B. actually it tries to remove up to n. If returns undefined if result is empty.

```javascript
const nums = [1, 2, 3, 4, 5];
const lastTwo = pop_n(nums, 2); // [5, 4] (Note: items come off one by one)
// nums is now [1, 2, 3]

const firstTwo = shift_n(nums, 2); // [1, 2]
// nums is now [3]
```

### 2. Calculation

#### `sum(arr)`
Calculates the sum of an array of numbers.
- **param**: `arr` (number[]) - Array of numbers.
- **returns**: `number` - Sum rounded to 2 decimal places.

```javascript
sum([10.5, 20.3, 5.111]); // Returns 35.91
```

#### `avg(arr)`
Calculates the average of an array of numbers.
- **param**: `arr` (number[]) - Array of numbers.
- **returns**: `number` - Average rounded to 2 decimal places.

```javascript
avg([10, 20, 30]); // Returns 20
```

### 3. Transformation & Combining

#### `map_array_to_obj(arr, key_attr, value_attr)`
Converts an array of objects into a single object (map) using specified properties for keys and values.
- **param**: `arr` (Object[]) - Array of objects.
- **param**: `key_attr` (string) - Property to use as object key.
- **param**: `value_attr` (string) - Property to use as object value.
- **returns**: `Object` - Key-value map.

```javascript
const users = [
    {id: 1, name: 'Alice', role: 'admin'},
    {id: 2, name: 'Bob', role: 'user'}
];
const userMap = map_array_to_obj(users, 'id', 'name');
// Returns: { 1: 'Alice', 2: 'Bob' }
```

#### `combine(arr1, arr2)`
Creates a Cartesian product of two arrays of objects, merging properties.
- **param**: `arr1` (Object[]) - First array.
- **param**: `arr2` (Object[]) - Second array.
- **returns**: `Object[]` - Array of merged objects (length = arr1.length * arr2.length).

```javascript
const colors = [{ color: 'red' }, { color: 'blue' }];
const sizes = [{ size: 'S' }, { size: 'M' }];
const products = combine(colors, sizes);
// Returns:
// [
//   { color: 'red', size: 'S' }, { color: 'red', size: 'M' },
//   { color: 'blue', size: 'S' }, { color: 'blue', size: 'M' }
// ]
```

#### `unique(array)`
Removes duplicate values from an array. Handles primitives and objects (via stringification).
- **param**: `array` (Array) - Source array.
- **returns**: `Array` - New array with duplicates removed.

```javascript
unique([1, 2, 2, 3]); // [1, 2, 3]
unique([{id:1}, {id:1}, {id:2}]); // [{id:1}, {id:2}]
```

### 4. Sorting

#### `sort_asc(arr, attr)` / `sort_desc(arr, attr)`
Sorts an array of objects by a numeric attribute in ascending or descending order.
- **param**: `arr` (Object[]) - Array to sort.
- **param**: `attr` (string) - Numeric property to sort by.
- **returns**: `Object[]` - Sorted array (same reference).

```javascript
const items = [{ price: 10 }, { price: 5 }, { price: 20 }];
sort_asc(items, 'price'); // [{price: 5}, {price: 10}, {price: 20}]
```

#### `sort_by_key_seq(arr, attr, keys)`
Sorts an array of objects based on a specific sequence of values for an attribute.
- **param**: `arr` (Object[]) - Array to sort.
- **param**: `attr` (string) - Property to inspect.
- **param**: `keys` (Array) - Ordered list of values defining the sort order.
- **returns**: `Object[]` - Sorted array.

```javascript
const tasks = [
    { status: 'done' }, 
    { status: 'todo' }, 
    { status: 'doing' }
];
const order = ['todo', 'doing', 'done'];
sort_by_key_seq(tasks, 'status', order);
// Result: [{status: 'todo'}, {status: 'doing'}, {status: 'done'}]
```
