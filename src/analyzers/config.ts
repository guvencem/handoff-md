import * as fs from 'fs';
import * as path from 'path';

export interface ConfigData {
  existingInstructions: string[];
  configSource: string;
}

const CONFIG_FILES = [
  { file: 'CLAUDE.md', name: 'CLAUDE.md' },
  { file: 'AGENTS.md', name: 'AGENTS.md' },
  { file: '.cursorrules', name: '.cursorrules' },
  { file: '.windsurfrules', name: '.windsurfrules' },
  { file: '.github/copilot-instructions.md', name: 'copilot-instructions.md' },
  { file: '.clinerules', name: '.clinerules' },
  { file: '.aider.conf.yml', name: '.aider.conf.yml' },
];

export function readConfigs(cwd: string): ConfigData | null {
  for (const { file, name } of CONFIG_FILES) {
    const fullPath = path.join(cwd, file);
    if (fs.existsSync(fullPath)) {
      try {
        const content = fs.readFileSync(fullPath, 'utf-8').trim();
        if (!content) continue;

        // Extract key rules/instructions (keep it concise)
        const lines = content.split('\n')
          .filter(l => l.trim())
          .filter(l => !l.startsWith('#') || l.startsWith('## ')) // Keep headings but not title
          .slice(0, 30); // Max 30 lines

        return {
          existingInstructions: lines,
          configSource: name,
        };
      } catch {}
    }
  }

  return null;
}
