# handoff — Cross-Model Project Continuity Engine

## Tek Cümle

Git repo'nu analiz edip herhangi bir AI modeline yapıştırılabilir tek bir HANDOFF.md çıkaran, IDE-agnostic ve model-agnostic CLI tool.

---

## Problem

AI-assisted development'ta modeller arası geçiş kaçınılmaz:

- Cursor'da Opus limiti doldu → Gemini'ye geçtin
- Claude Code session'ı compaction yaptı → context kayboldu
- Bugün Sonnet'le başladın → yarın Codex'le devam edeceksin
- Takım arkadaşın GPT kullanıyor → sen Claude kullanıyorsun, aynı repo

Her geçişte model sıfırdan başlıyor. Projenin mimarisini, convention'larını, son yapılanları, kırık şeyleri, sıradaki adımı bilmiyor. Developer ya 10 dakika context açıklıyor ya da model yanlış pattern'lerle devam ediyor.

Mevcut çözümler ya overengineered (Continuous-Claude: 32 agent, Docker, PostgreSQL), ya ekosisteme kilitli (Amp /handoff: sadece Amp'de), ya da statik ve manuel (CLAUDE.md: güncellenmez).

## Çözüm

```bash
npx handoff
```

Tek komut. Repo'yu analiz eder. `HANDOFF.md` dosyası çıkarır. Bu dosyayı herhangi bir modele yapıştırırsın — Claude, GPT, Gemini, Codex, Qwen, local model — hepsi aynı context'le çalışır.

---

## Tasarım İlkeleri

1. **Zero config** — install yok, setup yok, `npx handoff` çalışır
2. **Zero dependency** — Docker yok, database yok, API key yok, sadece Node.js + git
3. **Model agnostic** — çıktı düz markdown, herhangi bir LLM okur
4. **IDE agnostic** — terminal'den çalışır, Cursor/Windsurf/VS Code/Antigravity/Claude Code fark etmez
5. **Additive, not invasive** — projeye hiçbir şey inject etmez, sadece HANDOFF.md yazar
6. **Token-efficient** — çıktı 2000-4000 token arası, hiçbir model'in context'ini taşırmaz

---

## Mimari

```
┌─────────────────────────────────────────────┐
│                 npx handoff                  │
├─────────────────────────────────────────────┤
│                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │   Git    │  │  Static  │  │  Config  │  │
│  │ Analyzer │  │ Analyzer │  │  Reader  │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  │
│       │              │              │        │
│       ▼              ▼              ▼        │
│  ┌──────────────────────────────────────┐   │
│  │          Context Assembler           │   │
│  └──────────────────┬───────────────────┘   │
│                     │                        │
│                     ▼                        │
│  ┌──────────────────────────────────────┐   │
│  │         Markdown Renderer            │   │
│  └──────────────────┬───────────────────┘   │
│                     │                        │
│                     ▼                        │
│              HANDOFF.md                      │
└─────────────────────────────────────────────┘
```

### Layer 1: Git Analyzer

Git log, diff, branch, status'tan project state çıkarır.

```
Input:  .git/
Output: {
  currentBranch: string
  recentCommits: Commit[]        // son 20 commit (hash, message, files, date)
  uncommittedChanges: string[]   // staged + unstaged files
  activeBranches: Branch[]       // son 7 gündeki branch'lar
  lastMerge: Commit | null
  conflictFiles: string[]
}
```

Komutlar:
- `git log --oneline -20 --format="%h|%s|%an|%ai"`
- `git diff --name-status HEAD~5`
- `git status --porcelain`
- `git branch --sort=-committerdate --format="%(refname:short)|%(committerdate:relative)"`

### Layer 2: Static Analyzer

Dosya yapısı ve kod pattern'lerini analiz eder. AST parsing YAPMAZ — dosya isimleri, import'lar ve config dosyalarından çıkarım yapar. Hızlı ve lightweight.

```
Input:  File system
Output: {
  stack: StackInfo           // framework, language, package manager
  structure: DirectoryTree   // 2 level deep, filtered
  entryPoints: string[]      // main files, route files
  conventions: Convention[]  // naming patterns, file organization
  envVars: string[]          // .env.example'dan key isimleri (değerler DEĞİL)
  openTodos: Todo[]          // TODO/FIXME/HACK comments
}
```

Stack detection:
- `package.json` → dependencies'den framework çıkar (next, react, vue, express, etc.)
- `Cargo.toml` → Rust
- `go.mod` → Go
- `pyproject.toml` / `requirements.txt` → Python
- `tsconfig.json` → TypeScript

Convention detection:
- Dosya isimlendirme: kebab-case / camelCase / PascalCase
- Klasör yapısı: feature-based / layer-based
- State management: Redux / Zustand / Context / Pinia
- API pattern: REST routes / tRPC / GraphQL
- ORM: Prisma / Drizzle / Sequelize / SQLAlchemy

### Layer 3: Config Reader

Mevcut AI config dosyalarını okur ve HANDOFF'a dahil eder.

```
Input:  CLAUDE.md, AGENTS.md, .cursorrules, .windsurfrules, copilot-instructions.md
Output: {
  existingInstructions: string[]  // mevcut kurallar ve convention'lar
  configSource: string            // hangi dosyadan okundu
}
```

### Context Assembler

3 layer'ın output'unu birleştirip token-efficient bir yapıya sıkıştırır.

Kurallar:
- Toplam output 2000-4000 token arası olmalı
- Bilgi öncelik sırasına göre kesilir: critical → important → nice-to-have
- Tekrar eden bilgi deduplicate edilir
- Dosya listelerinde max 30 entry (gerisi "... and N more files")

### Markdown Renderer

Standart HANDOFF.md formatını üretir.

---

## HANDOFF.md Format Spec

```markdown
# HANDOFF — {project-name}
> Generated by `handoff` at {timestamp}
> Branch: {branch} | Last commit: {hash} {message}

## Stack
{framework} + {language} | {package-manager}
ORM: {orm} | DB: {database} | Auth: {auth} | Deploy: {platform}

## Structure
{filtered directory tree, 2 levels}

## Conventions
- Naming: {pattern}
- Components: {pattern}
- API: {pattern}
- State: {pattern}
{existing AI config rules if found}

## Recent Activity
{last 5-10 commits, grouped by feature/area}

## Current State
- Working on: {analysis of recent commits + uncommitted changes}
- Modified files: {uncommitted changes}
- Open branches: {active branches with context}

## Known Issues
{TODO/FIXME/HACK comments with file locations}

## Environment
Required env vars: {list from .env.example, NO values}
```

---

## CLI Interface

```bash
# Temel kullanım — HANDOFF.md oluşturur
npx handoff

# Belirli bir dizinde çalıştır
npx handoff /path/to/repo

# Çıktıyı clipboard'a kopyala (model'e yapıştırmak için)
npx handoff --copy

# Çıktıyı stdout'a yaz (pipe için)
npx handoff --stdout

# Watch mode — her commit'te otomatik güncelle
npx handoff --watch

# Verbose — ne analiz ettiğini göster
npx handoff --verbose

# Belirli bir format
npx handoff --format compact   # ~1500 token, sadece essentials
npx handoff --format standard  # ~3000 token, default
npx handoff --format full      # ~5000 token, her şey dahil

# Git hook olarak kurulum
npx handoff --install-hook     # post-commit hook ekler
```

---

## Monetization

### Tier 1: Free (Open Source - MIT)

- `npx handoff` — temel analiz
- Git + static analysis
- HANDOFF.md generation
- Clipboard copy
- Sınırsız kullanım

Neden free: Adoption. npm weekly downloads = social proof = organic growth.

### Tier 2: Pro ($9/ay)

- `npx handoff --pro`
- AI-powered intelligent summarization (son commit'leri anlam bazlı grupla)
- Watch mode (her commit'te auto-update)
- Git hook integration
- Custom format templates
- Priority support

Teknik: Pro features local'de çalışır ama license key check eder. AI summarization için kullanıcının kendi API key'ini kullanır (OpenAI/Anthropic/Google) veya bizim hosted endpoint'imizi.

### Tier 3: Team ($29/ay per team)

- Shared HANDOFF.md across team members
- Onboarding mode: yeni developer'a proje özeti
- CI/CD integration (GitHub Action)
- Slack/Discord notification: "HANDOFF updated for branch feature/auth"
- Analytics: hangi modeller kullanılıyor, session süresi, handoff frequency

### Revenue Projeksiyonu (Konservatif)

```
Ay 1-3:  Open source launch, 0 gelir, adoption odaklı
         Hedef: 500 weekly npm downloads, 200 GitHub stars

Ay 4-6:  Pro tier launch
         500 download'dan %2 conversion = 10 Pro user
         10 × $9 = $90/ay

Ay 6-12: Growth
         5000 weekly downloads, %2 conversion = 100 Pro
         100 × $9 = $900/ay
         + 5 Team = 5 × $29 = $145/ay
         Toplam: ~$1000/ay

Ay 12+:  Scale
         20K weekly downloads olursa:
         400 Pro × $9 = $3600
         20 Team × $29 = $580
         Toplam: ~$4200/ay
```

---

## Geliştirme Planı

### Phase 1: MVP (1 hafta)

Sadece şunları yap:

```
src/
├── index.ts          # CLI entry point (commander.js)
├── analyzers/
│   ├── git.ts        # git log, diff, status, branch
│   ├── stack.ts      # package.json, tsconfig, etc.
│   └── structure.ts  # directory tree, conventions
├── assembler.ts      # combine + prioritize + truncate
├── renderer.ts       # markdown output
└── utils/
    ├── exec.ts       # child_process wrapper
    └── clipboard.ts  # pbcopy/xclip/clip.exe
```

Dependencies (minimal):
- `commander` — CLI argument parsing
- `clipboardy` — cross-platform clipboard
- Başka hiçbir şey. fs, path, child_process hep Node.js built-in.

Testler:
- 3-5 farklı repo tipiyle test (Next.js, Python, Rust, monorepo, empty repo)
- Output token count check (2000-4000 arası)
- Snapshot tests for HANDOFF.md format

### Phase 2: Polish + Launch (1 hafta)

- README.md (GIF demo dahil)
- npm publish
- GitHub repo setup
- Product Hunt launch hazırlığı
- r/programming, r/webdev, HackerNews post
- Twitter/X thread: "I built a tool that solves AI context loss"
- Türkçe YouTube video: "AI ile kod yazarken model değiştirince neden proje bozuluyor"

### Phase 3: Pro Features (2-3 hafta)

- License key system (Lemon Squeezy — zaten entegrasyonun var)
- AI-powered summarization
- Watch mode
- Git hook installer

### Phase 4: Team + Growth

- GitHub Action
- Team license management
- Analytics dashboard
- Slack integration

---

## Rekabet Avantajı

| Özellik | handoff | Continuous-Claude | PAL MCP | Amp /handoff | CLAUDE.md |
|---------|---------|-------------------|---------|-------------|-----------|
| Zero config | ✅ | ❌ Docker+PG | ❌ MCP setup | ❌ Amp only | ✅ |
| Model agnostic | ✅ | ❌ Claude only | ❌ Claude primary | ❌ Amp only | ❌ Claude only |
| IDE agnostic | ✅ | ❌ Claude Code | ❌ Claude Code | ❌ Amp | Kısmen |
| Auto-updates | ✅ watch/hook | ✅ hooks | ❌ | ✅ | ❌ manual |
| Token efficient | ✅ 2-4K | ❌ heavy | ❌ | ✅ | Değişir |
| Free tier | ✅ full CLI | ✅ open source | ✅ open source | ❌ paid | ✅ |
| Install effort | `npx` | 30+ min | 10+ min | N/A | Manual |

Tek gerçek moat: **simplicity**. Hiç kimse `npx handoff` kadar basit bir şey yapmıyor.

---

## Teknik Detaylar

### Stack Detection Logic

```typescript
interface StackInfo {
  framework: string;      // next, react, vue, express, django, rails, etc.
  language: string;       // typescript, javascript, python, rust, go
  packageManager: string; // npm, yarn, pnpm, bun, pip, cargo
  orm?: string;           // prisma, drizzle, sequelize, sqlalchemy
  database?: string;      // postgresql, mysql, sqlite, mongodb
  auth?: string;          // clerk, nextauth, supabase-auth, passport
  deploy?: string;        // vercel, netlify, fly, railway, aws
  testing?: string;       // jest, vitest, pytest, cargo-test
  linter?: string;        // eslint, biome, ruff, clippy
}
```

Detection kaynakları:
- `package.json` → dependencies + devDependencies
- `vercel.json` / `netlify.toml` / `fly.toml` / `railway.json` → deploy platform
- `prisma/schema.prisma` → ORM + DB
- `drizzle.config.ts` → ORM + DB
- `.env.example` / `.env.local.example` → service entegrations

### Convention Detection Logic

```typescript
// Dosya isimlerinden pattern çıkarımı
const files = getAllFiles('src/', { maxDepth: 3 });

// Naming pattern
const patterns = {
  kebab: files.filter(f => /^[a-z]+(-[a-z]+)*\.\w+$/.test(basename(f))).length,
  camel: files.filter(f => /^[a-z]+[A-Z]/.test(basename(f))).length,
  pascal: files.filter(f => /^[A-Z][a-z]+[A-Z]/.test(basename(f))).length,
};
const dominantNaming = Object.entries(patterns).sort((a,b) => b[1]-a[1])[0][0];

// Component pattern (React projeler için)
const hasBarrelExports = existsSync('src/components/index.ts');
const usesColocatedStyles = files.some(f => f.endsWith('.module.css'));
const usesColocatedTests = files.some(f => f.includes('__tests__'));
```

### Token Budgeting

```
HANDOFF.md toplam: ~3000 token

Bölüm                    Token Bütçesi
─────────────────────────────────────
Header + Stack            ~200
Structure (dir tree)      ~400
Conventions               ~300
Recent Activity           ~800
Current State             ~500
Known Issues              ~300
Environment               ~200
AI Config (if exists)     ~300
─────────────────────────────────────
```

Her bölüm kendi bütçesini aşarsa truncate olur. Öncelik sırası:
1. Current State (en kritik — model bunu bilmezse yanlış yere dokunur)
2. Stack + Conventions (mimari kararlar)
3. Recent Activity (ne yapıldığını bilmek)
4. Structure (navigasyon)
5. Known Issues (nice to have)
6. Environment (gerektiğinde bakılır)

---

## Marketing Stratejisi

### Launch Day (Product Hunt + HN + Reddit)

Headline: **"npx handoff — Stop re-explaining your project to every AI model"**

One-liner: "One command generates a HANDOFF.md that any AI model can read. Switch from Claude to GPT to Gemini without losing context."

### Content Marketing

1. **"The $2.4B Context Problem"** — Blog post: her yıl AI-assisted dev'de kaybedilen zaman maliyeti hesaplaması
2. **Twitter/X thread**: "I tracked how much time I waste re-explaining my project to AI. The answer made me build a tool."
3. **YouTube (TR)**: "Cursor'da model değiştirince proje niye bozuluyor — ve çözümü"
4. **YouTube (EN)**: "I built the tool Anthropic refused to build" (clickbait ama issue #11455 gerçek)

### SEO Keywords

- "AI coding context loss"
- "switch AI models keep context"
- "CLAUDE.md generator"
- "AGENTS.md auto generate"
- "cursor context lost"
- "claude code compaction fix"

### Community Seeding

- Anthropic Claude Code issue #11455'e comment bırak: "Built an open-source solution for this"
- r/ClaudeAI, r/cursor, r/ChatGPTCoding, r/LocalLLaMA
- Cursor/Windsurf Discord server'ları
- Dev.to, Hashnode, Medium crosspost

---

## Risk Analizi

| Risk | İhtimal | Etki | Mitigation |
|------|---------|------|------------|
| Anthropic/Cursor native çözüm çıkarır | Orta | Yüksek | Önce ol, community kur, model-agnostic kal |
| Adoption olmaz | Orta | Yüksek | Gerçekten useful olmalı, dogfood yap, geri bildirim al |
| Pro conversion düşük | Yüksek | Orta | Free tier'ı zengin tut, Pro'yu gerçekten değerli yap |
| Büyük bir rakip aynısını yapar | Düşük | Orta | First-mover + simplicity moat |

En büyük risk: Anthropic veya Cursor bunu native olarak çözer. Mitigation: model-agnostic olmak. Onlar kendi ekosistemini çözer, sen herkesinkini çözersin.

---

## İlk Hafta Eylem Planı

### Gün 1-2: Core CLI
- [ ] `npm init`, TypeScript setup, commander.js
- [ ] Git analyzer: log, diff, status, branch parsing
- [ ] Stack detector: package.json, config dosyaları
- [ ] Directory tree generator (filtered, 2 level)

### Gün 3-4: Assembly + Output
- [ ] Convention detector
- [ ] Config reader (CLAUDE.md, AGENTS.md, .cursorrules)
- [ ] Context assembler + token budgeting
- [ ] Markdown renderer
- [ ] Clipboard support

### Gün 5: Testing + Polish
- [ ] 5 farklı repo tipiyle test
- [ ] Edge cases: empty repo, monorepo, non-git directory
- [ ] README.md + demo GIF
- [ ] npm publish: `npx handoff`

### Gün 6-7: Launch
- [ ] Product Hunt submission
- [ ] HackerNews post
- [ ] Reddit posts (3-4 subreddit)
- [ ] Twitter thread
- [ ] Claude Code issue #11455'e comment
