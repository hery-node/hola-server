/**
 * I18n JSON file generation from entity metadata.
 * @module tool/gen_i18n
 */

import fs from 'fs';
import { get_all_metas, get_entity_meta } from '../core/meta.js';

/**
 * Capitalize first letter of string.
 */
const capitalize = (s: string): string => {
    if (typeof s !== 'string') return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
};

/**
 * Process entity metadata and add to i18n JSON.
 */
const process_entity_i18n = (json: Record<string, Record<string, string>>, meta: ReturnType<typeof get_entity_meta>, keep_hint: boolean): void => {
    if (!meta) return;
    
    // Initialize collection object
    json[meta.collection] = json[meta.collection] || {};
    json[meta.collection]["_label"] = json[meta.collection]["_label"] || capitalize(meta.collection);

    // Process non-system fields
    const fields = meta.fields.filter((f) => f.sys !== true);
    fields.forEach((field) => {
        json[meta.collection][field.name] = json[meta.collection][field.name] || capitalize(field.name);

        if (keep_hint) {
            const hint_key = field.name + "_hint";
            json[meta.collection][hint_key] = json[meta.collection][hint_key] || "";
        }
    });
};

/**
 * Generate i18n JSON file from entity metadata.
 * Reads existing file, merges with entity field names, and writes back.
 */
export const gen_i18n = (file_path: string, keep_hint: boolean = false): void => {
    // Read existing JSON file
    const json_file = fs.readFileSync(file_path, 'utf8');
    const json = JSON.parse(json_file) as Record<string, Record<string, string>>;

    // Process all entity metadata
    const metas = get_all_metas();
    metas.forEach((meta_name) => {
        const meta = get_entity_meta(meta_name);
        process_entity_i18n(json, meta, keep_hint);
    });

    // Write updated JSON
    fs.writeFileSync(file_path, JSON.stringify(json, null, 2));
};
