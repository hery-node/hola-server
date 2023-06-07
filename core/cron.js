const node_cron = require('node-cron');

const init_cron = async (crons, tasks) => {
    crons.forEach((cron, index) => {
        const schedule = node_cron.schedule(cron, () => { tasks[index](); }, { scheduled: true, timezone: "Asia/Shanghai" });
        schedule.start();
    });
}

module.exports = { init_cron };