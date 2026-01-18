# Date Utilities Skill

## Overview

The `hola-server/core/date.js` module provides date formatting and parsing utilities, wrapping the `dateformat` library for consistent application-wide formats.

## Importing

```javascript
const { 
    simple_date, format_date, format_time, 
    format_date_time, parse_date 
} from "hola-server/core/date";
```

## API Reference

### Formatting Functions

#### `simple_date(date)`
Formats date as `mm/dd`.
- **param**: `date` (Date)
- **returns**: `string`

#### `format_date(date)`
Formats date as `yyyymmdd`.
- **param**: `date` (Date)
- **returns**: `string`

#### `format_time(date)`
Formats time as `HH:MM`.
- **param**: `date` (Date)
- **returns**: `string`

#### `format_date_time(date)`
Formats as `yyyymmdd HH:MM:ss`.
- **param**: `date` (Date)
- **returns**: `string`

```javascript
const now = new Date("2023-12-25T14:30:00");
format_date(now);      // "20231225"
format_time(now);      // "14:30"
format_date_time(now); // "20231225 14:30:00"
simple_date(now);      // "12/25"
```

### Parsing Functions

#### `parse_date(date_str)`
Parses a string in `yyyymmdd` format into a Date object (time set to 00:00:00).
- **param**: `date_str` (string) - E.g., "20231225".
- **returns**: `Date`

```javascript
const d = parse_date("20230101");
// d is Date object for Jan 1, 2023 00:00:00 local time
```
