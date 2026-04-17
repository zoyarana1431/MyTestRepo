"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ConicDonut } from "@/components/charts/conic-donut";
import { apiFetch } from "@/lib/api";
import type { WorkspaceDashboard } from "@/types/api";

const COL = {
  pass: "#10B981",
  fail: "#EF4444",
  blocked: "#F59E0B",
  not_run: "#94A3B8",
  retest: "#A855F7",
  critical: "#EF4444",
  major: "#F97316",
  minor: "#EAB308",
  trivial: "#CBD5E1",
  blocker: "#7C3AED",
  blue: "#3B82F6",
};

function ProgressRow({ label, pct, barClass }: { label: string; pct: number; barClass: string }) {
  const w = Math.min(100, Math.max(0, pct));
  return (
    <div className="mb-4 last:mb-0">
      <div className="mb-1 flex justify-between text-sm text-slate-600">
        <span>{label}</span>
        <span className="font-semibold tabular-nums text-slate-900">{pct}%</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full transition-all ${barClass}`} style={{ width: `${w}%` }} />
      </div>
    </div>
  );
}

function severityStyles(sev: string) {
  const s = sev.toLowerCase();
  if (s === "critical" || s === "blocker") return "bg-red-50 text-red-700 ring-red-100";
  if (s === "major") return "bg-orange-50 text-orange-700 ring-orange-100";
  if (s === "minor") return "bg-amber-50 text-amber-800 ring-amber-100";
  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function statusStyles(st: string) {
  const s = st.toLowerCase();
  if (s === "open") return { dot: "bg-red-500", pill: "bg-red-50 text-red-800 ring-red-100" };
  if (s === "in_progress") return { dot: "bg-orange-500", pill: "bg-orange-50 text-orange-800 ring-orange-100" };
  if (s === "resolved" || s === "closed") return { dot: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-800 ring-emerald-100" };
  return { dot: "bg-slate-400", pill: "bg-slate-50 text-slate-700 ring-slate-200" };
}

function execResultStyles(st: string) {
  const s = st.toLowerCase();
  if (s === "pass") return { dot: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-800 ring-emerald-100" };
  if (s === "fail") return { dot: "bg-red-500", pill: "bg-red-50 text-red-800 ring-red-100" };
  return { dot: "bg-amber-500", pill: "bg-amber-50 text-amber-900 ring-amber-100" };
}

export default function QualityDashboardPage() {
  const [projectFilter, setProjectFilter] = useState<string>("");
  const [data, setData] = useState<WorkspaceDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const qs = projectFilter ? `?project_id=${encodeURIComponent(projectFilter)}` : "";
    const d = await apiFetch<WorkspaceDashboard>(`/api/v1/dashboard/workspace${qs}`);
    setData(d);
  }, [projectFilter]);

  useEffect(() => {
    setLoading(true);
    void load()
      .then(() => setError(null))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, [load]);

  const execLegend = useMemo(() => {
    if (!data) return [];
    const by = data.executions_by_status;
    return [
      { label: "Pass", value: by.pass ?? 0, color: COL.pass },
      { label: "Fail", value: by.fail ?? 0, color: COL.fail },
      { label: "Blocked", value: by.blocked ?? 0, color: COL.blocked },
      { label: "Not Run", value: by.not_run ?? 0, color: COL.not_run },
      { label: "Retest", value: by.retest ?? 0, color: COL.retest },
    ];
  }, [data]);

  const defectLegend = useMemo(() => {
    if (!data) return [];
    const sev = data.defects_by_severity;
    return [
      { label: "Critical", value: sev.critical ?? 0, color: COL.critical },
      { label: "Major", value: sev.major ?? 0, color: COL.major },
      { label: "Minor", value: sev.minor ?? 0, color: COL.minor },
      { label: "Trivial", value: sev.trivial ?? 0, color: COL.trivial },
      { label: "Open", value: data.defects_open, color: "#F87171" },
      { label: "Closed", value: data.defects_closed, color: "#059669" },
    ];
  }, [data]);

  const execDonutSegments = execLegend.map((x) => ({ value: x.value, color: x.color }));
  const defectDonutSegments = [
    { value: data?.defects_by_severity.critical ?? 0, color: COL.critical },
    { value: data?.defects_by_severity.major ?? 0, color: COL.major },
    { value: data?.defects_by_severity.minor ?? 0, color: COL.minor },
    { value: data?.defects_by_severity.trivial ?? 0, color: COL.trivial },
    { value: data?.defects_by_severity.blocker ?? 0, color: COL.blocker },
  ];

  if (loading && !data) {
    return <p className="text-sm text-slate-500">Loading dashboard…</p>;
  }
  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }
  if (!data) return null;

  const defectsListProjectId = projectFilter ? Number(projectFilter) : data.projects[0]?.id;

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Quality Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Real-time overview of your QA activities</p>
        </div>
        <select
          className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm outline-none ring-slate-200 focus:ring-2"
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
        >
          <option value="">All Projects</option>
          {data.projects.map((p) => (
            <option key={p.id} value={String(p.id)}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex justify-between">
            <p className="text-sm font-medium text-slate-500">Requirements</p>
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-lg">📘</span>
          </div>
          <p className="mt-3 text-3xl font-bold tabular-nums text-slate-900">{data.requirements_total}</p>
          <p className="text-xs text-slate-500">Documented</p>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex justify-between">
            <p className="text-sm font-medium text-slate-500">Test Cases</p>
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-lg">✎</span>
          </div>
          <p className="mt-3 text-3xl font-bold tabular-nums text-slate-900">{data.test_cases_total}</p>
          <p className="text-xs text-slate-500">Authored</p>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex justify-between">
            <p className="text-sm font-medium text-slate-500">Executions</p>
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-lg">▶</span>
          </div>
          <p className="mt-3 text-3xl font-bold tabular-nums text-slate-900">{data.executions_total}</p>
          <p className="text-xs text-slate-500">{data.execution_pass_pct}% Pass Rate</p>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex justify-between">
            <p className="text-sm font-medium text-slate-500">Defects</p>
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-lg">🐛</span>
          </div>
          <p className="mt-3 text-3xl font-bold tabular-nums text-slate-900">{data.defects_total}</p>
          <p className="text-xs text-slate-500">{data.defects_open} Open</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Execution Status</h2>
          <ConicDonut
            segments={execDonutSegments}
            centerTitle={`${data.execution_pass_pct}%`}
            centerSubtitle="Pass Rate"
          />
          <ul className="mt-4 space-y-2 text-sm">
            {execLegend.map((row) => (
              <li key={row.label} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: row.color }} />
                  {row.label}
                </span>
                <span className="font-medium tabular-nums text-slate-900">{row.value}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Defect Severity</h2>
          <ConicDonut
            segments={defectDonutSegments}
            centerTitle={`${data.defects_total}`}
            centerSubtitle="Total Bugs"
          />
          <ul className="mt-4 space-y-2 text-sm">
            {defectLegend.map((row) => (
              <li key={row.label} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: row.color }} />
                  {row.label}
                </span>
                <span className="font-medium tabular-nums text-slate-900">{row.value}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Coverage Metrics</h2>
          <div className="mt-4">
            <ProgressRow label="Test Execution Coverage" pct={data.requirement_coverage_pct} barClass="bg-blue-500" />
            <ProgressRow label="Pass Rate" pct={data.execution_pass_pct} barClass="bg-emerald-500" />
            <ProgressRow label="Fail Rate" pct={data.execution_fail_pct} barClass="bg-red-500" />
            <ProgressRow label="Block Rate" pct={data.execution_blocked_pct} barClass="bg-orange-400" />
          </div>
          <div className="mt-6 flex justify-between border-t border-slate-100 pt-4 text-sm text-slate-600">
            <span>Active Run Cycles: {data.active_run_cycles}</span>
            <span>Active Projects: {data.active_projects}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <span className="text-emerald-600">📈</span>
            <h2 className="text-sm font-semibold text-slate-900">Project Coverage</h2>
          </div>
          <ul className="space-y-4">
            {data.projects.map((p) => (
              <li key={p.id}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium text-slate-800">{p.code}</span>
                  <span className="tabular-nums text-slate-600">{Math.round(p.requirement_coverage_pct)}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{ width: `${Math.min(100, p.requirement_coverage_pct)}%` }}
                  />
                </div>
              </li>
            ))}
            {data.projects.length === 0 && <li className="text-sm text-slate-500">No projects yet.</li>}
          </ul>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <span className="text-blue-600">📁</span>
            <h2 className="text-sm font-semibold text-slate-900">Projects Overview</h2>
          </div>
          <ul className="space-y-2">
            {data.projects.map((p, idx) => (
              <li key={p.id}>
                <Link
                  href={`/projects/${p.id}`}
                  className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-3 transition hover:bg-slate-50"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-100 text-sm font-bold text-blue-700">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900">{p.name}</p>
                    <p className="text-xs text-slate-500">
                      {p.test_cases_total} TCs · {p.executions_total} Executions
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-slate-700">{p.execution_pass_pct}% Pass</span>
                  <span className="text-slate-400">›</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-red-500">🐛</span>
              <h2 className="text-sm font-semibold text-slate-900">Recent Defects</h2>
            </div>
            {defectsListProjectId ? (
              <Link href={`/projects/${defectsListProjectId}/defects`} className="text-xs font-medium text-blue-600 hover:underline">
                View all
              </Link>
            ) : null}
          </div>
          <ul className="space-y-3">
            {data.recent_defects.map((d) => {
              const st = statusStyles(d.status);
              return (
                <li key={`${d.code}-${d.created_at}`} className="border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                  <Link href={`/projects/${d.project_id}/defects`} className="group block">
                    <p className="text-sm font-medium text-slate-900 group-hover:text-blue-600">
                      {d.code} · {d.title.length > 42 ? `${d.title.slice(0, 42)}…` : d.title}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-slate-400">
                        {new Date(d.created_at).toLocaleDateString(undefined, {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${severityStyles(d.severity)}`}
                      >
                        {d.severity.replace("_", " ")}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${st.pill}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                        {d.status.replace("_", " ")}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
            {data.recent_defects.length === 0 && <li className="text-sm text-slate-500">No defects yet.</li>}
          </ul>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <span className="text-emerald-600">▶</span>
            <h2 className="text-sm font-semibold text-slate-900">Recent Executions</h2>
          </div>
          <ul className="space-y-3">
            {data.recent_executions.map((e) => {
              const st = execResultStyles(e.status);
              return (
                <li key={e.code} className="border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                  <Link href={`/projects/${e.project_id}/executions`} className="group block">
                    <p className="text-sm font-medium text-slate-900 group-hover:text-blue-600">
                      {e.code} · {e.test_case_code}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">{e.test_case_title || "—"}</p>
                    <span
                      className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${st.pill}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                      {e.status.replace("_", " ")}
                    </span>
                  </Link>
                </li>
              );
            })}
            {data.recent_executions.length === 0 && <li className="text-sm text-slate-500">No executions yet.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
