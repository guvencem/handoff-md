import { execSync } from 'child_process';

export function exec(command: string, cwd?: string): string {
  try {
    return execSync(command, {
      cwd: cwd || process.cwd(),
      encoding: 'utf-8',
      timeout: 15000,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return '';
  }
}

export function isGitRepo(cwd?: string): boolean {
  const result = exec('git rev-parse --is-inside-work-tree', cwd);
  return result === 'true';
}
