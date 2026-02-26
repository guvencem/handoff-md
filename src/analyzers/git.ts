import { exec, isGitRepo } from '../utils/exec';

export interface Commit {
  hash: string;
  message: string;
  author: string;
  date: string;
  files?: string[];
}

export interface Branch {
  name: string;
  relativeDate: string;
}

export interface GitData {
  currentBranch: string;
  recentCommits: Commit[];
  uncommittedChanges: string[];
  activeBranches: Branch[];
  lastMerge: Commit | null;
  conflictFiles: string[];
}

export function analyzeGit(cwd: string): GitData | null {
  if (!isGitRepo(cwd)) {
    return null;
  }

  const currentBranch = exec('git branch --show-current', cwd) || 'HEAD (detached)';

  // Recent commits
  const logOutput = exec('git log --oneline -20 --format="%h|%s|%an|%ai"', cwd);
  const recentCommits: Commit[] = logOutput
    ? logOutput.split('\n').filter(Boolean).map(line => {
        const [hash, message, author, date] = line.split('|');
        return { hash, message, author, date: date?.split(' ')[0] || '' };
      })
    : [];

  // Files changed in recent commits
  const diffOutput = exec('git diff --name-status HEAD~5 2>/dev/null', cwd);
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
  const statusOutput = exec('git status --porcelain', cwd);
  const uncommittedChanges = statusOutput
    ? statusOutput.split('\n').filter(Boolean).map(l => l.trim())
    : [];

  // Active branches (last 7 days)
  const branchOutput = exec(
    'git branch --sort=-committerdate --format="%(refname:short)|%(committerdate:relative)" 2>/dev/null',
    cwd
  );
  const activeBranches: Branch[] = branchOutput
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
  const mergeLog = exec('git log --merges -1 --format="%h|%s|%an|%ai" 2>/dev/null', cwd);
  let lastMerge: Commit | null = null;
  if (mergeLog) {
    const [hash, message, author, date] = mergeLog.split('|');
    lastMerge = { hash, message, author, date: date?.split(' ')[0] || '' };
  }

  // Conflict files
  const conflictOutput = exec('git diff --name-only --diff-filter=U 2>/dev/null', cwd);
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
