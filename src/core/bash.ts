/**
 * Bash command execution and SSH utility functions.
 * @module core/bash
 */

import { $ } from 'bun';
import { random_code } from './random.js';
import { is_log_debug, is_log_error, log_debug, log_error } from '../db/db.js';

/** Serializable log value types. */
export type LogValue = string | number | boolean | null | undefined | LogValue[] | { [key: string]: LogValue };
export type LogExtra = Record<string, LogValue>;

const LOG_BASH = "bash";
const SSH_OPTIONS = "-o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no";

export interface Host {
    name: string;
    ip: string;
    port: number;
    user: string;
    auth: string;
}

export interface CommandResult {
    stdout: string;
    err?: string;
}

export interface SystemAttribute {
    name: string;
    cmd: string;
}

/** Execute command using Bun's native shell. */
const exec_cmd = async (cmd: string, error_msg: string, success_msg: string, log_extra?: LogExtra): Promise<CommandResult> => {
    try {
        const result = await $`${{ raw: cmd }}`.quiet();
        const stdout = result.text();
        if (is_log_debug()) log_debug(LOG_BASH, `${success_msg}, stdout:${stdout}`, log_extra);
        return { stdout };
    } catch (error) {
        const proc = error as { stdout?: { toString(): string } };
        const stdout = proc.stdout?.toString() ?? '';
        if (is_log_error()) log_error(LOG_BASH, `${error_msg}, error:${error}`, log_extra);
        return { stdout, err: `${error_msg}, error:${error}` };
    }
};

/** Run command on local host. */
export const run_local_cmd = (cmd: string, log_extra?: LogExtra): Promise<CommandResult> => {
    return exec_cmd(cmd,
        `error running on local host cmd:${cmd}`,
        `executing on local host cmd:${cmd}`, log_extra);
};

/** Run simple command locally and get trimmed result. */
export const run_simple_local_cmd = async (cmd: string, log_extra?: LogExtra): Promise<string | null> => {
    const { err, stdout } = await run_local_cmd(cmd, log_extra);
    return err ? null : stdout.trim();
};

/** Get temporary log file path. */
const get_log_file = async (): Promise<string> => {
    const home = await run_simple_local_cmd("echo ~");
    const log_dir = `${home}/.hola/ssh`;
    await run_local_cmd(`mkdir -p ${log_dir}`);
    return `${log_dir}/l_${random_code()}.log`;
};

/** Build SSH command prefix. */
const build_ssh_prefix = (host: Host): string => `ssh ${host.auth} ${SSH_OPTIONS} -p ${host.port} ${host.user}@${host.ip}`;

/** Build SCP command. */
const build_scp_cmd = (host: Host, src: string, dest: string, to_remote: boolean): string => {
    const remote_path = `${host.user}@${host.ip}:${to_remote ? dest : src}`;
    const local_path = to_remote ? src : dest;
    const [first, second] = to_remote ? [local_path, remote_path] : [remote_path, local_path];
    return `scp ${host.auth} ${SSH_OPTIONS} -P ${host.port} -q ${first} ${second}`;
};

/** Run script on remote host via SSH. */
export const run_script = (host: Host, script: string, log_extra?: LogExtra): Promise<CommandResult> => {
    const cmd = `${build_ssh_prefix(host)} /bin/bash <<'EOT'\n ${script} \nEOT\n`;
    return exec_cmd(cmd,
        `error running on host:${host.name} script:${script}`,
        `executing on host:${host.name}, script:${script}`, log_extra);
};

/** Run script on remote host with file redirect to avoid progress bar issues. */
export const run_script_extra = async (host: Host, script: string, log_extra?: LogExtra): Promise<CommandResult> => {
    const log_file = await get_log_file();
    const cmd = `${build_ssh_prefix(host)} /bin/bash <<'EOT' > ${log_file} \n ${script} \nEOT\n`;

    try {
        await $`${{ raw: cmd }}`.quiet();
        const output = await Bun.file(log_file).text();
        if (is_log_debug()) log_debug(LOG_BASH, `executing on host:${host.name}, script:${script}, stdout:${output}`, log_extra);
        await Bun.file(log_file).unlink?.() ?? $`rm ${log_file}`.quiet();
        return { stdout: output };
    } catch (error) {
        const proc = error as { stdout?: { toString(): string } };
        const stdout = proc.stdout?.toString() ?? '';
        if (is_log_error()) log_error(LOG_BASH, `error running on host:${host.name} script:${script}, error:${error}`, log_extra);
        return { stdout, err: `error running script:${script}, error:${error}` };
    }
};

/** Run script file on remote host. */
export const run_script_file = (host: Host, script_file: string, log_extra?: LogExtra): Promise<CommandResult> => {
    const cmd = `${build_ssh_prefix(host)} /bin/bash < ${script_file}`;
    return exec_cmd(cmd,
        `error running on host:${host.name} script_file:${script_file}`,
        `executing on host:${host.name}, script_file:${script_file}`, log_extra);
};

/** SCP remote file to local. */
export const scp = (host: Host, remote_file: string, local_file: string, log_extra?: LogExtra): Promise<CommandResult> => {
    const cmd = build_scp_cmd(host, remote_file, local_file, false);
    return exec_cmd(cmd,
        `error scp on host:${host.name} remote:${remote_file}, local:${local_file}`,
        `executing scp on host:${host.name}, remote:${remote_file}, local:${local_file}`, log_extra);
};

/** SCP local file to remote. */
export const scpr = (host: Host, local_file: string, remote_file: string, log_extra?: LogExtra): Promise<CommandResult> => {
    const cmd = build_scp_cmd(host, local_file, remote_file, true);
    return exec_cmd(cmd,
        `error scpr on host:${host.name} remote:${remote_file}, local:${local_file}`,
        `executing scpr on host:${host.name}, remote:${remote_file}, local:${local_file}`, log_extra);
};

/** Run simple command on remote host and get trimmed result. */
export const run_simple_cmd = async (host: Host, cmd: string, log_extra?: LogExtra): Promise<string | null> => {
    const { err, stdout } = await run_script(host, cmd, log_extra);
    return err ? null : stdout.trim();
};

/** Extract info from stdout using regex pattern matching. */
export const get_info = (stdout: string, key: string, log_extra?: LogExtra): string[] => {
    const word_key = key.split(" ").join("\\s+");
    const regex = new RegExp(`\n\\s?${word_key}\\s?:(.*)\\s`, 'g');
    if (is_log_debug()) log_debug(LOG_BASH, `get_info regex:${JSON.stringify(regex)}`, log_extra);

    const matched = [...stdout.matchAll(regex)].map(result => result[1].trim());
    if (is_log_debug()) log_debug(LOG_BASH, `get_info matched:${JSON.stringify(matched)}`, log_extra);
    return matched;
};

/** Read key-value pairs from stdout. */
export const read_key_value_line = (stdout: string, delimiter: string = ":", lines?: number[], config?: Record<string, boolean>, exclude_mode?: boolean): Record<string, string> => {
    if (!stdout) return {};

    const contents = stdout.toString().split(/(?:\r\n|\r|\n)/g);
    const line_texts = lines ? lines.map(i => contents[i]) : contents;

    return line_texts.reduce((obj, content) => {
        const key_value = content.split(delimiter);
        if (key_value.length !== 2) return obj;

        const key = key_value[0].trim();
        const should_include = !config ||
            (exclude_mode !== true && config[key]) ||
            (exclude_mode === true && !config[`!${key}`]);

        if (key && should_include) obj[key] = key_value[1].trim();
        return obj;
    }, {} as Record<string, string>);
};

/** Read structured lines into array of objects. */
export const read_obj_line = (stdout: string, keys: string[], ignore: number = 1, delimiter: string = "  "): Record<string, string>[] => {
    if (!stdout) return [];

    return stdout.toString().split(/(?:\r\n|\r|\n)/g)
        .slice(ignore)
        .filter(content => content.trim().length > 0)
        .map(content => {
            const attrs = content.split(delimiter).filter(f => f.trim().length > 0);
            return keys.reduce((obj, key, i) => {
                if (attrs[i]) obj[key] = attrs[i].trim();
                return obj;
            }, {} as Record<string, string>);
        });
};

/** Get multiple system attributes from remote host. */
export const get_system_attributes = async (host: Host, attrs: SystemAttribute[], log_extra?: LogExtra): Promise<Record<string, string>> => {
    const results = await Promise.all(attrs.map(attr => run_simple_cmd(host, attr.cmd, log_extra)));
    return attrs.reduce((obj, attr, i) => {
        if (results[i]) obj[attr.name] = results[i]!;
        return obj;
    }, {} as Record<string, string>);
};

/** Stop process on remote host if running. */
export const stop_process = async (host: Host, process_name: string, stop_cmd: string, using_full?: boolean, log_extra?: LogExtra): Promise<boolean> => {
    const grep_cmd = using_full ? `pgrep -f "${process_name}" | wc -l` : `pgrep ${process_name} | wc -l`;
    const { stdout } = await run_script(host, grep_cmd, log_extra);
    const has_process = stdout && parseInt(stdout) > 0 ? true : false;
    if (has_process) await run_script(host, stop_cmd, log_extra);
    return has_process;
};
