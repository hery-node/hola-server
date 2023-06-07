const { has_value } = require("./validate");

const set_chart_header = (arr1, prefix) => {
    if (!arr1 || arr1.length < 1) {
        return;
    }
    const headers = arr1[0];
    if (!headers || headers.length < 1) {
        return;
    }
    for (let i = 1; i < headers.length; i++) {
        headers[i] = `${prefix}${headers[i]}`;
    }
}

const merge_chart_data = (arr1, arr2) => {
    if (!arr1 || arr1.length < 2 || !arr2 || arr2.length < 2) {
        return;
    }

    const max = Math.max(arr1.length, arr2.length);
    const arr1_cols = arr1[0].length;
    const arr2_cols = arr2[0].length;
    for (let i = 0; i < max; i++) {
        if (!has_value(arr1[i])) {
            arr1[i] = [...new Array(arr1_cols)].map(o => "");
            arr1[i][0] = arr2[i][0];
        }
        if (!has_value(arr2[i])) {
            arr2[i] = [...new Array(arr2_cols)].map(o => "");
        }
        arr1[i] = [...arr1[i], ...arr2[i].splice(1)];
    }
}

module.exports = { set_chart_header, merge_chart_data }