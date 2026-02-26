"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeGit = analyzeGit;
const exec_1 = require("../utils/exec");
function analyzeGit(cwd) {
    if (!(0, exec_1.isGitRepo)(cwd)) {
        return null;
    }
    const currentBranch = (0, exec_1.exec)('git branch --show-current', cwd) || 'HEAD (detached)';
    // Recent commits
    const logOutput = (0, exec_1.exec)('git log --oneline -20 --format="%h|%s|%an|%ai"', cwd);
    const recentCommits = logOutput
        ? logOutput.split('\n').filter(Boolean).map(line => {
            const [hash, message, author, date] = line.split('|');
            return { hash, message, author, date: date?.split(' ')[0] || '' };
        })
        : [];
    // Files changed in recent commits
    const diffOutput = (0, exec_1.exec)('git diff --name-status HEAD~5 2>/dev/null', cwd);
    if (diffOutput && recentCommits.length > 0) {
        const changedFiles = diffOutput.split('\n').filter(Boolean).map(l => {
            const parts = l.split('\t');
            return parts[parts.length - 1];
        });
        // Attach to first commit as summary
        if (recentCommits[0]) {
            recentCommits[0].files = changedFiles.slice(0, 15);
        }
    }
    // Uncommitted changes
    const statusOutput = (0, exec_1.exec)('git status --porcelain', cwd);
    const uncommittedChanges = statusOutput
        ? statusOutput.split('\n').filter(Boolean).map(l => l.trim())
        : [];
    // Active branches (last 7 days)
    const branchOutput = (0, exec_1.exec)('git branch --sort=-committerdate --format="%(refname:short)|%(committerdate:relative)" 2>/dev/null', cwd);
    const activeBranches = branchOutput
        ? branchOutput
            .split('\n')
            .filter(Boolean)
            .slice(0, 10)
            .map(line => {
            const [name, relativeDate] = line.split('|');
            return { name, relativeDate: relativeDate || '' };
        })
        : [];
    // Last merge commit
    const mergeLog = (0, exec_1.exec)('git log --merges -1 --format="%h|%s|%an|%ai" 2>/dev/null', cwd);
    let lastMerge = null;
    if (mergeLog) {
        const [hash, message, author, date] = mergeLog.split('|');
        lastMerge = { hash, message, author, date: date?.split(' ')[0] || '' };
    }
    // Conflict files
    const conflictOutput = (0, exec_1.exec)('git diff --name-only --diff-filter=U 2>/dev/null', cwd);
    const conflictFiles = conflictOutput
        ? conflictOutput.split('\n').filter(Boolean)
        : [];
    return {
        currentBranch,
        recentCommits,
        uncommittedChanges,
        activeBranches,
        lastMerge,
        conflictFiles,
    };
}
//# sourceMappingURL=git.js.map