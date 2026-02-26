"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exec = exec;
exports.isGitRepo = isGitRepo;
const child_process_1 = require("child_process");
function exec(command, cwd) {
    try {
        return (0, child_process_1.execSync)(command, {
            cwd: cwd || process.cwd(),
            encoding: 'utf-8',
            timeout: 15000,
            stdio: ['pipe', 'pipe', 'pipe'],
        }).trim();
    }
    catch {
        return '';
    }
}
function isGitRepo(cwd) {
    const result = exec('git rev-parse --is-inside-work-tree', cwd);
    return result === 'true';
}
//# sourceMappingURL=exec.js.map