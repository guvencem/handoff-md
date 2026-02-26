"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.estimateTokens = estimateTokens;
exports.truncateToTokenBudget = truncateToTokenBudget;
exports.getBudget = getBudget;
// Approximate token count (rough: 1 token ≈ 4 chars)
function estimateTokens(text) {
    return Math.ceil(text.length / 4);
}
// Token budgets per format
const BUDGETS = {
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
function truncateToTokenBudget(text, budget) {
    const estimated = estimateTokens(text);
    if (estimated <= budget)
        return text;
    // Truncate to fit budget (budget * 4 chars)
    const maxChars = budget * 4;
    const truncated = text.slice(0, maxChars);
    const lastNewline = truncated.lastIndexOf('\n');
    return (lastNewline > 0 ? truncated.slice(0, lastNewline) : truncated) + '\n...truncated';
}
function getBudget(format) {
    return BUDGETS[format];
}
//# sourceMappingURL=assembler.js.map