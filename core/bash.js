const fs = require('fs');
const { exec } = require("child_process");
const { random_code } = require('./random');
const { is_log_debug, is_log_error, log_debug, log_error } = require('../db/db');

const LOG_BASH = "bash";

const get_log_file = async () => {
    const home = await run_simple_local_cmd("echo ~");
    const log_dir = `${home}/.hola/ssh`;
    await run_local_cmd(`mkdir -p ${log_dir}`);
    return `${log_dir}/l_${random_code()}.log`;
}

/**
 * Run script and get stdout
 * @param {host info,contains user,ip and password} host
 * @param {commands to run} script
 * @returns 
 */
const run_script = async (host, script, log_extra) => {
    const log_file = await get_log_file();

    return new Promise((resolve) => {
        exec(`ssh ${host.auth} -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no -p ${host.port} ${host.user}@${host.ip} /bin/bash <<'EOT' > ${log_file} \n ${script} \nEOT\n`, { maxBuffer: 1024 * 150000 }, (error, stdout) => {
            if (error) {
                if (is_log_error()) {
                    log_error(LOG_BASH, "error running on host:" + host.name + " the script:" + script + ",error:" + error, log_extra);
                }
                resolve({ stdout: stdout, err: "error running the script:" + script + ",error:" + error });
            } else {
                const output = fs.readFileSync(log_file, { encoding: 'utf8', flag: 'r' });
                if (is_log_debug()) {
                    log_debug(LOG_BASH, "executing on host:" + host.name + ", script:" + script + ",stdout:" + output, log_extra);
                }
                resolve({ stdout: output });
                fs.unlinkSync(log_file);
            }
        });
    });
};

const run_script_file = async (host, script_file, log_extra) => {
    const log_file = await get_log_file();

    return new Promise((resolve) => {
        exec(`ssh ${host.auth} -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no -p ${host.port} ${host.user}@${host.ip} /bin/bash < ${script_file} > ${log_file}`, (error, stdout) => {
            if (error) {
                if (is_log_error()) {
                    log_error(LOG_BASH, "error running on host:" + host.name + " the script_file:" + script_file + ",error:" + error, log_extra);
                }
                resolve({ stdout: stdout, err: "error running the script:" + script_file + ",error:" + error });
            } else {
                const output = fs.readFileSync(log_file, { encoding: 'utf8', flag: 'r' });
                if (is_log_debug()) {
                    log_debug(LOG_BASH, "executing on host:" + host.name + ", script_file:" + script_file + ",stdout:" + output, log_extra);
                }
                resolve({ stdout: output });
                fs.unlinkSync(log_file);
            }
        });
    });
};

/**
 * Run command in local host
 * @param {command to execute} cmd 
 * @returns 
 */
const run_local_cmd = async (cmd, log_extra) => {
    return new Promise((resolve) => {
        exec(cmd, { maxBuffer: 1024 * 15000000 }, (error, stdout) => {
            if (error) {
                if (is_log_error()) {
                    log_error(LOG_BASH, "error running on local host with cmd:" + cmd + ",error:" + error, log_extra);
                }
                resolve({ stdout: stdout, err: "error running the cmd:" + cmd + ",error:" + error }, log_extra);
            } else {
                if (is_log_debug()) {
                    log_debug(LOG_BASH, "executing on local host with cmd:" + cmd + ",stdout:" + stdout, log_extra);
                }
                resolve({ stdout: stdout });
            }
        });
    });
};

/**
 * Scp remote file to local file
 * @param {remote host} host 
 * @param {remote file path} remote_file 
 * @param {local file path} locale_file 
 * @returns 
 */
const scp = async (host, remote_file, local_file, log_extra) => {
    return new Promise((resolve) => {
        exec(`scp ${host.auth} -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -P ${host.port} -q ${host.user}@${host.ip}:${remote_file} ${local_file}`, (error, stdout) => {
            if (error) {
                if (is_log_error()) {
                    log_error(LOG_BASH, "error scp on host:" + host.name + " remote:" + remote_file + ",local:" + local_file + ",error:" + error, log_extra);
                }
                resolve({ stdout: stdout, err: "error scp:" + remote_file + " to locale:" + local_file + ",err:" + error });
            } else {
                if (is_log_debug()) {
                    log_debug(LOG_BASH, "executing scp on host:" + host.name + ", remote:" + remote_file + ",local:" + local_file + ",stdout:" + stdout, log_extra);
                }
                resolve({ stdout: stdout });
            }
        });
    });
};

/**
 * Scp local file to remote file
 * @param {remote host} host 
 * @param {local file path} locale_file 
 * @param {remote file path} remote_file 
 * @returns 
 */
const scpr = async (host, local_file, remote_file, log_extra) => {
    return new Promise((resolve) => {
        exec(`scp ${host.auth} -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -P ${host.port} -q ${local_file} ${host.user}@${host.ip}:${remote_file}`, (error, stdout) => {
            if (error) {
                if (is_log_error()) {
                    log_error(LOG_BASH, "error scpr on host:" + host.name + " remote:" + remote_file + ",local:" + local_file + ",error:" + error, log_extra);
                }
                resolve({ stdout: stdout, err: "error scp:" + remote_file + " to locale:" + local_file + ",err:" + error });
            } else {
                if (is_log_debug()) {
                    log_debug(LOG_BASH, "executing scpr on host:" + host.name + ", remote:" + remote_file + ",local:" + local_file + ",stdout:" + stdout, log_extra);
                }
                resolve({ stdout: stdout });
            }
        });
    });
};

/**
 *Just run simple command and get result directly 
 * @param {host info,contains user,ip and password} host 
 * @param {command to run} cmd 
 * @returns 
 */
const run_simple_cmd = async (host, cmd, log_extra) => {
    const { err, stdout } = await run_script(host, cmd, log_extra);
    if (err) {
        return null;
    } else {
        return stdout.trim();
    }
}

/**
 *Just run simple command and get result directly 
 * @param {command to run} cmd 
 * @returns 
 */
const run_simple_local_cmd = async (cmd, log_extra) => {
    const { err, stdout } = await run_local_cmd(cmd, log_extra);
    if (err) {
        return null;
    } else {
        return stdout.trim();
    }
}

/**
 * Use regular expression to match the pattern to get some part of value
        Speed: Unknown
        Manufacturer: NO DIMM
        Serial Number: NO DIMM
        Asset Tag:
        Part Number: NO DIMM
        Rank: Unknown
        Configured Memory Speed: Unknown
        Minimum Voltage: 1.2 V
        Maximum Voltage: 1.2 V
        Configured Voltage: 1.2 V

 * @param {stdout of the run_cmd} stdout 
 * @param {key to retrieve info} key 
 * @returns 
 */
const get_info = (stdout, key, log_extra) => {
    const word_key = key.split(" ").join("\\s+");
    const regex = new RegExp(`\n\\s?${word_key}\\s?:(.*)\\s`, 'g');
    if (is_log_debug()) {
        log_debug(LOG_BASH, "get_info and regex:" + JSON.stringify(regex), log_extra);
    }

    const results = stdout.matchAll(regex);

    const matched = [];
    for (let result of results) {
        matched.push(result[1].trim());
    }

    if (is_log_debug()) {
        log_debug(LOG_BASH, "get_info and matched:" + JSON.stringify(matched), log_extra);
    }
    return matched;
}

/**
 * Get the lines of array
 * @param {array of lines} array 
 * @param {array of line number to get,use range to define the lines} lines 
 * @returns 
 */
const get_lines = (array, lines) => {
    const result = [];
    lines.forEach(line => {
        result.push(array[line]);
    });
    return result;
}

/**
 * Read all the lines to object such as lscpu to retrieve all the cpu info
    Core(s) per socket:  28
    Socket(s):           2
    NUMA node(s):        2
    Vendor ID:           GenuineIntel
    CPU family:          6
    Model:               85
    Model name:          Intel(R) Xeon(R) Gold 6258R CPU @ 2.70GHz
    Stepping:            7
    CPU MHz:             2965.749
    CPU max MHz:         4000.0000
    CPU min MHz:         1000.0000
    BogoMIPS:            5400.00
    Virtualization:      VT-x
    L1d cache:           32K
    L1i cache:           32K

 * @param {stdout of the run_cmd} stdout 
 * @param {delimiter to split} delimiter 
 * @param {lines to retrieve} lines 
 * @param {only retrieve the value that has the same property in config} config 
 * @returns 
 */
const read_key_value_line = (stdout, delimiter = ":", lines, config, exclude_mode) => {
    const obj = {};
    if (!stdout) {
        return obj;
    }

    const contents = stdout.toString().split(/(?:\r\n|\r|\n)/g);
    const line_texts = lines ? get_lines(contents, lines) : contents;
    line_texts.forEach(content => {
        const key_value = content.split(delimiter);
        if (key_value.length == 2) {
            const key = key_value[0].trim();
            if (key && !config || (exclude_mode != true && config && config[key]) || exclude_mode == true && config && !config[`!${key}`]) {
                obj[key] = key_value[1].trim();
            }
        }
    });
    return obj;
}


/**
 * Use delimeter to split the line and retrieve the info
 *
    MODEL                                     SIZE
    INTEL SSDSC2KB03                          3.5T
    INTEL SSDPE2KE032T7                       2.9T

 * @param {stdout of the run_cmd} stdout 
 * @param {the attribute keys} keys 
 * @param {the lines to ignore} ignore 
 * @param {delimiter to split the line} delimiter 
 * @returns 
 */
const read_obj_line = (stdout, keys, ignore = 1, delimiter = "  ") => {
    const results = [];
    if (!stdout) {
        return results;
    }

    const contents = stdout.toString().split(/(?:\r\n|\r|\n)/g);
    const line_texts = contents.slice(ignore);
    line_texts.forEach(content => {
        const values = content.split(delimiter);
        if (values && values.length > 0 && values[0].trim().length > 0) {
            const obj = {};
            const attrs = values.filter(f => f.trim().length > 0);
            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];
                const value = attrs[i];
                value && (obj[key] = value.trim());
            }
            results.push(obj);
        }
    });
    return results;
}

/**
 * Retrive attributes value and put it to obj
 * @param {host info,contains user,ip and password} host
 * @param {*} attrs  {name:"attr name",cmd:"command to get the attr"}
 */
const get_system_attributes = async (host, attrs, log_extra) => {
    const obj = {};
    for (let i = 0; i < attrs.length; i++) {
        const attr = attrs[i];
        const value = await run_simple_cmd(host, attr.cmd, log_extra);
        value && (obj[attr.name] = value);
    }
    return obj;
}

const stop_process = async (host, process_name, stop_cmd, using_full, log_extra) => {
    const grep_cmd = using_full == true ? `pgrep -f "${process_name}" | wc -l` : `pgrep ${process_name} | wc -l`;
    const { stdout } = await run_script(host, grep_cmd, log_extra);
    const has_process = stdout && parseInt(stdout) > 0;
    if (has_process) {
        await run_script(host, stop_cmd, log_extra);
    }
    return has_process;
}

module.exports = { stop_process, scp, scpr, run_script, run_script_file, run_simple_cmd, run_local_cmd, run_simple_local_cmd, get_info, get_system_attributes, read_key_value_line, read_obj_line };