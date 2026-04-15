"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { useProjectRole } from "@/hooks/use-project-role";
import type { TestCaseListItem } from "@/types/api";

export default function TestCasesListPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { isAdmin } = useProjectRole(projectId);
  const [rows, setRows] = useState<TestCaseListItem[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const qs = new URLSearchParams();
    if (q.trim()) qs.set("q", q.trim());
    const path = `/api/v1/projects/${projectId}/test-cases${qs.toString() ? `?${qs}` : ""}`;
    const list = await apiFetch<TestCaseListItem[]>(path);
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

  async function removeTestCase(id: number) {
    if (!isAdmin) return;
    if (!window.confirm("Delete this test case? It will be hidden from lists but kept for history.")) return;
    setError(null);
    try {
      await apiFetch(`/api/v1/projects/${projectId}/test-cases/${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Delete failed");
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-ink">Test cases</h2>
          <p className="mt-1 text-sm text-ink-muted">Structured steps, linked requirements, and traceability.</p>
        </div>
        {isAdmin && (
          <Link
            href={`/projects/${projectId}/test-cases/new`}
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white shadow hover:bg-accent-hover"
          >
            New test case
          </Link>
        )}
      </div>

      <div className="mt-6">
        <input
          type="search"
          placeholder="Search code, feature, scenario…"
          className="w-full max-w-md rounded-md border border-border bg-surface px-3 py-2 text-sm"
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
                <th className="px-4 py-3">Feature / scenario</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Reqs</th>
                <th className="px-4 py-3 text-right">Steps</th>
                {isAdmin && <th className="px-4 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((tc) => (
                <tr key={tc.id} className="border-t border-border">
                  <td className="px-4 py-3 font-mono text-xs text-ink-muted">{tc.code}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/projects/${projectId}/test-cases/${tc.id}`}
                      className="font-medium text-accent hover:underline"
                    >
                      {tc.feature_name || tc.test_scenario?.slice(0, 100) || "(no title)"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 capitalize text-ink-muted">{tc.test_type}</td>
                  <td className="px-4 py-3 capitalize">{tc.status}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-muted">{tc.linked_requirement_count}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-muted">{tc.step_count}</td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Link
                          href={`/projects/${projectId}/test-cases/${tc.id}`}
                          className="text-sm font-medium text-accent hover:underline"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => void removeTestCase(tc.id)}
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
            <p className="px-4 py-8 text-center text-sm text-ink-muted">No test cases yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
