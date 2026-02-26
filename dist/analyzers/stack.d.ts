export interface StackInfo {
    framework: string;
    language: string;
    packageManager: string;
    orm?: string;
    database?: string;
    auth?: string;
    deploy?: string;
    testing?: string;
    linter?: string;
}
export declare function analyzeStack(cwd: string): StackInfo;
//# sourceMappingURL=stack.d.ts.map