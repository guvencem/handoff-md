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

// Approximate token count (rough: 1 token ≈ 4 chars)
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Token budgets per format
const BUDGETS: Record<FormatLevel, Record<string, number>> = {
  compact: {
    header: 150,
    stack: 150,
    structure: 200,
    conventions: 150,
    activity: 400,
    state: 300,
    issues: 100,
    env: 100,
    config: 100,
  },
  standard: {
    header: 200,
    stack: 200,
    structure: 400,
    conventions: 300,
    activity: 800,
    state: 500,
    issues: 300,
    env: 200,
    config: 300,
  },
  full: {
    header: 250,
    stack: 250,
    structure: 600,
    conventions: 400,
    activity: 1200,
    state: 700,
    issues: 500,
    env: 300,
    config: 500,
  },
};

export function truncateToTokenBudget(text: string, budget: number): string {
  const estimated = estimateTokens(text);
  if (estimated <= budget) return text;

  // Truncate to fit budget (budget * 4 chars)
  const maxChars = budget * 4;
  const truncated = text.slice(0, maxChars);
  const lastNewline = truncated.lastIndexOf('\n');
  return (lastNewline > 0 ? truncated.slice(0, lastNewline) : truncated) + '\n...truncated';
}

export function getBudget(format: FormatLevel): Record<string, number> {
  return BUDGETS[format];
}
