export interface DirectoryEntry {
    name: string;
    type: 'file' | 'dir';
    children?: DirectoryEntry[];
}
export interface Convention {
    category: string;
    pattern: string;
}
export interface Todo {
    file: string;
    line: number;
    type: 'TODO' | 'FIXME' | 'HACK';
    text: string;
}
export interface StructureData {
    tree: DirectoryEntry[];
    entryPoints: string[];
    conventions: Convention[];
    todos: Todo[];
    envVars: string[];
}
export declare function buildTree(cwd: string, maxDepth?: number): DirectoryEntry[];
export declare function treeToString(entries: DirectoryEntry[], prefix?: string): string;
export declare function detectConventions(cwd: string): Convention[];
export declare function findTodos(cwd: string, maxResults?: number): Todo[];
export declare function findEnvVars(cwd: string): string[];
export declare function detectEntryPoints(cwd: string): string[];
export declare function analyzeStructure(cwd: string): StructureData;
//# sourceMappingURL=structure.d.ts.map