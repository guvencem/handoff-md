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
export declare function analyzeGit(cwd: string): GitData | null;
//# sourceMappingURL=git.d.ts.map