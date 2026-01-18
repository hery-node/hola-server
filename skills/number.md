# Number Utilities Skill

## Overview

The `hola-server/core/number.js` module provides extensive numerical utilities including parsing, rounding, range generation, sampling, and space definitions for search algorithms.

## Importing

```javascript
const {
    parse_num, extract_number,
    to_fixed2, round_to_fixed2,
    range, scale,
    space, is_space, contains_space,
    is_integer, random_number, random_sample, lhs_samples
} from "hola-server/core/number";
```

## API Reference

### 1. Parsing & Formatting

#### `parse_num(str)`
Parses string to float, defaults to 0 if invalid.
- **returns**: `number`

#### `to_fixed2(str)`
Parses string/number and rounds/formats to 2 decimal places.
- **returns**: `number`

#### `round_to_fixed2(num)`
Math utility to round a number to 2 decimal places.
- **returns**: `number`

#### `extract_number(value)`
Extracts the first valid numeric sequence from a string.
- **param**: `value` (string) - e.g., "Price$12.50each".
- **returns**: `number` - e.g., 12.50.

### 2. Ranges & Spaces

#### `range(start, end, step)`
Generates an arithmetic sequence.
- `range(3)` → `[0, 1, 2]`
- `range(1, 5)` → `[1, 2, 3, 4, 5]`
- `range(0, 10, 2)` → `[0, 2, 4, 6, 8, 10]`

#### `scale(start, end, ratio)`
Generates a geometric sequence.
- `scale(2, 16, 2)` → `[2, 4, 8, 16]`

#### `space(min, max)`
Creates a "space" object `{min, max}` representing a continuous range.
- **returns**: `{min: number, max: number}`

#### `is_space(value)`
Checks if an object is a valid space (has min/max).
- **returns**: `boolean`

#### `contains_space(obj)`
Checks if any property of an object is a space.
- **returns**: `boolean`

### 3. Random & Sampling

#### `random_number(min, max)`
Generates a random number between min and max. Returns integer if bounds are integers, otherwise float with 2 decimals.
- **returns**: `number`

#### `lhs_samples(min, max, n)`
Generates `n` ranges using Latin Hypercube Sampling logic.
- **returns**: `Array<{min, max}>`

#### `random_sample(obj)`
Takes a configuration object where values can be fixed, arrays (options), or spaces (range), and returns a single sampled object.
- **Array values**: Randomly picks one element.
- **Space values**: Randomly picks number within range.
- **Other**: Kept as-is.

```javascript
const config = {
    color: ['red', 'blue'],   // Pick one
    size: space(10, 20),      // Pick number 10-20
    type: 'shirt'             // Fixed
};
const sample = random_sample(config);
// { color: 'red', size: 14.5, type: 'shirt' }
```
