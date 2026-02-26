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
exports.buildTree = buildTree;
exports.treeToString = treeToString;
exports.detectConventions = detectConventions;
exports.findTodos = findTodos;
exports.findEnvVars = findEnvVars;
exports.detectEntryPoints = detectEntryPoints;
exports.analyzeStructure = analyzeStructure;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const IGNORE_DIRS = new Set([
    'node_modules', '.git', '.next', '.nuxt', '.svelte-kit', '.output',
    'dist', 'build', 'out', '.cache', '.turbo', '.vercel', '.netlify',
    'coverage', '__pycache__', '.pytest_cache', 'target', 'vendor',
    '.idea', '.vscode', '.DS_Store', 'venv', '.venv', 'env',
]);
const IGNORE_FILES = new Set([
    '.DS_Store', 'Thumbs.db', '.gitkeep',
]);
function buildTree(cwd, maxDepth = 2) {
    function walk(dir, depth) {
        if (depth > maxDepth)
            return [];
        let entries;
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        }
        catch {
            return [];
        }
        const result = [];
        // Sort: dirs first, then files
        const sorted = entries.sort((a, b) => {
            if (a.isDirectory() && !b.isDirectory())
                return -1;
            if (!a.isDirectory() && b.isDirectory())
                return 1;
            return a.name.localeCompare(b.name);
        });
        for (const entry of sorted) {
            if (IGNORE_DIRS.has(entry.name) || IGNORE_FILES.has(entry.name))
                continue;
            if (entry.name.startsWith('.') && entry.name !== '.env.example')
                continue;
            if (entry.isDirectory()) {
                const children = walk(path.join(dir, entry.name), depth + 1);
                result.push({ name: entry.name + '/', type: 'dir', children: children.length > 0 ? children : undefined });
            }
            else {
                result.push({ name: entry.name, type: 'file' });
            }
        }
        return result;
    }
    return walk(cwd, 0);
}
function treeToString(entries, prefix = '') {
    const lines = [];
    let count = 0;
    const MAX_ENTRIES = 40;
    function walk(entries, prefix) {
        for (let i = 0; i < entries.length; i++) {
            if (count >= MAX_ENTRIES) {
                lines.push(prefix + `... and more files`);
                return;
            }
            const entry = entries[i];
            const isLast = i === entries.length - 1;
            const connector = isLast ? '└── ' : '├── ';
            lines.push(prefix + connector + entry.name);
            count++;
            if (entry.children) {
                const childPrefix = prefix + (isLast ? '    ' : '│   ');
                walk(entry.children, childPrefix);
            }
        }
    }
    walk(entries, prefix);
    return lines.join('\n');
}
function detectConventions(cwd) {
    const conventions = [];
    // Collect filenames from src/ or top-level
    const srcDir = fs.existsSync(path.join(cwd, 'src')) ? path.join(cwd, 'src') : cwd;
    const files = collectFiles(srcDir, 3);
    const basenames = files.map(f => path.basename(f, path.extname(f)));
    // Naming pattern detection
    const counts = { kebab: 0, camel: 0, pascal: 0, snake: 0 };
    for (const name of basenames) {
        if (/^[a-z]+(-[a-z]+)+$/.test(name))
            counts.kebab++;
        else if (/^[a-z]+[A-Z]/.test(name))
            counts.camel++;
        else if (/^[A-Z][a-z]+[A-Z]/.test(name))
            counts.pascal++;
        else if (/^[a-z]+(_[a-z]+)+$/.test(name))
            counts.snake++;
    }
    const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (dominant && dominant[1] > 0) {
        conventions.push({ category: 'Naming', pattern: `${dominant[0]}-case (${dominant[1]} files)` });
    }
    // Directory structure pattern
    const topDirs = getSubdirs(srcDir);
    const featureDirs = ['features', 'modules', 'domains', 'pages', 'routes'];
    const layerDirs = ['components', 'services', 'utils', 'hooks', 'helpers', 'lib', 'api', 'models'];
    const hasFeature = topDirs.some(d => featureDirs.includes(d));
    const hasLayers = topDirs.filter(d => layerDirs.includes(d)).length >= 2;
    if (hasFeature) {
        conventions.push({ category: 'Structure', pattern: 'Feature-based organization' });
    }
    else if (hasLayers) {
        conventions.push({ category: 'Structure', pattern: 'Layer-based organization' });
    }
    // Component patterns (React/Vue)
    const hasBarrelExports = fs.existsSync(path.join(srcDir, 'components', 'index.ts')) ||
        fs.existsSync(path.join(srcDir, 'components', 'index.tsx'));
    if (hasBarrelExports) {
        conventions.push({ category: 'Components', pattern: 'Barrel exports (index.ts)' });
    }
    const hasColocatedStyles = files.some(f => f.endsWith('.module.css') || f.endsWith('.module.scss'));
    if (hasColocatedStyles) {
        conventions.push({ category: 'Styles', pattern: 'Colocated CSS modules' });
    }
    const hasColocatedTests = files.some(f => f.includes('__tests__') || f.includes('.test.') || f.includes('.spec.'));
    if (hasColocatedTests) {
        conventions.push({ category: 'Tests', pattern: 'Colocated test files' });
    }
    // State management
    if (files.some(f => f.includes('store') && (f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js')))) {
        conventions.push({ category: 'State', pattern: 'Store-based state management' });
    }
    return conventions;
}
function findTodos(cwd, maxResults = 10) {
    const todos = [];
    const srcDir = fs.existsSync(path.join(cwd, 'src')) ? path.join(cwd, 'src') : cwd;
    const files = collectFiles(srcDir, 4);
    const codeExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.py', '.rs', '.go', '.java', '.rb', '.vue', '.svelte']);
    for (const file of files) {
        if (todos.length >= maxResults)
            break;
        const ext = path.extname(file);
        if (!codeExtensions.has(ext))
            continue;
        try {
            const content = fs.readFileSync(file, 'utf-8');
            const lines = content.split('\n');
            for (let i = 0; i < lines.length; i++) {
                if (todos.length >= maxResults)
                    break;
                const line = lines[i];
                const match = line.match(/(?:\/\/|\/\*|#|--|%)\s*\b(TODO|FIXME|HACK)\b[:\s]*(.*)/);
                if (match) {
                    todos.push({
                        file: path.relative(cwd, file),
                        line: i + 1,
                        type: match[1],
                        text: match[2].trim().slice(0, 100),
                    });
                }
            }
        }
        catch { }
    }
    return todos;
}
function findEnvVars(cwd) {
    const envFiles = ['.env.example', '.env.local.example', '.env.sample', '.env.template'];
    for (const file of envFiles) {
        const fullPath = path.join(cwd, file);
        if (fs.existsSync(fullPath)) {
            try {
                const content = fs.readFileSync(fullPath, 'utf-8');
                return content
                    .split('\n')
                    .filter(l => l.trim() && !l.startsWith('#'))
                    .map(l => l.split('=')[0].trim())
                    .filter(Boolean)
                    .slice(0, 20);
            }
            catch { }
        }
    }
    return [];
}
function detectEntryPoints(cwd) {
    const entryPoints = [];
    const candidates = [
        'src/index.ts', 'src/index.tsx', 'src/index.js', 'src/index.jsx',
        'src/main.ts', 'src/main.tsx', 'src/main.js',
        'src/app.ts', 'src/app.js',
        'src/App.tsx', 'src/App.jsx', 'src/App.vue', 'src/App.svelte',
        'pages/index.tsx', 'pages/index.jsx',
        'app/layout.tsx', 'app/page.tsx',
        'src/routes/+layout.svelte', 'src/routes/+page.svelte',
        'main.py', 'app.py', 'manage.py',
        'main.go', 'cmd/main.go',
        'src/main.rs', 'src/lib.rs',
    ];
    for (const candidate of candidates) {
        if (fs.existsSync(path.join(cwd, candidate))) {
            entryPoints.push(candidate);
        }
    }
    return entryPoints;
}
function analyzeStructure(cwd) {
    return {
        tree: buildTree(cwd),
        entryPoints: detectEntryPoints(cwd),
        conventions: detectConventions(cwd),
        todos: findTodos(cwd),
        envVars: findEnvVars(cwd),
    };
}
// Helpers
function collectFiles(dir, maxDepth, depth = 0) {
    if (depth > maxDepth)
        return [];
    const files = [];
    let entries;
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
    }
    catch {
        return [];
    }
    for (const entry of entries) {
        if (IGNORE_DIRS.has(entry.name) || entry.name.startsWith('.'))
            continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...collectFiles(fullPath, maxDepth, depth + 1));
        }
        else {
            files.push(fullPath);
        }
    }
    return files;
}
function getSubdirs(dir) {
    try {
        return fs.readdirSync(dir, { withFileTypes: true })
            .filter(e => e.isDirectory() && !e.name.startsWith('.') && !IGNORE_DIRS.has(e.name))
            .map(e => e.name);
    }
    catch {
        return [];
    }
}
//# sourceMappingURL=structure.js.map