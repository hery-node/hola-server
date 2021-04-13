const fs = require('fs');
const { get_all_metas, get_entity_meta } = require('../core/meta');

const capitalize = (s) => {
    if (typeof s !== 'string') return ''
    return s.charAt(0).toUpperCase() + s.slice(1)
}

const gen_i18n = (file_path, keep_hint) => {
    let json_file = fs.readFileSync(file_path);
    let json = JSON.parse(json_file);

    const metas = get_all_metas();
    for (let i = 0; i < metas.length; i++) {
        const meta = get_entity_meta(metas[i]);
        json[meta.collection] || (json[meta.collection] = {});
        json[meta.collection]["_label"] || (json[meta.collection]["_label"] = capitalize(meta.collection));
        const fields = meta.fields.filter(f => f.sys != true);
        for (let j = 0; j < fields.length; j++) {
            const field = fields[j];
            json[meta.collection][field.name] || (json[meta.collection][field.name] = capitalize(field.name));
            if (keep_hint) {
                json[meta.collection][field.name + "_hint"] || (json[meta.collection][field.name + "_hint"] = "")
            }
        }
    }
    fs.writeFileSync(file_path, JSON.stringify(json, null, 2));
}

module.exports = { gen_i18n }
