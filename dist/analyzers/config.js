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
exports.readConfigs = readConfigs;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const CONFIG_FILES = [
    { file: 'CLAUDE.md', name: 'CLAUDE.md' },
    { file: 'AGENTS.md', name: 'AGENTS.md' },
    { file: '.cursorrules', name: '.cursorrules' },
    { file: '.windsurfrules', name: '.windsurfrules' },
    { file: '.github/copilot-instructions.md', name: 'copilot-instructions.md' },
    { file: '.clinerules', name: '.clinerules' },
    { file: '.aider.conf.yml', name: '.aider.conf.yml' },
];
function readConfigs(cwd) {
    for (const { file, name } of CONFIG_FILES) {
        const fullPath = path.join(cwd, file);
        if (fs.existsSync(fullPath)) {
            try {
                const content = fs.readFileSync(fullPath, 'utf-8').trim();
                if (!content)
                    continue;
                // Extract key rules/instructions (keep it concise)
                const lines = content.split('\n')
                    .filter(l => l.trim())
                    .filter(l => !l.startsWith('#') || l.startsWith('## ')) // Keep headings but not title
                    .slice(0, 30); // Max 30 lines
                return {
                    existingInstructions: lines,
                    configSource: name,
                };
            }
            catch { }
        }
    }
    return null;
}
//# sourceMappingURL=config.js.map