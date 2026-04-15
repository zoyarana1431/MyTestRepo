"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { useProjectRole } from "@/hooks/use-project-role";
import type { ExecutionCycle } from "@/types/api";

export default function RunsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { isAdmin } = useProjectRole(projectId);
  const [rows, setRows] = useState<ExecutionCycle[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const list = await apiFetch<ExecutionCycle[]>(`/api/v1/projects/${projectId}/execution-cycles`);
    setRows(list);
  }, [projectId]);

  useEffect(() => {
    void load().catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, [load]);

  async function removeCycle(id: number) {
    if (!isAdmin) return;
    if (
      !window.confirm(
        "Delete this run? Execution history stays; runs will no longer be grouped under it.",
      )
    ) {
      return;
    }
    setError(null);
    try {
      await apiFetch(`/api/v1/projects/${projectId}/execution-cycles/${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Delete failed");
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-ink">Execution cycles / runs</h2>
          <p className="mt-1 text-sm text-ink-muted">Group executions by build, regression, UAT, etc.</p>
        </div>
        {isAdmin && (
          <Link
            href={`/projects/${projectId}/runs/new`}
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
          >
            New run
          </Link>
        )}
      </div>
      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}
      <ul className="mt-8 space-y-3">
        {rows.map((r) => (
          <li
            key={r.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface-muted/30 px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <span className="font-mono text-xs text-ink-muted">{r.code}</span>
              <span className="ml-2 font-medium text-ink">{r.name}</span>
              {r.build_version && <span className="ml-2 text-sm text-ink-muted">({r.build_version})</span>}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-3">
              <span className="rounded-full bg-surface px-2 py-0.5 text-xs capitalize text-ink-muted">{r.status}</span>
              {isAdmin && (
                <>
                  <Link
                    href={`/projects/${projectId}/runs/${r.id}`}
                    className="text-sm font-medium text-accent hover:underline"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => void removeCycle(r.id)}
                    className="text-sm font-medium text-red-600 hover:underline dark:text-red-400"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
      {rows.length === 0 && !error && <p className="mt-8 text-sm text-ink-muted">No runs yet.</p>}
    </div>
  );
}
