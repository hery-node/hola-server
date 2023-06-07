
const vm = require('node:vm');
const { range, scale, space } = require("./number");

const get_context = () => { return { range: range, scale: scale, space: space } }

const run_in_context = (code, ctx) => {
    vm.createContext(ctx);
    vm.runInContext(code, ctx);
    return ctx;
}

const verify_template = (template, knob) => {
    try {
        run_in_context("__output__=`" + template + "`;", knob);
    } catch (err) {
        return err.message;
    }
    return null;
}

const execute_template = (template, knob) => {
    const ctx = run_in_context("__output__=`" + template + "`;", knob);
    return ctx["__output__"];
}

module.exports = { get_context, run_in_context, verify_template, execute_template }
