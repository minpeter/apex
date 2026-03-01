import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import pc from 'picocolors';

import { createBackup, createWorkspaceBackup } from '../core/backup';
import { resolveOpenClawPaths } from '../core/config-path';
import { PRESERVE_IF_SET_FIELDS, WORKSPACE_FILES } from '../core/constants';
import { fixNodePathIfNeeded } from '../core/fix-node-path';
import {
  isFileNotFoundError,
  readJson5,
  writeJson5,
} from '../core/json5-utils';
import { migrateLegacyKeys } from '../core/legacy-migration';
import { deepMerge } from '../core/merge';
import { loadPreset } from '../core/preset-loader';
import { cloneToCache, isGitHubRef, parseGitHubRef } from '../core/remote';
import { filterSensitiveFields } from '../core/sensitive-filter';
import { copySkills } from '../core/skills';
import type { PresetManifest } from '../core/types';
import {
  copyWorkspaceFiles,
  listWorkspaceFiles,
  resolveWorkspaceDir,
} from '../core/workspace';
import { getBuiltinPresets } from '../presets/index';

interface ApplyOptions {
  clean?: boolean;
  dryRun?: boolean;
  force?: boolean;
  noBackup?: boolean;
}

interface ResolvedPreset {
  preset: PresetManifest;
  presetDir: string;
}

function isPresetNotFoundError(error: unknown): boolean {
  return (
    error instanceof Error && error.message.startsWith('Preset not found:')
  );
}

function resolveBuiltinPresetDir(presetName: string): string {
  const commandDir = path.dirname(fileURLToPath(import.meta.url));
  return path.join(commandDir, '..', 'presets', presetName);
}

function hasPresetConfig(preset: PresetManifest): boolean {
  return Boolean(preset.config && Object.keys(preset.config).length > 0);
}

async function resolvePreset(
  presetName: string,
  presetsDir: string,
  force?: boolean
): Promise<ResolvedPreset> {
  if (isGitHubRef(presetName)) {
    const { owner, repo } = parseGitHubRef(presetName);
    const cachePath = await cloneToCache(owner, repo, presetsDir, { force });
    console.log(pc.green(`Remote preset '${owner}/${repo}' ready.`));
    return {
      preset: await loadPreset(cachePath),
      presetDir: cachePath,
    };
  }

  const userPresetPath = path.join(presetsDir, presetName);
  let userPreset: ResolvedPreset | null = null;
  try {
    const preset = await loadPreset(userPresetPath);
    userPreset = { preset, presetDir: userPresetPath };
  } catch (error) {
    if (!isPresetNotFoundError(error)) {
      throw error;
    }
  }

  if (userPreset) {
    return userPreset;
  }

  const builtinPreset = (await getBuiltinPresets()).find(
    (candidate) => candidate.name === presetName
  );
  if (!builtinPreset) {
    throw new Error(
      `Preset '${presetName}' not found. Run 'apex list' to see available presets.`
    );
  }

  return {
    preset: builtinPreset,
    presetDir: resolveBuiltinPresetDir(presetName),
  };
}

async function loadCurrentConfig(configPath: string): Promise<{
  config: Record<string, unknown>;
  exists: boolean;
}> {
  try {
    const snapshot = await readJson5(configPath);
    return {
      config: snapshot.parsed,
      exists: true,
    };
  } catch (error) {
    if (!isFileNotFoundError(error)) {
      throw error;
    }

    return {
      config: {},
      exists: false,
    };
  }
}

async function unlinkIfExists(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code !== 'ENOENT') {
      throw error;
    }
  }
}

async function backupWorkspaceIfNeeded(
  workspaceDir: string,
  backupsDir: string,
  enabled: boolean
): Promise<void> {
  if (!enabled) {
    return;
  }

  const existingWorkspaceFiles = await listWorkspaceFiles(workspaceDir);
  if (existingWorkspaceFiles.length === 0) {
    return;
  }

  const workspaceBackupPath = await createWorkspaceBackup(
    workspaceDir,
    backupsDir,
    existingWorkspaceFiles
  );
  console.log(pc.dim(`Workspace backup created: ${workspaceBackupPath}`));
}

async function runCleanMode(
  workspaceDir: string,
  configPath: string,
  backupsDir: string,
  configExists: boolean,
  noBackup: boolean
): Promise<void> {
  if (!noBackup && configExists) {
    const backupPath = await createBackup(configPath, backupsDir);
    console.log(pc.dim(`Backup created: ${backupPath}`));
  }

  await backupWorkspaceIfNeeded(workspaceDir, backupsDir, !noBackup);
  await removeWorkspaceFiles(workspaceDir);
  await unlinkIfExists(configPath);
}

async function runRegularBackupMode(
  workspaceDir: string,
  configPath: string,
  backupsDir: string,
  configExists: boolean,
  noBackup: boolean,
  hasWorkspaceFiles: boolean
): Promise<void> {
  if (!noBackup && configExists) {
    const backupPath = await createBackup(configPath, backupsDir);
    console.log(pc.dim(`Backup created: ${backupPath}`));
  }

  await backupWorkspaceIfNeeded(
    workspaceDir,
    backupsDir,
    !noBackup && hasWorkspaceFiles
  );
}

async function removeWorkspaceFiles(workspaceDir: string): Promise<void> {
  for (const filename of WORKSPACE_FILES) {
    await unlinkIfExists(path.join(workspaceDir, filename));
  }
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (
      current === null ||
      current === undefined ||
      typeof current !== 'object'
    ) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function setNestedValue(
  obj: Record<string, unknown>,
  path: string,
  value: unknown
): void {
  const parts = path.split('.');
  let current: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (
      !(part in current) ||
      typeof current[part] !== 'object' ||
      current[part] === null
    ) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }
  const lastPart = parts.at(-1);
  if (lastPart !== undefined) {
    current[lastPart] = value;
  }
}

function buildMergedConfig(
  currentConfig: Record<string, unknown>,
  preset: PresetManifest
): {
  applied: string[];
  mergedConfig: Record<string, unknown>;
  preserved: string[];
} {
  if (!hasPresetConfig(preset)) {
    return { applied: [], mergedConfig: currentConfig, preserved: [] };
  }

  // Save user-set values that should not be overwritten
  const savedValues = new Map<string, unknown>();
  for (const field of PRESERVE_IF_SET_FIELDS) {
    const existing = getNestedValue(currentConfig, field);
    if (existing !== undefined) {
      savedValues.set(field, existing);
    }
  }

  const filteredPresetConfig = filterSensitiveFields(
    preset.config as Record<string, unknown>
  );
  const rawMerged = deepMerge(currentConfig, filteredPresetConfig);
  const { config: mergedConfig, applied } = migrateLegacyKeys(rawMerged);

  // Restore preserved values
  const preserved: string[] = [];
  for (const [field, value] of savedValues) {
    const newValue = getNestedValue(mergedConfig, field);
    if (newValue !== value) {
      setNestedValue(mergedConfig, field, value);
      preserved.push(field);
    }
  }

  return { applied, mergedConfig, preserved };
}

function printDryRunInfo(preset: PresetManifest): void {
  console.log(pc.bold(pc.yellow('DRY RUN - no files will be modified\n')));
  console.log(`Preset: ${pc.bold(preset.name)} (${preset.description})`);
  if (hasPresetConfig(preset)) {
    console.log(
      `Config changes: ${Object.keys(preset.config as Record<string, unknown>).length} top-level keys`
    );
  }
  if (preset.workspaceFiles?.length) {
    console.log(`Workspace files: ${preset.workspaceFiles.join(', ')}`);
  }
  if (preset.skills?.length) {
    console.log(`Skills to install: ${preset.skills.join(', ')}`);
  }
  console.log(pc.dim('\nRun without --dry-run to apply.'));
}

export async function applyCommand(
  presetName: string,
  options: ApplyOptions = {}
): Promise<void> {
  const paths = await resolveOpenClawPaths();
  const { preset, presetDir } = await resolvePreset(
    presetName,
    paths.presetsDir,
    options.force
  );

  const configSnapshot = await loadCurrentConfig(paths.configPath);
  let currentConfig = configSnapshot.config;
  let configExists = configSnapshot.exists;
  const workspaceDir = resolveWorkspaceDir(currentConfig, paths.stateDir);

  if (options.clean && !options.dryRun) {
    await runCleanMode(
      workspaceDir,
      paths.configPath,
      paths.backupsDir,
      configExists,
      Boolean(options.noBackup)
    );

    currentConfig = {};
    configExists = false;
    console.log(
      pc.yellow('Clean install: existing config and workspace files removed.')
    );
  }

  const { applied, mergedConfig, preserved } = buildMergedConfig(
    currentConfig,
    preset
  );
  if (applied.length > 0) {
    console.log(pc.dim(`Legacy key migration: ${applied.join(', ')}`));
  }
  if (preserved.length > 0) {
    console.log(
      pc.dim(`Preserved existing user settings: ${preserved.join(', ')}`)
    );
  }

  if (options.dryRun) {
    if (options.clean) {
      console.log(pc.yellow('Mode: CLEAN INSTALL'));
    }
    printDryRunInfo(preset);
    return;
  }

  if (!options.clean) {
    await runRegularBackupMode(
      workspaceDir,
      paths.configPath,
      paths.backupsDir,
      configExists,
      Boolean(options.noBackup),
      Boolean(preset.workspaceFiles?.length)
    );
  }

  if (hasPresetConfig(preset)) {
    if (configExists) {
      console.log(
        pc.yellow(
          'Warning: JSON5 comments in your config will be lost (known MVP limitation).'
        )
      );
    } else {
      console.log(
        pc.yellow(
          'Warning: config file not found. Creating new config from preset.'
        )
      );
    }
    await fs.mkdir(path.dirname(paths.configPath), { recursive: true });
    await writeJson5(paths.configPath, mergedConfig);
  }

  if (preset.workspaceFiles?.length) {
    await copyWorkspaceFiles(presetDir, workspaceDir, preset.workspaceFiles);
    console.log(
      pc.green(`OK Workspace files copied: ${preset.workspaceFiles.join(', ')}`)
    );
  }

  if (preset.skills?.length) {
    const installed = await copySkills(presetDir, preset.skills, {
      force: options.force,
    });
    if (installed.length > 0) {
      console.log(pc.green(`OK Skills installed: ${installed.join(', ')}`));
    }
  }

  if (process.platform === 'darwin') {
    await fixNodePathIfNeeded();
  }

  console.log(pc.green(`\nOK Preset '${preset.name}' applied.`));
  console.log(
    pc.bold(pc.yellow("Run 'openclaw gateway restart' to activate changes."))
  );
}
