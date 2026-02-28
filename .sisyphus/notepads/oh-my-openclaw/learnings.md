# Learnings

## [2026-03-01] Project Initialization

### Tech Stack
- TypeScript + Bun + commander.js + json5 + picocolors
- TDD approach: RED → GREEN → REFACTOR
- Single compiled binary via `bun build --compile --bytecode`

### Critical OpenClaw Constraints
- OpenClaw uses Zod `.strict()` validation → unknown config keys BREAK OpenClaw instantly
- Config path resolution order: `OPENCLAW_CONFIG_PATH` → `OPENCLAW_STATE_DIR/openclaw.json` → `~/.openclaw/openclaw.json`
- Workspace path: `agents.defaults.workspace` in config (default `~/.openclaw/workspace`)
- No hot config reload: user must run `openclaw gateway restart` after apply
- OpenClaw already has backup rotation (max 5 `.bak` files) → our backups MUST be in `~/.openclaw/oh-my-openclaw/backups/`

### Sensitive Fields Blocklist
- Top-level: `auth`, `env`, `meta`
- Dot-path: `gateway.auth`, `hooks.token`
- Glob: `models.providers.*.apiKey`, `channels.*.botToken`, `channels.*.token`

### Workspace Files (standard 7)
- AGENTS.md, SOUL.md, IDENTITY.md, USER.md, TOOLS.md, HEARTBEAT.md, BOOTSTRAP.md

### Deep Merge Semantics
- Scalar: override wins
- Object: recursive merge
- Array: override replaces entire array
- `null` in override: deletes key from base
- `undefined` in override: skips (base value preserved)
- Never mutates inputs

## [2026-03-01] Task 1 Scaffolding Notes

### Tooling Baseline
- `tsconfig.json` uses ESM + `moduleResolution: bundler` + strict mode for Bun-first TypeScript workflow.
- `package.json` scripts are aligned to two build paths: ESM bundle and compiled bytecode binary.

### Test + Verification Pattern
- Keep a minimal Bun test in `src/__tests__/placeholder.test.ts` to guarantee green CI baseline from day one.
- Save repeatable smoke-test evidence under `.sisyphus/evidence/` to preserve bootstrapping traceability.
