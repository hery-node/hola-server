/**
 * @fileoverview Template execution utilities using Node.js VM.
 * @module core/lhs
 */

const vm = require('node:vm');
const { range, scale, space } = require("./number");

/**
 * Get default context with number utilities.
 * @returns {Object} Context object with range, scale, and space functions.
 */
const get_context = () => ({ range, scale, space });

/**
 * Run code in VM context.
 * @param {string} code - JavaScript code to execute.
 * @param {Object} ctx - Context object for VM.
 * @returns {Object} Context object after execution.
 */
const run_in_context = (code, ctx) => {
    vm.createContext(ctx);
    vm.runInContext(code, ctx);
    return ctx;
};

/**
 * Verify template string is valid JavaScript.
 * @param {string} template - Template string to verify.
 * @param {Object} knob - Variable bindings for template.
 * @returns {string|null} Error message if invalid, null if valid.
 */
const verify_template = (template, knob) => {
    try {
        run_in_context("__output__=`" + template + "`;", knob);
        return null;
    } catch (err) {
        return err.message;
    }
};

/**
 * Execute template string and return result.
 * @param {string} template - Template string to execute.
 * @param {Object} knob - Variable bindings for template.
 * @returns {string} Executed template output.
 */
const execute_template = (template, knob) => {
    const ctx = run_in_context("__output__=`" + template + "`;", knob);
    return ctx["__output__"];
};

module.exports = { get_context, run_in_context, verify_template, execute_template };
