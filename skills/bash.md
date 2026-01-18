# Bash Utilities Skill

## Overview

The `hola-server/core/bash.js` module provides comprehensive utilities for executing local and remote (SSH) commands, handling file transfers (SCP), and managing processes. It includes built-in logging and error handling.

## Importing

```javascript
const {
    stop_process, scp, scpr,
    run_script, run_script_extra, run_script_file,
    run_simple_cmd, run_local_cmd, run_simple_local_cmd,
    get_info, get_system_attributes,
    read_key_value_line, read_obj_line
} from "hola-server";
```

## API Reference

### 1. Remote Execution (SSH)

#### `run_script(host, script, log_extra)`
Executes a script/command on a remote host via SSH.
- **param**: `host` (Object) - Host info `{name, user, ip, port, auth}`.
- **param**: `script` (string) - Shell commands to run.
- **param**: `log_extra` (Object) - Optional context for logging.
- **returns**: `Promise<{stdout, err}>`

```javascript
const host = { name: "web1", user: "root", ip: "10.0.0.1", port: 22, auth: "-i ~/.ssh/id_rsa" };
const { stdout, err } = await run_script(host, "ls -la /var/www");
```

#### `run_simple_cmd(host, cmd, log_extra)`
Wrapper around `run_script` that returns trimmed stdout or null on error.
- **returns**: `Promise<string|null>`

```javascript
const uptime = await run_simple_cmd(host, "uptime");
```

#### `run_script_file(host, script_file, log_extra)`
Reads a local script file and executes it on the remote host.
- **param**: `script_file` (string) - Path to local script.
- **returns**: `Promise<{stdout, err}>`

#### `stop_process(host, process_name, stop_cmd, using_full, log_extra)`
Checks if a process is running on remote host and stops it if found.
- **param**: `process_name` (string) - Name to grep for.
- **param**: `stop_cmd` (string) - Command to kill the process (e.g. `pkill node`).
- **param**: `using_full` (boolean) - If true, uses `pgrep -f`.
- **returns**: `Promise<boolean>` - True if process was running.

### 2. File Transfer (SCP)

#### `scp(host, remote_file, local_file, log_extra)`
Downloads a file from remote to local.
- **returns**: `Promise<{stdout, err}>`

#### `scpr(host, local_file, remote_file, log_extra)`
Uploads a file from local to remote.
- **returns**: `Promise<{stdout, err}>`

### 3. Local Execution

#### `run_local_cmd(cmd, log_extra)`
Executes a command on the local machine.
- **returns**: `Promise<{stdout, err}>`

#### `run_simple_local_cmd(cmd, log_extra)`
Executes local command and returns trimmed stdout or null on error.
- **returns**: `Promise<string|null>`

### 4. Output Parsing

#### `get_info(stdout, key, log_extra)`
Extracts values from stdout using regex pattern `key: value`.
- **returns**: `string[]` - Array of matched values.

#### `read_key_value_line(stdout, delimiter, lines, config, exclude_mode)`
Parses output lines into a key-value object.
- **param**: `delimiter` (string) - Separator (default ":").
- **param**: `lines` (number[]) - Specific line indices to read.
- **returns**: `Object`

#### `read_obj_line(stdout, keys, ignore, delimiter)`
Parses columnar output into array of objects.
- **param**: `keys` (string[]) - Property names for columns.
- **param**: `ignore` (number) - Number of header lines to skip.
- **returns**: `Object[]`
