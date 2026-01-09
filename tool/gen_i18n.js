/**
 * @fileoverview I18n JSON file generation from entity metadata.
 * @module tool/gen_i18n
 */

const fs = require('fs');
const { get_all_metas, get_entity_meta } = require('../core/meta');

/**
 * Capitalize first letter of string.
 * @param {string} s - String to capitalize.
 * @returns {string} Capitalized string.
 */
const capitalize = (s) => {
    if (typeof s !== 'string') return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
};

/**
 * Process entity metadata and add to i18n JSON.
 * @param {Object} json - I18n JSON object.
 * @param {Object} meta - Entity metadata.
 * @param {boolean} keep_hint - Whether to generate hint fields.
 */
const process_entity_i18n = (json, meta, keep_hint) => {
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
 * @param {string} file_path - Path to i18n JSON file.
 * @param {boolean} [keep_hint=false] - Whether to generate hint fields for each field.
 */
const gen_i18n = (file_path, keep_hint = false) => {
    // Read existing JSON file
    const json_file = fs.readFileSync(file_path, 'utf8');
    const json = JSON.parse(json_file);

    // Process all entity metadata
    const metas = get_all_metas();
    metas.forEach((meta_name) => {
        const meta = get_entity_meta(meta_name);
        process_entity_i18n(json, meta, keep_hint);
    });

    // Write updated JSON
    fs.writeFileSync(file_path, JSON.stringify(json, null, 2));
};

module.exports = { gen_i18n };
