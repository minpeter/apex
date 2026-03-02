# PROJECT KNOWLEDGE BASE

**Generated:** 2026-03-01
**Commit:** de90b7a
**Branch:** main

## OVERVIEW

Bun + TypeScript CLI for applying/exporting OpenClaw preset bundles. Runtime entry is `src/cli.ts` via Bun launcher (`bin/apex.js`); compiled binary (`dist/apex`) is the distribution path.

## STRUCTURE

```
apex/
├── AGENTS.md                  # root policy + cross-module map
├── bin/apex.js                # Bun launcher; imports src/cli.ts directly
├── src/
│   ├── cli.ts                 # Commander wiring for list/apply/export/diff/install
│   ├── commands/              # user-facing command flows
│   │   ├── AGENTS.md          # command-layer invariants and change checklist
│   │   └── __tests__/         # command-level tests
│   ├── core/                  # shared logic (merge, backup, path, filtering, remote)
│   │   ├── AGENTS.md          # core invariants and module contracts
│   │   └── __tests__/         # unit tests for each core module
│   └── presets/
│       ├── index.ts           # built-in preset loading
│       └── apex/              # built-in preset payload (not project policy docs)
├── .github/workflows/         # code-quality CI
└── dist/                      # build artifacts (gitignored)
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add/modify CLI behavior | `src/cli.ts`, `src/commands/` | `install` is wired directly to `applyCommand('apex')` in `src/cli.ts` |
| Change apply flow | `src/commands/apply.ts` | Preset resolution, backup/clean, merge, workspace/skills copy |
| Change diff behavior | `src/commands/diff.ts` | Structural diff + workspace file add/replace reporting |
| Change export behavior | `src/commands/export.ts` | Sensitive-field filtering + preset manifest write |
| Change merge semantics | `src/core/merge.ts` | `null` deletes keys; arrays replace |
| Change remote preset handling | `src/core/remote.ts` | GitHub ref parse + cache clone (`owner--repo`) |
| Change config path resolution | `src/core/config-path.ts` | `OPENCLAW_CONFIG_PATH` > `OPENCLAW_STATE_DIR` > default |
| Change workspace file policy | `src/core/constants.ts`, `src/core/workspace.ts` | Controlled by `WORKSPACE_FILES` and resolved workspace path |
| Change preset loading/saving | `src/core/preset-loader.ts`, `src/presets/index.ts` | User presets override built-ins by name |

## CONVENTIONS

- Runtime/tooling: Bun-only execution (`bun test`, `bun build`, `bun build --compile`).
- Lint/format: Biome (`ultracite/biome/core`); single quotes enforced.
- Type checking: strict TS (`strict: true`, `moduleResolution: bundler`, `types: ["bun-types"]`).
- Imports: built-ins use `node:` prefix; relative internal imports (no path aliases).
- Config format: JSON5 for read/write snapshots (`readJson5`, `writeJson5`).
- Error handling: expected fs errors are handled explicitly (e.g., `ENOENT`), unknowns re-thrown.

## DEEP MERGE SEMANTICS (CRITICAL)

| Override Value | Behavior |
|---|---|
| Object | Recursive merge |
| Array | Full replacement (no append) |
| Scalar | Overwrite |
| `null` | Delete key |
| `undefined` | No-op (keep base value) |

Implementation source: `src/core/merge.ts`.

## PRESET RESOLUTION ORDER

0. GitHub ref (`owner/repo` or URL) -> clone/cache as user preset (`owner--repo`)
1. User preset: `~/.openclaw/apex/presets/<name>/`
2. Built-in preset: `src/presets/<name>/`
3. User preset with same name overrides built-in

## MODEL CONFIG COMPATIBILITY

OpenClaw currently validates config with strict schemas and rejects unsupported keys. The apex preset keeps compatible fields and uses `null` tombstones to remove legacy unsupported keys such as root `routing` and `agents.defaults.tools` when applying.

### Apex Defaults

| Path | Value | Notes |
|------|-------|-------|
| `agents.defaults.model.primary` | `anthropic/claude-opus-4-6` | Default agent model |
| `tools.message.crossContext.allowAcrossProviders` | `true` | Cross-provider messaging enabled |
| `tools.message.crossContext.marker.prefix` | `[from {channel}] ` | Cross-context marker prefix |
| `agents.defaults.tools` | `null` | Delete legacy unsupported key from existing config |
| `routing` | `null` | Delete legacy unsupported root key from existing config |

### Why This Matters

- Invalid keys cause gateway config reload skips.
- Keep preset fields aligned with the current OpenClaw schema before applying.
- If OpenClaw re-introduces routing schema support later, add it back only after schema verification.

## BRANCH PROTECTION (main)

The `main` branch is protected with the following rules:

- Direct push to main is forbidden. All changes must go through a Pull Request.
- CI (Release workflow) must pass before merge is allowed.
- Force push and branch deletion are blocked.
- `enforce_admins` is off — repo owner can bypass in emergencies via `--admin` flag.
- Auto-merge requires explicit enable in repo settings.

### Workflow for changes

1. Create a feature branch: `git checkout -b feat/my-change`
2. Make changes, commit, push to the branch
3. Open a PR against `main`
4. Wait for CI to pass (typecheck, lint, test, build)
5. Merge (squash preferred)
6. If the PR includes a changeset, the Release workflow will auto-create a "Version Packages" PR for the next version bump

### Changesets flow

- Add a changeset: `bunx changeset` (or manually create `.changeset/<name>.md`)
- On merge to main, the Release workflow detects changesets and creates a "Version Packages" PR
- Merging that PR triggers npm publish via OIDC (no NPM_TOKEN needed, Trusted Publisher configured)

## ANTI-PATTERNS

- Assuming JSON5 comments survive apply; they are dropped when config is rewritten.
- Treating `null` like a regular scalar in preset config; it is delete semantics.
- Expecting array append/merge behavior in preset config; arrays replace entirely.
- Using `--clean` + `--no-backup` casually; this can remove current config/workspace with no backup.

## TEST PATTERNS

- Runner: `bun test`.
- Layout: `src/core/__tests__`, `src/commands/__tests__`, plus `src/__tests__/integration.test.ts`.
- Naming: `*.test.ts` only.
- Isolation: temp dirs + env override/reset per test file.
- Output assertions: CLI tests monkey-patch `console.log` and restore in cleanup.

## COMMANDS

```bash
bun install
bun run check
bun run check:biome
bun run check:types
bun test
bun run build
bun run build:compile
bun run clean
```

## NOTES

- `src/presets/apex/AGENTS.md` is preset payload content, not repository policy guidance.
- `bin/apex.js` runs source (`src/cli.ts`) directly; Bun runtime is required for launcher path.
- CI exists at `.github/workflows/code-quality.yml` and runs typecheck/lint/test/build.
- `build:compile` output (`dist/apex`) is the intended standalone executable.
- `diff` is a structural comparison against raw preset config; `apply` filters sensitive paths before merge, so outputs are not strict apply previews.
- Apply flow ends with a manual operational step: run `openclaw gateway restart`.
- Project policy allows aggressive cleanup/migrations for this local-only environment.
- Legacy state directory (`~/.openclaw/oh-my-openclaw/`) is automatically migrated to `~/.openclaw/apex/` on first run.
