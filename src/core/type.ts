/**
 * Type conversion and validation system.
 * @module core/type
 */

import { has_value, is_undefined } from "./validate.js";
import { encrypt_pwd } from "./encrypt.js";

export interface TypeResult<T = unknown> {
  value?: T;
  err?: string;
}

export interface TypeDefinition {
  name: string;
  convert: (value: unknown) => TypeResult;
}

export interface Field {
  name: string;
  type?: string;
  default?: unknown;
}

const type_manager: Record<string, TypeDefinition> = {};

// ============================================================================
// Helper Functions
// ============================================================================

/** Create success result. */
export const ok = <T>(value: T): TypeResult<T> => ({ value });

/** Create error result. */
export const err = (type: string, value: unknown): TypeResult => ({ err: `invalid ${type}:${value}` });

/** Escape HTML to prevent XSS attacks. */
const escape_html = (str: string): string => str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

/** Check if value contains MongoDB operators (injection attempt). */
const has_mongo_operator = (value: unknown): boolean => {
  if (typeof value !== "object" || value === null) return false;
  return Object.keys(value).some((k) => k.startsWith("$"));
};

/** Check if value is an integer. */
export const is_int = (value: unknown): boolean => parseInt(String(value)) === parseFloat(String(value));

/** Create a regex validation type. */
export const regex_type = (name: string, pattern: RegExp): TypeDefinition => ({ name, convert: (value: unknown) => (pattern.test(String(value)) ? ok(value) : err(name, value)) });

/** Create an integer enum validation type. */
export const int_enum_type = (name: string, valid_values: number[]): TypeDefinition => ({
  name,
  convert: (value: unknown) => {
    if (!is_int(value)) return err(name, value);
    const int_value = parseInt(String(value));
    return valid_values.includes(int_value) ? ok(int_value) : err(name, value);
  },
});

/** Create an integer range validation type. */
export const int_range_type = (name: string, min: number, max: number): TypeDefinition => ({
  name,
  convert: (value: unknown) => {
    if (!is_int(value)) return err(name, value);
    const int_value = parseInt(String(value));
    return int_value >= min && int_value <= max ? ok(int_value) : err(name, value);
  },
});

/** Create a passthrough string type. */
export const string_type = (name: string): TypeDefinition => ({ name, convert: (value: unknown) => ok(value + "") });

// ============================================================================
// Type Registration
// ============================================================================

/** Register a custom type with conversion function. */
export const register_type = (type: TypeDefinition): void => {
  type_manager[type.name] = type;
};

/** Get registered type by name. */
export const get_type = (name: string): TypeDefinition => {
  const type = type_manager[name];
  if (!type) throw new Error(`no type registered for name [${name}]`);
  return type;
};

// ============================================================================
// Built-in Types: Basic
// ============================================================================

register_type({ name: "obj", convert: ok });
register_type({ name: "string", convert: (value) => ok(value ? escape_html((value + "").trim()) : "") });
register_type({ name: "password", convert: (value) => ok(encrypt_pwd(String(value))) });
register_type({ name: "file", convert: ok });

// Passthrough string types
register_type(string_type("lstr"));
register_type(string_type("text"));
register_type(string_type("date"));
register_type(string_type("enum"));
register_type(string_type("log_category"));

// ============================================================================
// Built-in Types: Boolean
// ============================================================================

register_type({
  name: "boolean",
  convert: (value) => {
    if (value === true || value === "true") return ok(true);
    if (value === false || value === "false") return ok(false);
    return err("boolean", value);
  },
});

// ============================================================================
// Built-in Types: Numeric
// ============================================================================

register_type({
  name: "number",
  convert: (value) => {
    const num = Number(value);
    return isNaN(num) ? err("number", value) : ok(num);
  },
});

register_type({ name: "int", convert: (value) => (is_int(value) ? ok(parseInt(String(value))) : err("int", value)) });

register_type({
  name: "uint",
  convert: (value) => {
    const int_value = parseInt(String(value));
    return is_int(value) && int_value >= 0 ? ok(int_value) : err("uint", value);
  },
});

register_type({
  name: "float",
  convert: (value) => {
    const num = parseFloat(String(value));
    return isNaN(num) ? err("float", value) : ok(parseFloat(num.toFixed(2)));
  },
});

register_type({
  name: "ufloat",
  convert: (value) => {
    const num = parseFloat(String(value));
    return isNaN(num) || num < 0 ? err("ufloat", value) : ok(parseFloat(num.toFixed(2)));
  },
});

register_type({
  name: "decimal",
  convert: (value) => {
    const num = parseFloat(String(value));
    return isNaN(num) ? err("decimal", value) : ok(num);
  },
});

register_type({
  name: "percentage",
  convert: (value) => {
    const num = parseFloat(String(value));
    return isNaN(num) ? err("percentage", value) : ok(parseFloat(num.toFixed(2)));
  },
});

register_type({
  name: "currency",
  convert: (value) => {
    const num = Number(value);
    return isNaN(num) ? err("currency", value) : ok(num);
  },
});

// ============================================================================
// Built-in Types: Date/Time
// ============================================================================

register_type({
  name: "datetime",
  convert: (value) => {
    const date = new Date(value as string | number);
    return isNaN(date.getTime()) ? err("datetime", value) : ok(date.toISOString());
  },
});

register_type(regex_type("time", /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/));

// ============================================================================
// Built-in Types: Validation
// ============================================================================

register_type({
  name: "email",
  convert: (value) => {
    const pattern = /^(([^<>()[\]\\.,;:\s@"]+(\\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return pattern.test(String(value)) ? ok(value) : err("email", value);
  },
});

register_type({
  name: "url",
  convert: (value) => {
    try {
      new URL(String(value));
      return ok(value);
    } catch {
      return err("url", value);
    }
  },
});

register_type({
  name: "phone",
  convert: (value) => {
    const cleaned = String(value).replace(/[\s\-\(\)]/g, "");
    return /^\+?[1-9]\d{1,14}$/.test(cleaned) ? ok(cleaned) : err("phone", value);
  },
});

register_type(regex_type("uuid", /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i));
register_type(regex_type("color", /^#([0-9A-F]{3}){1,2}$/i));

register_type({
  name: "ip_address",
  convert: (value) => {
    const str = String(value);
    if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(str)) return err("ip_address", value);
    const valid = str.split(".").every((part) => parseInt(part) <= 255);
    return valid ? ok(value) : err("ip_address", value);
  },
});

// ============================================================================
// Built-in Types: Data Structures
// ============================================================================

register_type({
  name: "array",
  convert: (value) => {
    if (typeof value === "string") return ok(value.split(","));
    if (Array.isArray(value)) return ok(value);
    return err("array", value);
  },
});

register_type({
  name: "json",
  convert: (value) => {
    if (typeof value === "object") return ok(value);
    try {
      return ok(JSON.parse(String(value)));
    } catch {
      return err("json", value);
    }
  },
});

// ============================================================================
// Built-in Types: Transformations
// ============================================================================

register_type({
  name: "slug",
  convert: (value) =>
    ok(
      String(value)
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^\w\-]+/g, "")
        .replace(/\-\-+/g, "-"),
    ),
});

// ============================================================================
// Built-in Types: Domain-Specific
// ============================================================================

register_type(int_range_type("age", 0, 200));
register_type(int_enum_type("gender", [0, 1]));
register_type(int_enum_type("log_level", [0, 1, 2, 3]));

// ============================================================================
// Conversion Functions
// ============================================================================

/** Convert a single field value. */
const convert_field = (field_value: unknown, type_name?: string): TypeResult => {
  const type = get_type(type_name || "string");
  return type.convert(field_value);
};

interface ConvertResult {
  obj: Record<string, unknown>;
  error_field_names: string[];
}

/** Convert object fields to their defined types. */
const convert_fields = (obj: Record<string, unknown>, fields: Field[], preserve_empty: boolean = false): ConvertResult => {
  const result: Record<string, unknown> = {};
  const error_field_names: string[] = [];

  for (const field of fields) {
    const field_value = obj[field.name];

    // Check for MongoDB operator injection
    if (has_mongo_operator(field_value)) {
      error_field_names.push(field.name);
      continue;
    }

    if (has_value(field_value)) {
      const { value, err } = convert_field(field_value, field.type);
      if (err) error_field_names.push(field.name);
      else result[field.name] = value;
    } else if (!preserve_empty && field.default !== undefined) {
      // Apply default only for create operations, not for update
      result[field.name] = field.default;
    } else if (preserve_empty && !is_undefined(field_value)) {
      result[field.name] = "";
    }
  }

  return { obj: result, error_field_names };
};

/** Convert object fields to their defined types. */
export const convert_type = (obj: Record<string, unknown>, fields: Field[]): ConvertResult => convert_fields(obj, fields, false);

/** Convert object fields for update operation (preserves empty values). */
export const convert_update_type = (obj: Record<string, unknown>, fields: Field[]): ConvertResult => convert_fields(obj, fields, true);
