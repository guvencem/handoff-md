import { GitData } from './analyzers/git';
import { StackInfo } from './analyzers/stack';
import { StructureData } from './analyzers/structure';
import { ConfigData } from './analyzers/config';
export type FormatLevel = 'compact' | 'standard' | 'full';
export interface AssembledContext {
    projectName: string;
    timestamp: string;
    git: GitData | null;
    stack: StackInfo;
    structure: StructureData;
    config: ConfigData | null;
    format: FormatLevel;
}
export declare function estimateTokens(text: string): number;
export declare function truncateToTokenBudget(text: string, budget: number): string;
export declare function getBudget(format: FormatLevel): Record<string, number>;
//# sourceMappingURL=assembler.d.ts.map