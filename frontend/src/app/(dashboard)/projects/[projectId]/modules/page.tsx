"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CreateModuleModal } from "@/components/modules/create-module-modal";
import { ModuleTree } from "@/components/modules/module-tree";
import { apiFetch, ApiError } from "@/lib/api";
import { useProjectRole } from "@/hooks/use-project-role";
import type { ModuleNode } from "@/types/api";

function countModuleNodes(nodes: ModuleNode[]): number {
  return nodes.reduce((acc, n) => acc + 1 + countModuleNodes(n.children || []), 0);
}

export default function ProjectModulesPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { isAdmin } = useProjectRole(projectId);
  const [tree, setTree] = useState<ModuleNode[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    const t = await apiFetch<ModuleNode[]>(`/api/v1/projects/${projectId}/modules/tree`);
    setTree(t);
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await load();
        if (!cancelled) setError(null);
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

  const totalCount = useMemo(() => countModuleNodes(tree), [tree]);

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
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Modules</h1>
          <p className="mt-1 text-sm text-slate-500">
            {loading ? "Loading…" : `${totalCount} module${totalCount === 1 ? "" : "s"} and sub-modules`}
          </p>
        </div>
        {isAdmin && !loading && (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            + New Module
          </button>
        )}
      </div>

      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

      {!loading && (
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <ModuleTree tree={tree} onDelete={removeModule} isAdmin={isAdmin} />
        </div>
      )}

      {!isAdmin && !loading && (
        <p className="mt-6 text-sm text-slate-500">Only project admins can add or remove modules.</p>
      )}

      <CreateModuleModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        projectId={projectId}
        tree={tree}
        onCreated={() => void load()}
      />
    </div>
  );
}
