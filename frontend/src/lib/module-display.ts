import type { ModuleFlat } from "@/types/api";

/**
 * Full hierarchy path for a module id, e.g. `Checkout / Payment`.
 * Returns empty string if unassigned or the id is missing from `modules`.
 */
export function formatModulePath(moduleId: number | null | undefined, modules: ModuleFlat[]): string {
  if (moduleId == null) return "";
  const byId = new Map(modules.map((m) => [m.id, m]));
  const curStart = byId.get(moduleId);
  if (!curStart) return "";

  const parts: string[] = [];
  let cur: ModuleFlat | undefined = curStart;
  let guard = 0;
  while (cur && guard++ < 100) {
    parts.unshift(cur.name);
    cur = cur.parent_id != null ? byId.get(cur.parent_id) : undefined;
  }
  return parts.join(" / ");
}

/**
 * Prefer full path from the flat module list; fall back to API `module_name` (single segment).
 */
export function moduleCellLabel(
  moduleId: number | null | undefined,
  modules: ModuleFlat[],
  moduleNameFallback?: string | null,
): string {
  const path = formatModulePath(moduleId, modules);
  if (path) return path;
  const fb = moduleNameFallback?.trim();
  if (fb) return fb;
  return "";
}
