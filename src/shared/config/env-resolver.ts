/**
 * Recursively resolves environment variable references in a parsed YAML object.
 * String values starting with `$` are resolved to `Bun.env[varName]`.
 * Arrays and objects are recursed. Primitives are passed through as-is.
 */
export function resolveEnvVars(obj: unknown): unknown {
  if (typeof obj === "string") {
    if (obj.startsWith("$")) {
      const varName = obj.slice(1);
      return Bun.env[varName];
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(resolveEnvVars);
  }

  if (obj !== null && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = resolveEnvVars(value);
    }
    return result;
  }

  return obj;
}
