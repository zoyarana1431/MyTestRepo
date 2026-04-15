"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { useProjectRole } from "@/hooks/use-project-role";
import type { RequirementListItem } from "@/types/api";

export default function RequirementsListPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { isAdmin } = useProjectRole(projectId);
  const [rows, setRows] = useState<RequirementListItem[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const qs = new URLSearchParams();
    if (q.trim()) qs.set("q", q.trim());
    const path = `/api/v1/projects/${projectId}/requirements${qs.toString() ? `?${qs}` : ""}`;
    const list = await apiFetch<RequirementListItem[]>(path);
    setRows(list);
  }, [projectId, q]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void load()
      .then(() => {
        if (!cancelled) setError(null);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function removeRequirement(id: number) {
    if (!isAdmin) return;
    if (!window.confirm("Delete this requirement? It will be hidden from lists but kept for history.")) return;
    setError(null);
    try {
      await apiFetch(`/api/v1/projects/${projectId}/requirements/${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Delete failed");
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-ink">Requirements</h2>
          <p className="mt-1 text-sm text-ink-muted">Trace requirements to test cases in the detail view.</p>
        </div>
        {isAdmin && (
          <Link
            href={`/projects/${projectId}/requirements/new`}
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white shadow hover:bg-accent-hover"
          >
            New requirement
          </Link>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Search title or code…"
          className="min-w-[200px] flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {loading && <p className="mt-6 text-sm text-ink-muted">Loading…</p>}
      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="mt-6 overflow-hidden rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-muted/80 text-xs font-semibold uppercase text-ink-muted">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3 text-right">Test cases</th>
                {isAdmin && <th className="px-4 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-4 py-3 font-mono text-xs text-ink-muted">{r.code}</td>
                  <td className="px-4 py-3">
                    <Link href={`/projects/${projectId}/requirements/${r.id}`} className="font-medium text-accent hover:underline">
                      {r.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 capitalize text-ink-muted">{r.status.replace("_", " ")}</td>
                  <td className="px-4 py-3 capitalize">{r.priority}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-muted">{r.linked_test_case_count}</td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Link
                          href={`/projects/${projectId}/requirements/${r.id}`}
                          className="text-sm font-medium text-accent hover:underline"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => void removeRequirement(r.id)}
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
          {rows.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-ink-muted">No requirements yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
