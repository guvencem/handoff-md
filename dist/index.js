#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const git_1 = require("./analyzers/git");
const stack_1 = require("./analyzers/stack");
const structure_1 = require("./analyzers/structure");
const config_1 = require("./analyzers/config");
const assembler_1 = require("./assembler");
const renderer_1 = require("./renderer");
const clipboard_1 = require("./utils/clipboard");
const VERSION = '1.0.0';
const program = new commander_1.Command();
program
    .name('handoff')
    .description('Cross-model project continuity engine. Analyze your repo, generate HANDOFF.md for any AI model.')
    .version(VERSION)
    .argument('[path]', 'Path to the repository', '.')
    .option('-c, --copy', 'Copy output to clipboard')
    .option('-s, --stdout', 'Print output to stdout instead of writing file')
    .option('-v, --verbose', 'Show detailed analysis info')
    .option('-f, --format <level>', 'Output format: compact, standard, full', 'standard')
    .option('--install-hook', 'Install as git post-commit hook')
    .action(async (repoPath, options) => {
    const cwd = path.resolve(repoPath);
    if (!fs.existsSync(cwd)) {
        console.error(`Error: Path "${cwd}" does not exist.`);
        process.exit(1);
    }
    // Install git hook
    if (options.installHook) {
        installHook(cwd);
        return;
    }
    const format = ['compact', 'standard', 'full'].includes(options.format)
        ? options.format
        : 'standard';
    if (options.verbose) {
        console.log(`🔍 Analyzing ${cwd}...`);
    }
    // Run analyzers
    if (options.verbose)
        console.log('  → Git analysis...');
    const git = (0, git_1.analyzeGit)(cwd);
    if (options.verbose)
        console.log('  → Stack detection...');
    const stack = (0, stack_1.analyzeStack)(cwd);
    if (options.verbose)
        console.log('  → Structure analysis...');
    const structure = (0, structure_1.analyzeStructure)(cwd);
    if (options.verbose)
        console.log('  → Config reading...');
    const config = (0, config_1.readConfigs)(cwd);
    // Detect project name
    const projectName = detectProjectName(cwd);
    // Assemble context
    const ctx = {
        projectName,
        timestamp: new Date().toISOString().replace('T', ' ').split('.')[0],
        git,
        stack,
        structure,
        config,
        format,
    };
    // Render
    const output = (0, renderer_1.renderHandoff)(ctx);
    const tokenCount = (0, assembler_1.estimateTokens)(output);
    if (options.verbose) {
        console.log(`\n📊 Analysis complete:`);
        console.log(`  Stack: ${stack.framework} + ${stack.language}`);
        console.log(`  Format: ${format}`);
        console.log(`  Token count: ~${tokenCount}`);
        if (git) {
            console.log(`  Branch: ${git.currentBranch}`);
            console.log(`  Recent commits: ${git.recentCommits.length}`);
            console.log(`  Uncommitted changes: ${git.uncommittedChanges.length}`);
        }
        console.log(`  TODOs found: ${structure.todos.length}`);
        if (config) {
            console.log(`  AI config found: ${config.configSource}`);
        }
        console.log('');
    }
    if (options.stdout) {
        console.log(output);
    }
    else if (options.copy) {
        const success = await (0, clipboard_1.copyToClipboard)(output);
        if (success) {
            console.log(`✅ HANDOFF copied to clipboard (~${tokenCount} tokens)`);
        }
        else {
            console.error('❌ Failed to copy to clipboard. Printing to stdout instead:');
            console.log(output);
        }
    }
    else {
        // Write to HANDOFF.md
        const outputPath = path.join(cwd, 'HANDOFF.md');
        fs.writeFileSync(outputPath, output, 'utf-8');
        console.log(`✅ HANDOFF.md generated (~${tokenCount} tokens)`);
        console.log(`   ${outputPath}`);
    }
});
function detectProjectName(cwd) {
    // Try package.json
    try {
        const pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf-8'));
        if (pkg.name && pkg.name !== 'unnamed')
            return pkg.name;
    }
    catch { }
    // Try Cargo.toml
    try {
        const cargo = fs.readFileSync(path.join(cwd, 'Cargo.toml'), 'utf-8');
        const match = cargo.match(/name\s*=\s*"([^"]+)"/);
        if (match)
            return match[1];
    }
    catch { }
    // Try pyproject.toml
    try {
        const pyproject = fs.readFileSync(path.join(cwd, 'pyproject.toml'), 'utf-8');
        const match = pyproject.match(/name\s*=\s*"([^"]+)"/);
        if (match)
            return match[1];
    }
    catch { }
    // Fallback to directory name
    return path.basename(cwd);
}
function installHook(cwd) {
    const hooksDir = path.join(cwd, '.git', 'hooks');
    if (!fs.existsSync(hooksDir)) {
        console.error('Error: Not a git repository or .git/hooks not found.');
        process.exit(1);
    }
    const hookPath = path.join(hooksDir, 'post-commit');
    const hookContent = `#!/bin/sh\nnpx handoff\n`;
    if (fs.existsSync(hookPath)) {
        const existing = fs.readFileSync(hookPath, 'utf-8');
        if (existing.includes('npx handoff')) {
            console.log('ℹ️  Git hook already installed.');
            return;
        }
        // Append to existing hook
        fs.appendFileSync(hookPath, '\n' + hookContent);
    }
    else {
        fs.writeFileSync(hookPath, hookContent, { mode: 0o755 });
    }
    console.log('✅ Git post-commit hook installed. HANDOFF.md will update on every commit.');
}
program.parse();
//# sourceMappingURL=index.js.map