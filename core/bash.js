/**
 * @fileoverview Bash command execution and SSH utility functions.
 * @module core/bash
 */

const fs = require('fs');
const { exec } = require("child_process");
const { random_code } = require('./random');
const { is_log_debug, is_log_error, log_debug, log_error } = require('../db/db');

const LOG_BASH = "bash";

/**
 * Get temporary log file path.
 * @returns {Promise<string>} Path to temporary log file.
 */
const get_log_file = async () => {
    const home = await run_simple_local_cmd("echo ~");
    const log_dir = `${home}/.hola/ssh`;
    await run_local_cmd(`mkdir -p ${log_dir}`);
    return `${log_dir}/l_${random_code()}.log`;
};

/**
 * Build SSH command prefix.
 * @param {Object} host - Host configuration.
 * @returns {string} SSH command prefix.
 */
const build_ssh_prefix = (host) => {
    return `ssh ${host.auth} -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no -p ${host.port} ${host.user}@${host.ip}`;
};

/**
 * Run script on remote host via SSH.
 * @param {Object} host - Host info with user, ip, port, auth, name.
 * @param {string} script - Commands to run.
 * @param {Object} [log_extra] - Additional logging context.
 * @returns {Promise<{stdout: string, err?: string}>} Command result.
 */
const run_script = async (host, script, log_extra) => {
    return new Promise((resolve) => {
        const cmd = `${build_ssh_prefix(host)} /bin/bash <<'EOT'\n ${script} \nEOT\n`;
        exec(cmd, { maxBuffer: 1024 * 150000 }, (error, stdout) => {
            if (error) {
                if (is_log_error()) log_error(LOG_BASH, `error running on host:${host.name} script:${script},error:${error}`, log_extra);
                resolve({ stdout, err: `error running script:${script},error:${error}` });
            } else {
                if (is_log_debug()) log_debug(LOG_BASH, `executing on host:${host.name}, script:${script},stdout:${stdout}`, log_extra);
                resolve({ stdout });
            }
        });
    });
};

/**
 * Run script on remote host with file redirect to avoid progress bar issues.
 * @param {Object} host - Host info with user, ip, port, auth, name.
 * @param {string} script - Commands to run.
 * @param {Object} [log_extra] - Additional logging context.
 * @returns {Promise<{stdout: string, err?: string}>} Command result.
 */
const run_script_extra = async (host, script, log_extra) => {
    const log_file = await get_log_file();
    return new Promise((resolve) => {
        const cmd = `${build_ssh_prefix(host)} /bin/bash <<'EOT' > ${log_file} \n ${script} \nEOT\n`;
        exec(cmd, { maxBuffer: 1024 * 150000 }, (error, stdout) => {
            if (error) {
                if (is_log_error()) log_error(LOG_BASH, `error running on host:${host.name} script:${script},error:${error}`, log_extra);
                resolve({ stdout, err: `error running script:${script},error:${error}` });
            } else {
                const output = fs.readFileSync(log_file, { encoding: 'utf8', flag: 'r' });
                if (is_log_debug()) log_debug(LOG_BASH, `executing on host:${host.name}, script:${script},stdout:${output}`, log_extra);
                resolve({ stdout: output });
                fs.unlinkSync(log_file);
            }
        });
    });
};

/**
 * Run script file on remote host.
 * @param {Object} host - Host info.
 * @param {string} script_file - Path to local script file.
 * @param {Object} [log_extra] - Additional logging context.
 * @returns {Promise<{stdout: string, err?: string}>} Command result.
 */
const run_script_file = async (host, script_file, log_extra) => {
    return new Promise((resolve) => {
        const cmd = `${build_ssh_prefix(host)} /bin/bash < ${script_file}`;
        exec(cmd, (error, stdout) => {
            if (error) {
                if (is_log_error()) log_error(LOG_BASH, `error running on host:${host.name} script_file:${script_file},error:${error}`, log_extra);
                resolve({ stdout, err: `error running script:${script_file},error:${error}` });
            } else {
                if (is_log_debug()) log_debug(LOG_BASH, `executing on host:${host.name}, script_file:${script_file},stdout:${stdout}`, log_extra);
                resolve({ stdout });
            }
        });
    });
};

/**
 * Run command on local host.
 * @param {string} cmd - Command to execute.
 * @param {Object} [log_extra] - Additional logging context.
 * @returns {Promise<{stdout: string, err?: string}>} Command result.
 */
const run_local_cmd = async (cmd, log_extra) => {
    return new Promise((resolve) => {
        exec(cmd, { maxBuffer: 1024 * 15000000 }, (error, stdout) => {
            if (error) {
                if (is_log_error()) log_error(LOG_BASH, `error running on local host cmd:${cmd},error:${error}`, log_extra);
                resolve({ stdout, err: `error running cmd:${cmd},error:${error}` });
            } else {
                if (is_log_debug()) log_debug(LOG_BASH, `executing on local host cmd:${cmd},stdout:${stdout}`, log_extra);
                resolve({ stdout });
            }
        });
    });
};

/**
 * SCP remote file to local.
 * @param {Object} host - Remote host info.
 * @param {string} remote_file - Remote file path.
 * @param {string} local_file - Local file path.
 * @param {Object} [log_extra] - Additional logging context.
 * @returns {Promise<{stdout: string, err?: string}>} Command result.
 */
const scp = async (host, remote_file, local_file, log_extra) => {
    return new Promise((resolve) => {
        const cmd = `scp ${host.auth} -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -P ${host.port} -q ${host.user}@${host.ip}:${remote_file} ${local_file}`;
        exec(cmd, (error, stdout) => {
            if (error) {
                if (is_log_error()) log_error(LOG_BASH, `error scp on host:${host.name} remote:${remote_file},local:${local_file},error:${error}`, log_extra);
                resolve({ stdout, err: `error scp:${remote_file} to local:${local_file},err:${error}` });
            } else {
                if (is_log_debug()) log_debug(LOG_BASH, `executing scp on host:${host.name}, remote:${remote_file},local:${local_file},stdout:${stdout}`, log_extra);
                resolve({ stdout });
            }
        });
    });
};

/**
 * SCP local file to remote.
 * @param {Object} host - Remote host info.
 * @param {string} local_file - Local file path.
 * @param {string} remote_file - Remote file path.
 * @param {Object} [log_extra] - Additional logging context.
 * @returns {Promise<{stdout: string, err?: string}>} Command result.
 */
const scpr = async (host, local_file, remote_file, log_extra) => {
    return new Promise((resolve) => {
        const cmd = `scp ${host.auth} -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -P ${host.port} -q ${local_file} ${host.user}@${host.ip}:${remote_file}`;
        exec(cmd, (error, stdout) => {
            if (error) {
                if (is_log_error()) log_error(LOG_BASH, `error scpr on host:${host.name} remote:${remote_file},local:${local_file},error:${error}`, log_extra);
                resolve({ stdout, err: `error scp:${remote_file} to local:${local_file},err:${error}` });
            } else {
                if (is_log_debug()) log_debug(LOG_BASH, `executing scpr on host:${host.name}, remote:${remote_file},local:${local_file},stdout:${stdout}`, log_extra);
                resolve({ stdout });
            }
        });
    });
};

/**
 * Run simple command on remote host and get trimmed result.
 * @param {Object} host - Host info.
 * @param {string} cmd - Command to run.
 * @param {Object} [log_extra] - Additional logging context.
 * @returns {Promise<string|null>} Trimmed output or null on error.
 */
const run_simple_cmd = async (host, cmd, log_extra) => {
    const { err, stdout } = await run_script(host, cmd, log_extra);
    return err ? null : stdout.trim();
};

/**
 * Run simple command locally and get trimmed result.
 * @param {string} cmd - Command to run.
 * @param {Object} [log_extra] - Additional logging context.
 * @returns {Promise<string|null>} Trimmed output or null on error.
 */
const run_simple_local_cmd = async (cmd, log_extra) => {
    const { err, stdout } = await run_local_cmd(cmd, log_extra);
    return err ? null : stdout.trim();
};

/**
 * Extract info from stdout using regex pattern matching.
 * @param {string} stdout - Command output.
 * @param {string} key - Key to search for.
 * @param {Object} [log_extra] - Additional logging context.
 * @returns {string[]} Array of matched values.
 */
const get_info = (stdout, key, log_extra) => {
    const word_key = key.split(" ").join("\\s+");
    const regex = new RegExp(`\n\\s?${word_key}\\s?:(.*)\\s`, 'g');
    if (is_log_debug()) log_debug(LOG_BASH, `get_info regex:${JSON.stringify(regex)}`, log_extra);

    const results = stdout.matchAll(regex);
    const matched = [];
    for (const result of results) {
        matched.push(result[1].trim());
    }

    if (is_log_debug()) log_debug(LOG_BASH, `get_info matched:${JSON.stringify(matched)}`, log_extra);
    return matched;
};

/**
 * Get specific lines from array.
 * @param {string[]} array - Array of lines.
 * @param {number[]} lines - Line indices to get.
 * @returns {string[]} Selected lines.
 */
const get_lines = (array, lines) => lines.map((line) => array[line]);

/**
 * Read key-value pairs from stdout.
 * @param {string} stdout - Command output.
 * @param {string} [delimiter=":"] - Key-value delimiter.
 * @param {number[]} [lines] - Specific lines to read.
 * @param {Object} [config] - Filter config for keys.
 * @param {boolean} [exclude_mode] - If true, exclude keys in config.
 * @returns {Object} Parsed key-value object.
 */
const read_key_value_line = (stdout, delimiter = ":", lines, config, exclude_mode) => {
    const obj = {};
    if (!stdout) return obj;

    const contents = stdout.toString().split(/(?:\r\n|\r|\n)/g);
    const line_texts = lines ? get_lines(contents, lines) : contents;

    line_texts.forEach((content) => {
        const key_value = content.split(delimiter);
        if (key_value.length !== 2) return;

        const key = key_value[0].trim();
        const should_include = !config ||
            (exclude_mode !== true && config[key]) ||
            (exclude_mode === true && !config[`!${key}`]);

        if (key && should_include) {
            obj[key] = key_value[1].trim();
        }
    });
    return obj;
};

/**
 * Read structured lines into array of objects.
 * @param {string} stdout - Command output.
 * @param {string[]} keys - Attribute keys for columns.
 * @param {number} [ignore=1] - Lines to skip at start.
 * @param {string} [delimiter="  "] - Column delimiter.
 * @returns {Object[]} Array of parsed objects.
 */
const read_obj_line = (stdout, keys, ignore = 1, delimiter = "  ") => {
    const results = [];
    if (!stdout) return results;

    const contents = stdout.toString().split(/(?:\r\n|\r|\n)/g);
    const line_texts = contents.slice(ignore);

    line_texts.forEach((content) => {
        const values = content.split(delimiter);
        if (!values || values.length === 0 || values[0].trim().length === 0) return;

        const obj = {};
        const attrs = values.filter((f) => f.trim().length > 0);
        for (let i = 0; i < keys.length; i++) {
            const value = attrs[i];
            if (value) obj[keys[i]] = value.trim();
        }
        results.push(obj);
    });
    return results;
};

/**
 * Get multiple system attributes from remote host.
 * @param {Object} host - Host info.
 * @param {Array<{name: string, cmd: string}>} attrs - Attributes to fetch.
 * @param {Object} [log_extra] - Additional logging context.
 * @returns {Promise<Object>} Object with attribute values.
 */
const get_system_attributes = async (host, attrs, log_extra) => {
    const obj = {};
    for (const attr of attrs) {
        const value = await run_simple_cmd(host, attr.cmd, log_extra);
        if (value) obj[attr.name] = value;
    }
    return obj;
};

/**
 * Stop process on remote host if running.
 * @param {Object} host - Host info.
 * @param {string} process_name - Process name to stop.
 * @param {string} stop_cmd - Command to stop the process.
 * @param {boolean} [using_full] - Use pgrep -f for full command match.
 * @param {Object} [log_extra] - Additional logging context.
 * @returns {Promise<boolean>} True if process was running and stopped.
 */
const stop_process = async (host, process_name, stop_cmd, using_full, log_extra) => {
    const grep_cmd = using_full === true ? `pgrep -f "${process_name}" | wc -l` : `pgrep ${process_name} | wc -l`;
    const { stdout } = await run_script(host, grep_cmd, log_extra);
    const has_process = stdout && parseInt(stdout) > 0;
    if (has_process) await run_script(host, stop_cmd, log_extra);
    return has_process;
};

module.exports = {
    stop_process,
    scp,
    scpr,
    run_script,
    run_script_extra,
    run_script_file,
    run_simple_cmd,
    run_local_cmd,
    run_simple_local_cmd,
    get_info,
    get_system_attributes,
    read_key_value_line,
    read_obj_line
};