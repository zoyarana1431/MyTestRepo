"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { RTMModuleRow, RTMProjectSummary, RTMRequirementRow } from "@/types/api";

type Tab = "req" | "mod" | "proj";

export default function RTMPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const [tab, setTab] = useState<Tab>("req");
  const [reqRows, setReqRows] = useState<RTMRequirementRow[]>([]);
  const [modRows, setModRows] = useState<RTMModuleRow[]>([]);
  const [proj, setProj] = useState<RTMProjectSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [r, m, p] = await Promise.all([
      apiFetch<RTMRequirementRow[]>(`/api/v1/projects/${projectId}/rtm/requirements`),
      apiFetch<RTMModuleRow[]>(`/api/v1/projects/${projectId}/rtm/modules`),
      apiFetch<RTMProjectSummary>(`/api/v1/projects/${projectId}/rtm/project-summary`),
    ]);
    setReqRows(r);
    setModRows(m);
    setProj(p);
  }, [projectId]);

  useEffect(() => {
    setLoading(true);
    void load()
      .then(() => setError(null))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, [load]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-ink">Requirements traceability (RTM)</h2>
        <p className="mt-1 text-sm text-ink-muted">Derived from linked test cases, executions, and defects.</p>
      </div>

      <div className="flex gap-1 rounded-lg border border-border p-0.5">
        {(
          [
            ["req", "By requirement"],
            ["mod", "By module"],
            ["proj", "Project summary"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${
              tab === k ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:bg-surface"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-ink-muted">Loading…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && tab === "proj" && proj && (
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            ["Requirements", proj.requirement_total],
            ["Test cases", proj.test_case_total],
            ["Executions", proj.execution_total],
            ["Coverage %", proj.coverage_pct],
            ["Open defects", proj.defect_open],
            ["Closed defects", proj.defect_closed],
          ].map(([a, b]) => (
            <div key={String(a)} className="rounded-xl border border-border bg-surface-muted/30 p-4">
              <p className="text-xs uppercase text-ink-muted">{a}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{b}</p>
            </div>
          ))}
        </div>
      )}

      {!loading && tab === "req" && (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-surface-muted/80 text-xs uppercase text-ink-muted">
              <tr>
                <th className="px-3 py-2">Req</th>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2 text-right">TCs</th>
                <th className="px-3 py-2 text-right">Exec</th>
                <th className="px-3 py-2 text-right">Pass</th>
                <th className="px-3 py-2 text-right">Fail</th>
                <th className="px-3 py-2 text-right">Cov %</th>
                <th className="px-3 py-2">Latest</th>
              </tr>
            </thead>
            <tbody>
              {reqRows.map((r) => (
                <tr key={r.requirement_id} className="border-t border-border">
                  <td className="px-3 py-2 font-mono text-xs">{r.code}</td>
                  <td className="px-3 py-2">{r.title}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.linked_test_case_count}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.execution_count}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-emerald-600">{r.pass_count}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-red-600">{r.fail_count}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.coverage_pct}</td>
                  <td className="px-3 py-2 capitalize text-ink-muted">{r.latest_status?.replace("_", " ") ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && tab === "mod" && (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-muted/80 text-xs uppercase text-ink-muted">
              <tr>
                <th className="px-3 py-2">Module</th>
                <th className="px-3 py-2 text-right">Reqs</th>
                <th className="px-3 py-2 text-right">TC links</th>
                <th className="px-3 py-2 text-right">Exec</th>
                <th className="px-3 py-2 text-right">Pass</th>
                <th className="px-3 py-2 text-right">Fail</th>
              </tr>
            </thead>
            <tbody>
              {modRows.map((r, i) => (
                <tr key={`${r.module_id ?? "none"}-${i}`} className="border-t border-border">
                  <td className="px-3 py-2">{r.module_name}</td>
                  <td className="px-3 py-2 text-right">{r.requirement_count}</td>
                  <td className="px-3 py-2 text-right">{r.linked_test_case_count}</td>
                  <td className="px-3 py-2 text-right">{r.execution_count}</td>
                  <td className="px-3 py-2 text-right text-emerald-600">{r.pass_count}</td>
                  <td className="px-3 py-2 text-right text-red-600">{r.fail_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
