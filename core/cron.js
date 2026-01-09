/**
 * @fileoverview Cron job scheduling utility functions.
 * @module core/cron
 */

const node_cron = require('node-cron');

/**
 * Initialize and start cron jobs.
 * @param {string[]} crons - Array of cron expressions.
 * @param {Function[]} tasks - Array of task functions to execute.
 * @param {string} [timezone="Asia/Shanghai"] - Timezone for scheduling.
 */
const init_cron = async (crons, tasks, timezone = "Asia/Shanghai") => {
    crons.forEach((cron, index) => {
        const schedule = node_cron.schedule(cron, () => tasks[index](), { scheduled: true, timezone });
        schedule.start();
    });
};

module.exports = { init_cron };