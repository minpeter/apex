function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function pathToString(path: string[]): string {
  return path.length === 0 ? '<root>' : path.join('.');
}

function throwCircularReferenceError(side: 'base' | 'override', path: string[]) {
  throw new Error(
    `Circular reference detected in deepMerge ${side} at ${pathToString(path)}`
  );
}

function deepMergeInternal(
  base: Record<string, unknown>,
  override: Record<string, unknown>,
  seen: WeakSet<object>,
  path: string[]
): Record<string, unknown> {
  if (seen.has(base)) {
    throwCircularReferenceError('base', path);
  }

  if (seen.has(override)) {
    throwCircularReferenceError('override', path);
  }

  seen.add(base);
  seen.add(override);

  const result: Record<string, unknown> = { ...base };

  for (const key of Object.keys(override)) {
    const overrideVal = override[key];
    const baseVal = result[key];

    if (overrideVal === undefined) {
      continue;
    }

    if (overrideVal === null) {
      delete result[key];
      continue;
    }

    if (isPlainObject(overrideVal) && isPlainObject(baseVal)) {
      result[key] = deepMergeInternal(baseVal, overrideVal, seen, [...path, key]);
    } else {
      result[key] = overrideVal;
    }
  }

  seen.delete(base);
  seen.delete(override);

  return result;
}

export function deepMerge(
  base: Record<string, unknown>,
  override: Record<string, unknown>
): Record<string, unknown> {
  return deepMergeInternal(base, override, new WeakSet<object>(), []);
}
