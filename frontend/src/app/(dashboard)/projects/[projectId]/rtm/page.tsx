"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ModuleSubmoduleSelect } from "@/components/modules/module-submodule-select";
import { apiFetch } from "@/lib/api";
import { moduleCellLabel } from "@/lib/module-display";
import { REQUIREMENT_STATUS, REQUIREMENT_STATUS_LABEL } from "@/lib/qa-options";
import { lastRunDotClass, priorityPillClass } from "@/lib/test-case-presentation";
import type { ModuleFlat, RTMProjectSummary, RTMRequirementRow } from "@/types/api";

function rtmHealthLabel(row: RTMRequirementRow): { label: string; tone: "pass" | "fail" | "muted" } {
  if (row.linked_test_case_count === 0) {
    return { label: "Not covered", tone: "muted" };
  }
  const failing = row.fail_count > 0 || row.latest_status === "fail";
  const passing = row.pass_count > 0 && row.fail_count === 0;
  if (passing) return { label: "Passing", tone: "pass" };
  if (failing) return { label: "Failing", tone: "fail" };
  return { label: "Pending", tone: "muted" };
}

export default function RTMPage() {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params.projectId as string;

  const moduleIdParam = searchParams.get("module_id") ?? "";
  const statusParam = searchParams.get("status") ?? "";

  const [modules, setModules] = useState<ModuleFlat[]>([]);
  const [reqRows, setReqRows] = useState<RTMRequirementRow[]>([]);
  const [proj, setProj] = useState<RTMProjectSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (moduleIdParam) p.set("module_id", moduleIdParam);
    if (statusParam) p.set("status", statusParam);
    const s = p.toString();
    return s ? `?${s}` : "";
  }, [moduleIdParam, statusParam]);

  const load = useCallback(async () => {
    const [r, p] = await Promise.all([
      apiFetch<RTMRequirementRow[]>(`/api/v1/projects/${projectId}/rtm/requirements${queryString}`),
      apiFetch<RTMProjectSummary>(`/api/v1/projects/${projectId}/rtm/project-summary${queryString}`),
    ]);
    setReqRows(r);
    setProj(p);
  }, [projectId, queryString]);

  useEffect(() => {
    void apiFetch<ModuleFlat[]>(`/api/v1/projects/${projectId}/modules`)
      .then(setModules)
      .catch(() => {});
  }, [projectId]);

  useEffect(() => {
    setLoading(true);
    void load()
      .then(() => setError(null))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, [load]);

  const setFilter = (key: "module_id" | "status", value: string) => {
    const p = new URLSearchParams(searchParams.toString());
    if (value) p.set(key, value);
    else p.delete(key);
    const qs = p.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <svg
              className="h-6 w-6 shrink-0 text-blue-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            <h1 className="text-xl font-semibold tracking-tight text-ink">Requirement Traceability Matrix</h1>
          </div>
          <p className="mt-1 text-sm text-ink-muted">
            Auto-generated from linked requirements, test cases, and executions
          </p>
        </div>
      </div>

      {proj && !loading && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: "Total Requirements", value: proj.requirement_total, valueClass: "text-ink" },
            {
              label: "TC Coverage",
              value: `${proj.requirement_tc_coverage_pct.toFixed(0)}%`,
              valueClass: "text-blue-600",
            },
            { label: "All Passing", value: proj.passing_requirements, valueClass: "text-emerald-600" },
            { label: "Failing", value: proj.failing_requirements, valueClass: "text-red-600" },
            {
              label: "Not Covered",
              value: proj.not_covered_requirements,
              valueClass: "text-ink-muted",
            },
          ].map((c) => (
            <div key={c.label} className="rounded-xl border border-border bg-surface p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">{c.label}</p>
              <p className={`mt-1 text-2xl font-semibold tabular-nums ${c.valueClass}`}>{c.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-[12rem]">
          <ModuleSubmoduleSelect
            variant="filter"
            modules={modules}
            value={moduleIdParam === "" ? null : Number(moduleIdParam)}
            onChange={(id) => setFilter("module_id", id == null ? "" : String(id))}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-muted">
          <span className="sr-only">Status</span>
          <select
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink shadow-sm"
            value={statusParam}
            onChange={(e) => setFilter("status", e.target.value)}
          >
            <option value="">All Status</option>
            {REQUIREMENT_STATUS.map((s) => (
              <option key={s} value={s}>
                {REQUIREMENT_STATUS_LABEL[s] ?? s}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading && <p className="text-sm text-ink-muted">Loading…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-sm">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-surface-muted/80 text-xs uppercase text-ink-muted">
              <tr>
                <th className="whitespace-nowrap px-3 py-2.5 font-semibold">Req ID</th>
                <th className="min-w-[180px] px-3 py-2.5 font-semibold">Title</th>
                <th className="whitespace-nowrap px-3 py-2.5 font-semibold">Module</th>
                <th className="whitespace-nowrap px-3 py-2.5 font-semibold">Priority</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-center font-semibold">TCS</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-center font-semibold">EXES</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-center font-semibold text-emerald-700">Pass</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-center font-semibold text-red-700">Fail</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-center font-semibold text-amber-800">Block</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-center font-semibold">Defects</th>
                <th className="min-w-[120px] px-3 py-2.5 font-semibold">Coverage</th>
                <th className="whitespace-nowrap px-3 py-2.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {reqRows.map((r) => {
                const health = rtmHealthLabel(r);
                return (
                  <tr key={r.requirement_id} className="border-t border-border">
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <Link
                        href={`/projects/${projectId}/requirements/${r.requirement_id}`}
                        className="font-mono text-xs font-medium text-blue-600 hover:underline"
                      >
                        {r.code}
                      </Link>
                    </td>
                    <td className="max-w-xs truncate px-3 py-2.5 text-ink" title={r.title}>
                      {r.title}
                    </td>
                    <td className="max-w-[16rem] px-3 py-2.5 text-ink-muted">
                      {(() => {
                        const label = moduleCellLabel(r.module_id, modules, r.module_name);
                        return label ? (
                          <span className="line-clamp-2 break-words" title={label}>
                            {label}
                          </span>
                        ) : (
                          "—"
                        );
                      })()}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${priorityPillClass(r.priority)}`}
                      >
                        {r.priority}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center tabular-nums text-ink">{r.linked_test_case_count}</td>
                    <td className="px-3 py-2.5 text-center tabular-nums text-ink">{r.execution_count}</td>
                    <td className="px-3 py-2.5 text-center tabular-nums text-emerald-600">{r.pass_count}</td>
                    <td className="px-3 py-2.5 text-center tabular-nums text-red-600">{r.fail_count}</td>
                    <td className="px-3 py-2.5 text-center tabular-nums text-amber-700">{r.blocked_count}</td>
                    <td className="px-3 py-2.5 text-center tabular-nums text-ink">
                      {r.open_defects + r.closed_defects > 0 ? (
                        <span title={`Open ${r.open_defects}, closed ${r.closed_defects}`}>
                          {r.open_defects}
                          {r.closed_defects > 0 ? (
                            <span className="text-ink-muted"> / {r.closed_defects}</span>
                          ) : null}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-2 min-w-[72px] flex-1 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-[width]"
                            style={{ width: `${Math.min(100, Math.max(0, r.coverage_pct))}%` }}
                          />
                        </div>
                        <span className="w-10 text-right text-xs tabular-nums text-ink-muted">
                          {r.coverage_pct.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                          health.tone === "pass"
                            ? "bg-emerald-50 text-emerald-800 ring-emerald-100"
                            : health.tone === "fail"
                              ? "bg-red-50 text-red-800 ring-red-100"
                              : "bg-slate-100 text-slate-600 ring-slate-200"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            health.tone === "pass"
                              ? "bg-emerald-500"
                              : health.tone === "fail"
                                ? "bg-red-500"
                                : "bg-slate-400"
                          }`}
                        />
                        {health.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {reqRows.length === 0 && (
            <p className="border-t border-border px-4 py-8 text-center text-sm text-ink-muted">
              No requirements match the current filters.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
