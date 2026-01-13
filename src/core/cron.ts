/**
 * Cron job scheduling utility functions.
 * @module core/cron
 */

import cron from 'node-cron';

/** Initialize and start cron jobs. */
export const init_cron = (crons: string[], tasks: (() => void)[], timezone: string = "Asia/Shanghai"): void => {
    crons.forEach((cronExpr, index) => {
        const schedule = cron.schedule(cronExpr, () => tasks[index](), { scheduled: true, timezone });
        schedule.start();
    });
};
