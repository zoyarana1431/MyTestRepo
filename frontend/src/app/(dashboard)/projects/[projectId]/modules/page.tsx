"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ModuleTree } from "@/components/modules/module-tree";
import { apiFetch, ApiError } from "@/lib/api";
import { useProjectRole } from "@/hooks/use-project-role";
import type { ModuleNode } from "@/types/api";

type FlatMod = {
  id: number;
  name: string;
  parent_id: number | null;
};

export default function ProjectModulesPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { isAdmin } = useProjectRole(projectId);
  const [tree, setTree] = useState<ModuleNode[]>([]);
  const [flat, setFlat] = useState<FlatMod[]>([]);
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [t, f] = await Promise.all([
      apiFetch<ModuleNode[]>(`/api/v1/projects/${projectId}/modules/tree`),
      apiFetch<FlatMod[]>(`/api/v1/projects/${projectId}/modules`),
    ]);
    setTree(t);
    setFlat(f);
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await load();
        setError(null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load modules");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function addModule(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;
    setError(null);
    try {
      await apiFetch(`/api/v1/projects/${projectId}/modules`, {
        method: "POST",
        json: {
          name: name.trim(),
          parent_id: parentId === "" ? null : Number(parentId),
          sort_order: 0,
        },
      });
      setName("");
      setParentId("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add module");
    }
  }

  async function removeModule(id: number) {
    if (!isAdmin) return;
    if (!window.confirm("Delete this module? Sub-modules will be removed as well.")) return;
    setError(null);
    try {
      await apiFetch(`/api/v1/projects/${projectId}/modules/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete");
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="text-lg font-semibold text-ink">Modules & sub-modules</h2>
      <p className="mt-1 text-sm text-ink-muted">
        Top-level entries are modules; choose a parent to create a sub-module. Requirements and test cases will attach
        here in later phases.
      </p>

      {loading && <p className="mt-6 text-sm text-ink-muted">Loading…</p>}
      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

      {!loading && (
        <div className="mt-8 rounded-xl border border-border bg-surface-muted/20 p-6">
          <ModuleTree tree={tree} onDelete={removeModule} isAdmin={isAdmin} />
        </div>
      )}

      {isAdmin && !loading && (
        <form onSubmit={addModule} className="mt-8 space-y-4 rounded-xl border border-border bg-surface p-6">
          <h3 className="text-sm font-semibold text-ink">Add module or sub-module</h3>
          <div>
            <label className="text-xs font-medium text-ink-muted">Name</label>
            <input
              required
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Checkout"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-muted">Parent (optional)</label>
            <select
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
            >
              <option value="">— Top-level module —</option>
              {flat.map((m) => (
                <option key={m.id} value={m.id}>
                  [{m.id}] {m.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-ink-muted">
              Pick a parent to nest under; leave empty for a root module.
            </p>
          </div>
          <button
            type="submit"
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
          >
            Add
          </button>
        </form>
      )}

      {!isAdmin && !loading && (
        <p className="mt-6 text-sm text-ink-muted">Only project admins can change module structure.</p>
      )}
    </div>
  );
}
