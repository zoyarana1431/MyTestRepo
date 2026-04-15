"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { useProjectRole } from "@/hooks/use-project-role";
import type { Defect } from "@/types/api";

export default function DefectsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { isAdmin } = useProjectRole(projectId);
  const [rows, setRows] = useState<Defect[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const list = await apiFetch<Defect[]>(`/api/v1/projects/${projectId}/defects`);
    setRows(list);
  }, [projectId]);

  useEffect(() => {
    void load().catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, [load]);

  async function removeDefect(id: number) {
    if (!isAdmin) return;
    if (!window.confirm("Delete this defect?")) return;
    setError(null);
    try {
      await apiFetch(`/api/v1/projects/${projectId}/defects/${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Delete failed");
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-ink">Defects</h2>
          <p className="mt-1 text-sm text-ink-muted">Linked to requirements, test cases, and executions.</p>
        </div>
        {isAdmin && (
          <Link
            href={`/projects/${projectId}/defects/new`}
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
          >
            Report defect
          </Link>
        )}
      </div>
      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}
      <div className="mt-6 overflow-hidden rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-muted/80 text-xs font-semibold uppercase text-ink-muted">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Severity</th>
              <th className="px-4 py-3">Status</th>
              {isAdmin && <th className="px-4 py-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.id} className="border-t border-border">
                <td className="px-4 py-3 font-mono text-xs">
                  <Link href={`/projects/${projectId}/defects/${d.id}`} className="text-accent hover:underline">
                    {d.code}
                  </Link>
                </td>
                <td className="px-4 py-3">{d.title}</td>
                <td className="px-4 py-3 capitalize">{d.severity}</td>
                <td className="px-4 py-3 capitalize">{d.status.replace("_", " ")}</td>
                {isAdmin && (
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Link
                        href={`/projects/${projectId}/defects/${d.id}`}
                        className="text-sm font-medium text-accent hover:underline"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => void removeDefect(d.id)}
                        className="text-sm font-medium text-red-600 hover:underline dark:text-red-400"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && !error && (
          <p className="px-4 py-8 text-center text-sm text-ink-muted">No defects.</p>
        )}
      </div>
    </div>
  );
}
