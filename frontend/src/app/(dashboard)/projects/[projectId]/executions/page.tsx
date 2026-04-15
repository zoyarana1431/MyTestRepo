"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { ExecutionCycle, ExecutionListItem } from "@/types/api";

export default function ExecutionsListPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const [rows, setRows] = useState<ExecutionListItem[]>([]);
  const [cycles, setCycles] = useState<ExecutionCycle[]>([]);
  const [cycleFilter, setCycleFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const qs = new URLSearchParams();
    if (cycleFilter) qs.set("execution_cycle_id", cycleFilter);
    const path = `/api/v1/projects/${projectId}/executions${qs.toString() ? `?${qs}` : ""}`;
    const list = await apiFetch<ExecutionListItem[]>(path);
    setRows(list);
  }, [projectId, cycleFilter]);

  useEffect(() => {
    void apiFetch<ExecutionCycle[]>(`/api/v1/projects/${projectId}/execution-cycles`).then(setCycles);
  }, [projectId]);

  useEffect(() => {
    setLoading(true);
    void load()
      .then(() => setError(null))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, [load]);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-ink">Test executions</h2>
          <p className="mt-1 text-sm text-ink-muted">Append-only history of runs (never overwritten).</p>
        </div>
        <Link
          href={`/projects/${projectId}/executions/new`}
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
        >
          Log execution
        </Link>
      </div>

      <div className="mt-6">
        <label className="mr-2 text-xs text-ink-muted">Run filter</label>
        <select
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
          value={cycleFilter}
          onChange={(e) => setCycleFilter(e.target.value)}
        >
          <option value="">All runs</option>
          {cycles.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code}
            </option>
          ))}
        </select>
      </div>

      {loading && <p className="mt-6 text-sm text-ink-muted">Loading…</p>}
      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="mt-6 overflow-hidden rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-muted/80 text-xs font-semibold uppercase text-ink-muted">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Test case</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">When</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id} className="border-t border-border">
                  <td className="px-4 py-3 font-mono text-xs">
                    <Link href={`/projects/${projectId}/executions/${e.id}`} className="text-accent hover:underline">
                      {e.code}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-ink-muted">{e.test_case_code}</span>{" "}
                    {e.test_case_title}
                  </td>
                  <td className="px-4 py-3 capitalize">{e.status.replace("_", " ")}</td>
                  <td className="px-4 py-3 text-ink-muted">{new Date(e.executed_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-ink-muted">No executions yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
