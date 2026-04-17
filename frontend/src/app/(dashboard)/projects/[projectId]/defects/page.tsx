"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ReportDefectModal } from "@/components/defects/report-defect-modal";
import { apiFetch, ApiError } from "@/lib/api";
import { formatModulePath } from "@/lib/module-display";
import { DEFECT_STATUS, PRIORITY, SEVERITY } from "@/lib/qa-options";
import {
  defectStatusDotClass,
  defectStatusLabel,
  defectStatusPillClass,
  priorityLabel,
  priorityPillClass,
  severityLabel,
  severityPillClass,
} from "@/lib/test-case-presentation";
import { useProjectRole } from "@/hooks/use-project-role";
import type { Defect, ModuleFlat } from "@/types/api";

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function DefectsPage() {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params.projectId as string;
  const { isAdmin } = useProjectRole(projectId);
  const [reportOpen, setReportOpen] = useState(false);

  const qParam = searchParams.get("q") ?? "";
  const statusParam = searchParams.get("status") ?? "";
  const severityParam = searchParams.get("severity") ?? "";
  const priorityParam = searchParams.get("priority") ?? "";

  const [rows, setRows] = useState<Defect[]>([]);
  const [modules, setModules] = useState<ModuleFlat[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchDraft, setSearchDraft] = useState(qParam);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (qParam.trim()) p.set("q", qParam.trim());
    if (statusParam) p.set("status", statusParam);
    if (severityParam) p.set("severity", severityParam);
    if (priorityParam) p.set("priority", priorityParam);
    const s = p.toString();
    return s ? `?${s}` : "";
  }, [qParam, statusParam, severityParam, priorityParam]);

  const load = useCallback(async () => {
    const list = await apiFetch<Defect[]>(`/api/v1/projects/${projectId}/defects${queryString}`);
    setRows(list);
  }, [projectId, queryString]);

  useEffect(() => {
    void apiFetch<ModuleFlat[]>(`/api/v1/projects/${projectId}/modules`)
      .then(setModules)
      .catch(() => {});
  }, [projectId]);

  useEffect(() => {
    setSearchDraft(qParam);
  }, [qParam]);

  useEffect(() => {
    setLoading(true);
    void load()
      .then(() => setError(null))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, [load]);

  const setFilter = (key: "q" | "status" | "severity" | "priority", value: string) => {
    const p = new URLSearchParams(searchParams.toString());
    if (key === "q") {
      if (value.trim()) p.set("q", value.trim());
      else p.delete("q");
    } else {
      if (value) p.set(key, value);
      else p.delete(key);
    }
    const qs = p.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const kpis = useMemo(() => {
    const open = rows.filter((d) => d.status === "open").length;
    const inProgress = rows.filter((d) => d.status === "in_progress").length;
    const done = rows.filter((d) => ["resolved", "closed", "duplicate"].includes(d.status)).length;
    return { total: rows.length, open, inProgress, done };
  }, [rows]);

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
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <svg
              className="h-6 w-6 shrink-0 text-blue-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
            <h1 className="text-xl font-semibold tracking-tight text-ink">Defects</h1>
          </div>
          <p className="mt-1 text-sm text-ink-muted">
            Track issues linked to requirements, test cases, and executions.
          </p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setReportOpen(true)}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            Report defect
          </button>
        )}
      </div>

      {!loading && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "In view", value: kpis.total, valueClass: "text-ink" },
            { label: "Open", value: kpis.open, valueClass: "text-red-600" },
            { label: "In progress", value: kpis.inProgress, valueClass: "text-amber-700" },
            { label: "Resolved / closed", value: kpis.done, valueClass: "text-emerald-600" },
          ].map((c) => (
            <div key={c.label} className="rounded-xl border border-border bg-surface p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">{c.label}</p>
              <p className={`mt-1 text-2xl font-semibold tabular-nums ${c.valueClass}`}>{c.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
        <div className="relative min-w-[200px] flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3-3" strokeLinecap="round" />
            </svg>
          </span>
          <input
            type="search"
            placeholder="Search by ID or title…"
            className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm text-ink shadow-sm outline-none ring-blue-500/30 placeholder:text-ink-muted focus:ring-2"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setFilter("q", searchDraft);
            }}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-ink shadow-sm"
            value={statusParam}
            onChange={(e) => setFilter("status", e.target.value)}
          >
            <option value="">All statuses</option>
            {DEFECT_STATUS.map((s) => (
              <option key={s} value={s}>
                {defectStatusLabel(s)}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-ink shadow-sm"
            value={severityParam}
            onChange={(e) => setFilter("severity", e.target.value)}
          >
            <option value="">All severities</option>
            {SEVERITY.map((s) => (
              <option key={s} value={s}>
                {severityLabel(s)}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-ink shadow-sm"
            value={priorityParam}
            onChange={(e) => setFilter("priority", e.target.value)}
          >
            <option value="">All priorities</option>
            {PRIORITY.map((p) => (
              <option key={p} value={p}>
                {priorityLabel(p)}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="h-10 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-ink-muted shadow-sm hover:bg-surface-muted/80"
            onClick={() => setFilter("q", searchDraft)}
          >
            Apply search
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-ink-muted">Loading…</p>}

      {isAdmin && (
        <ReportDefectModal
          open={reportOpen}
          onClose={() => setReportOpen(false)}
          projectId={projectId}
          onCreated={(d) => {
            setReportOpen(false);
            router.push(`/projects/${projectId}/defects/${d.id}`);
          }}
        />
      )}

      {!loading && (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-sm">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-surface-muted/80 text-xs uppercase text-ink-muted">
              <tr>
                <th className="whitespace-nowrap px-3 py-2.5 font-semibold">Defect ID</th>
                <th className="min-w-[200px] px-3 py-2.5 font-semibold">Title</th>
                <th className="whitespace-nowrap px-3 py-2.5 font-semibold">Module</th>
                <th className="whitespace-nowrap px-3 py-2.5 font-semibold">Severity</th>
                <th className="whitespace-nowrap px-3 py-2.5 font-semibold">Priority</th>
                <th className="whitespace-nowrap px-3 py-2.5 font-semibold">Status</th>
                <th className="whitespace-nowrap px-3 py-2.5 font-semibold">Reported</th>
                {isAdmin && <th className="whitespace-nowrap px-3 py-2.5 text-right font-semibold">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.id} className="border-t border-border">
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <Link
                      href={`/projects/${projectId}/defects/${d.id}`}
                      className="font-mono text-xs font-medium text-blue-600 hover:underline"
                    >
                      {d.code}
                    </Link>
                  </td>
                  <td className="max-w-xs px-3 py-2.5">
                    <Link
                      href={`/projects/${projectId}/defects/${d.id}`}
                      className="font-medium text-ink hover:text-blue-600"
                    >
                      <span className="line-clamp-2">{d.title}</span>
                    </Link>
                  </td>
                  <td className="max-w-[14rem] whitespace-nowrap px-3 py-2.5 text-ink-muted">
                    {(() => {
                      const label = formatModulePath(d.module_id, modules);
                      return label ? (
                        <span className="truncate" title={label}>
                          {label}
                        </span>
                      ) : (
                        "—"
                      );
                    })()}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${severityPillClass(d.severity)}`}
                    >
                      {d.severity}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${priorityPillClass(d.priority)}`}
                    >
                      {d.priority}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${defectStatusPillClass(d.status)}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${defectStatusDotClass(d.status)}`} />
                      {defectStatusLabel(d.status)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-ink-muted">
                    {formatDate(d.created_at)}
                  </td>
                  {isAdmin && (
                    <td className="whitespace-nowrap px-3 py-2.5 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Link
                          href={`/projects/${projectId}/defects/${d.id}`}
                          className="text-sm font-medium text-blue-600 hover:underline"
                        >
                          View
                        </Link>
                        <button
                          type="button"
                          onClick={() => void removeDefect(d.id)}
                          className="text-sm font-medium text-red-600 hover:underline"
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
            <p className="border-t border-border px-4 py-10 text-center text-sm text-ink-muted">
              No defects match the current filters.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
