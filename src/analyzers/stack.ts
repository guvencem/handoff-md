import * as fs from 'fs';
import * as path from 'path';

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

function fileExists(cwd: string, ...paths: string[]): boolean {
  return fs.existsSync(path.join(cwd, ...paths));
}

function readJSON(cwd: string, file: string): any {
  try {
    return JSON.parse(fs.readFileSync(path.join(cwd, file), 'utf-8'));
  } catch {
    return null;
  }
}

function hasDep(pkg: any, name: string): boolean {
  if (!pkg) return false;
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  return !!deps[name];
}

function hasAnyDep(pkg: any, names: string[]): string | undefined {
  return names.find(n => hasDep(pkg, n));
}

export function analyzeStack(cwd: string): StackInfo {
  const info: StackInfo = {
    framework: 'unknown',
    language: 'unknown',
    packageManager: 'unknown',
  };

  const pkg = readJSON(cwd, 'package.json');

  // Language detection
  if (fileExists(cwd, 'tsconfig.json') || fileExists(cwd, 'tsconfig.base.json')) {
    info.language = 'TypeScript';
  } else if (fileExists(cwd, 'Cargo.toml')) {
    info.language = 'Rust';
  } else if (fileExists(cwd, 'go.mod')) {
    info.language = 'Go';
  } else if (fileExists(cwd, 'pyproject.toml') || fileExists(cwd, 'requirements.txt') || fileExists(cwd, 'setup.py')) {
    info.language = 'Python';
  } else if (fileExists(cwd, 'Gemfile')) {
    info.language = 'Ruby';
  } else if (pkg) {
    info.language = 'JavaScript';
  }

  // Package manager
  if (fileExists(cwd, 'bun.lockb') || fileExists(cwd, 'bun.lock')) {
    info.packageManager = 'bun';
  } else if (fileExists(cwd, 'pnpm-lock.yaml')) {
    info.packageManager = 'pnpm';
  } else if (fileExists(cwd, 'yarn.lock')) {
    info.packageManager = 'yarn';
  } else if (fileExists(cwd, 'package-lock.json')) {
    info.packageManager = 'npm';
  } else if (fileExists(cwd, 'Cargo.lock')) {
    info.packageManager = 'cargo';
  } else if (fileExists(cwd, 'go.sum')) {
    info.packageManager = 'go modules';
  } else if (fileExists(cwd, 'poetry.lock')) {
    info.packageManager = 'poetry';
  } else if (fileExists(cwd, 'Pipfile.lock')) {
    info.packageManager = 'pipenv';
  } else if (fileExists(cwd, 'requirements.txt')) {
    info.packageManager = 'pip';
  }

  // Framework detection (JS/TS ecosystem)
  if (pkg) {
    if (hasDep(pkg, 'next')) info.framework = 'Next.js';
    else if (hasDep(pkg, 'nuxt')) info.framework = 'Nuxt';
    else if (hasDep(pkg, '@remix-run/node') || hasDep(pkg, '@remix-run/react')) info.framework = 'Remix';
    else if (hasDep(pkg, '@sveltejs/kit')) info.framework = 'SvelteKit';
    else if (hasDep(pkg, 'svelte')) info.framework = 'Svelte';
    else if (hasDep(pkg, 'vue')) info.framework = 'Vue';
    else if (hasDep(pkg, '@angular/core')) info.framework = 'Angular';
    else if (hasDep(pkg, 'react')) info.framework = 'React';
    else if (hasDep(pkg, 'express')) info.framework = 'Express';
    else if (hasDep(pkg, 'fastify')) info.framework = 'Fastify';
    else if (hasDep(pkg, 'hono')) info.framework = 'Hono';
    else if (hasDep(pkg, 'elysia')) info.framework = 'Elysia';
    else if (hasDep(pkg, 'astro')) info.framework = 'Astro';
    else if (hasDep(pkg, 'gatsby')) info.framework = 'Gatsby';
    else if (hasDep(pkg, 'electron')) info.framework = 'Electron';
    else if (hasDep(pkg, 'react-native')) info.framework = 'React Native';
    else if (hasDep(pkg, 'expo')) info.framework = 'Expo';
  }

  // Python frameworks
  if (info.language === 'Python') {
    try {
      const pyproject = fs.readFileSync(path.join(cwd, 'pyproject.toml'), 'utf-8');
      if (pyproject.includes('django')) info.framework = 'Django';
      else if (pyproject.includes('fastapi')) info.framework = 'FastAPI';
      else if (pyproject.includes('flask')) info.framework = 'Flask';
    } catch {}
    try {
      const reqs = fs.readFileSync(path.join(cwd, 'requirements.txt'), 'utf-8');
      if (reqs.includes('django') || reqs.includes('Django')) info.framework = 'Django';
      else if (reqs.includes('fastapi')) info.framework = 'FastAPI';
      else if (reqs.includes('flask') || reqs.includes('Flask')) info.framework = 'Flask';
    } catch {}
  }

  // Rust frameworks
  if (info.language === 'Rust') {
    try {
      const cargo = fs.readFileSync(path.join(cwd, 'Cargo.toml'), 'utf-8');
      if (cargo.includes('actix-web')) info.framework = 'Actix Web';
      else if (cargo.includes('axum')) info.framework = 'Axum';
      else if (cargo.includes('tauri')) info.framework = 'Tauri';
      else if (cargo.includes('rocket')) info.framework = 'Rocket';
    } catch {}
  }

  // Go frameworks
  if (info.language === 'Go') {
    try {
      const gomod = fs.readFileSync(path.join(cwd, 'go.mod'), 'utf-8');
      if (gomod.includes('gin-gonic')) info.framework = 'Gin';
      else if (gomod.includes('gofiber')) info.framework = 'Fiber';
      else if (gomod.includes('echo')) info.framework = 'Echo';
    } catch {}
  }

  // ORM detection
  if (fileExists(cwd, 'prisma', 'schema.prisma') || hasDep(pkg, 'prisma')) {
    info.orm = 'Prisma';
    // Try to detect DB from prisma schema
    try {
      const schema = fs.readFileSync(path.join(cwd, 'prisma', 'schema.prisma'), 'utf-8');
      if (schema.includes('postgresql')) info.database = 'PostgreSQL';
      else if (schema.includes('mysql')) info.database = 'MySQL';
      else if (schema.includes('sqlite')) info.database = 'SQLite';
      else if (schema.includes('mongodb')) info.database = 'MongoDB';
    } catch {}
  } else if (hasDep(pkg, 'drizzle-orm')) {
    info.orm = 'Drizzle';
  } else if (hasDep(pkg, 'sequelize')) {
    info.orm = 'Sequelize';
  } else if (hasDep(pkg, 'typeorm')) {
    info.orm = 'TypeORM';
  } else if (hasDep(pkg, 'mongoose')) {
    info.orm = 'Mongoose';
    info.database = 'MongoDB';
  } else if (hasDep(pkg, 'knex')) {
    info.orm = 'Knex';
  }

  // Database detection (if not already set)
  if (!info.database) {
    if (hasDep(pkg, 'pg') || hasDep(pkg, 'postgres')) info.database = 'PostgreSQL';
    else if (hasDep(pkg, 'mysql2') || hasDep(pkg, 'mysql')) info.database = 'MySQL';
    else if (hasDep(pkg, 'better-sqlite3') || hasDep(pkg, 'sqlite3')) info.database = 'SQLite';
    else if (hasDep(pkg, 'redis') || hasDep(pkg, 'ioredis')) info.database = 'Redis';
    else if (fileExists(cwd, 'supabase')) info.database = 'Supabase (PostgreSQL)';
  }

  // Auth detection
  const authDep = hasAnyDep(pkg, ['next-auth', '@auth/core', '@clerk/nextjs', '@clerk/clerk-sdk-node', '@supabase/auth-helpers-nextjs', 'passport', 'lucia']);
  if (authDep) {
    const authMap: Record<string, string> = {
      'next-auth': 'NextAuth',
      '@auth/core': 'Auth.js',
      '@clerk/nextjs': 'Clerk',
      '@clerk/clerk-sdk-node': 'Clerk',
      '@supabase/auth-helpers-nextjs': 'Supabase Auth',
      'passport': 'Passport.js',
      'lucia': 'Lucia',
    };
    info.auth = authMap[authDep] || authDep;
  }

  // Deploy detection
  if (fileExists(cwd, 'vercel.json') || fileExists(cwd, '.vercel')) info.deploy = 'Vercel';
  else if (fileExists(cwd, 'netlify.toml')) info.deploy = 'Netlify';
  else if (fileExists(cwd, 'fly.toml')) info.deploy = 'Fly.io';
  else if (fileExists(cwd, 'railway.json') || fileExists(cwd, 'railway.toml')) info.deploy = 'Railway';
  else if (fileExists(cwd, 'Dockerfile') || fileExists(cwd, 'docker-compose.yml') || fileExists(cwd, 'docker-compose.yaml')) info.deploy = 'Docker';
  else if (fileExists(cwd, 'serverless.yml')) info.deploy = 'Serverless';
  else if (fileExists(cwd, 'amplify.yml')) info.deploy = 'AWS Amplify';

  // Testing detection
  const testDep = hasAnyDep(pkg, ['vitest', 'jest', '@jest/core', 'mocha', 'playwright', '@playwright/test', 'cypress']);
  if (testDep) {
    const testMap: Record<string, string> = {
      'vitest': 'Vitest',
      'jest': 'Jest',
      '@jest/core': 'Jest',
      'mocha': 'Mocha',
      'playwright': 'Playwright',
      '@playwright/test': 'Playwright',
      'cypress': 'Cypress',
    };
    info.testing = testMap[testDep] || testDep;
  }

  // Linter detection
  const lintDep = hasAnyDep(pkg, ['eslint', '@biomejs/biome', 'biome', 'prettier']);
  if (lintDep) {
    const lintMap: Record<string, string> = {
      'eslint': 'ESLint',
      '@biomejs/biome': 'Biome',
      'biome': 'Biome',
      'prettier': 'Prettier',
    };
    info.linter = lintMap[lintDep] || lintDep;
  }

  return info;
}
