"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ModuleSubmoduleSelect } from "@/components/modules/module-submodule-select";
import { apiFetch } from "@/lib/api";
import type { DashboardSummary, ExecutionCycle, ModuleFlat } from "@/types/api";

function Bar({ label, pct }: { label: string; pct: number }) {
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs text-ink-muted">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
        <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}

export default function ProjectDashboardPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [modules, setModules] = useState<ModuleFlat[]>([]);
  const [cycles, setCycles] = useState<ExecutionCycle[]>([]);
  const [moduleId, setModuleId] = useState("");
  const [cycleId, setCycleId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const qs = new URLSearchParams();
    if (moduleId) qs.set("module_id", moduleId);
    if (cycleId) qs.set("execution_cycle_id", cycleId);
    if (dateFrom) qs.set("date_from", new Date(dateFrom).toISOString());
    if (dateTo) qs.set("date_to", new Date(dateTo).toISOString());
    const d = await apiFetch<DashboardSummary>(`/api/v1/projects/${projectId}/dashboard?${qs.toString()}`);
    setData(d);
  }, [projectId, moduleId, cycleId, dateFrom, dateTo]);

  useEffect(() => {
    void Promise.all([
      apiFetch<ModuleFlat[]>(`/api/v1/projects/${projectId}/modules`),
      apiFetch<ExecutionCycle[]>(`/api/v1/projects/${projectId}/execution-cycles`),
    ]).then(([m, c]) => {
      setModules(m);
      setCycles(c);
    });
  }, [projectId]);

  useEffect(() => {
    setLoading(true);
    void load()
      .then(() => setError(null))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, [load]);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-ink">Dashboard</h2>
        <p className="mt-1 text-sm text-ink-muted">Filtered metrics for this project workspace.</p>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-border bg-surface-muted/30 p-4">
        <ModuleSubmoduleSelect
          variant="filter"
          modules={modules}
          value={moduleId === "" ? null : Number(moduleId)}
          onChange={(id) => setModuleId(id == null ? "" : String(id))}
          className="min-w-[12rem]"
        />
        <select
          className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
          value={cycleId}
          onChange={(e) => setCycleId(e.target.value)}
        >
          <option value="">All runs</option>
          {cycles.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code} — {c.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
        />
        <input
          type="date"
          className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
        />
      </div>

      {loading && <p className="text-sm text-ink-muted">Loading…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {data && !loading && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Requirements", data.requirements_total],
              ["Test cases", data.test_cases_total],
              ["Executions", data.executions_total],
              ["Req. coverage", `${data.requirement_coverage_pct}%`],
              ["Defects (open)", data.defects_open],
              ["Defects (closed)", data.defects_closed],
            ].map(([k, v]) => (
              <div key={String(k)} className="rounded-xl border border-border bg-surface p-4 shadow-sm">
                <p className="text-xs font-medium uppercase text-ink-muted">{k}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">{v}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-surface-muted/20 p-6">
              <h3 className="text-sm font-semibold text-ink">Execution outcomes</h3>
              <div className="mt-4 space-y-3">
                <Bar label="Pass" pct={data.execution_pass_pct} />
                <Bar label="Fail" pct={data.execution_fail_pct} />
                <Bar label="Blocked" pct={data.execution_blocked_pct} />
                <Bar label="Not run" pct={data.execution_not_run_pct} />
                <Bar label="Retest" pct={data.execution_retest_pct} />
              </div>
            </div>
            <div className="rounded-xl border border-border bg-surface-muted/20 p-6">
              <h3 className="text-sm font-semibold text-ink">Defects by severity</h3>
              <ul className="mt-4 space-y-2 text-sm">
                {Object.entries(data.defects_by_severity).map(([k, v]) => (
                  <li key={k} className="flex justify-between capitalize">
                    <span className="text-ink-muted">{k}</span>
                    <span className="font-medium">{v}</span>
                  </li>
                ))}
                {Object.keys(data.defects_by_severity).length === 0 && (
                  <li className="text-ink-muted">No defects in filter.</li>
                )}
              </ul>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface-muted/20 p-6">
            <h3 className="text-sm font-semibold text-ink">Execution trend (by day)</h3>
            <ul className="mt-4 max-h-48 space-y-1 overflow-y-auto font-mono text-xs text-ink-muted">
              {data.executions_trend.map((t) => (
                <li key={t.date}>
                  {t.date}: {t.count}
                </li>
              ))}
              {data.executions_trend.length === 0 && <li>No executions in range.</li>}
            </ul>
          </div>

          <div className="rounded-xl border border-border bg-surface-muted/20 p-6">
            <h3 className="text-sm font-semibold text-ink">Module execution status</h3>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-ink-muted">
                  <tr>
                    <th className="py-2">Module</th>
                    <th className="py-2 text-right">Total</th>
                    <th className="py-2 text-right">Pass</th>
                    <th className="py-2 text-right">Fail</th>
                    <th className="py-2 text-right">Blocked</th>
                  </tr>
                </thead>
                <tbody>
                  {data.module_execution_summary.map((m) => (
                    <tr key={m.module_name} className="border-t border-border">
                      <td className="py-2">{m.module_name}</td>
                      <td className="py-2 text-right tabular-nums">{m.total}</td>
                      <td className="py-2 text-right tabular-nums text-emerald-600">{m.pass}</td>
                      <td className="py-2 text-right tabular-nums text-red-600">{m.fail}</td>
                      <td className="py-2 text-right tabular-nums text-amber-600">{m.blocked}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
