"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { moduleCellLabel } from "@/lib/module-display";
import {
  priorityPillClass,
  requirementPriorityLabel,
  requirementStatusLabel,
  statusDotClass,
} from "@/lib/requirement-presentation";
import { PRIORITY, REQUIREMENT_STATUS, REQUIREMENT_STATUS_LABEL } from "@/lib/qa-options";
import { useProjectRole } from "@/hooks/use-project-role";
import type { ModuleFlat, RequirementListItem } from "@/types/api";

function IconSearch({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15zM16.3 16.3L21 21"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconEye({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function IconPencil({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 20h9M4 13l8-8a2 2 0 013 3l-8 8H4v-3z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconLink({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M10 13a5 5 0 007.07 0l1-1a5 5 0 00-7.07-7.07l-1.5 1.5M14 11a5 5 0 00-7.07 0l-1 1a5 5 0 007.07 7.07l1.5-1.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function RequirementsListPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { isAdmin } = useProjectRole(projectId);
  const [rows, setRows] = useState<RequirementListItem[]>([]);
  const [allCount, setAllCount] = useState(0);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modules, setModules] = useState<ModuleFlat[]>([]);

  useEffect(() => {
    void apiFetch<ModuleFlat[]>(`/api/v1/projects/${projectId}/modules`)
      .then(setModules)
      .catch(() => {});
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;
    void apiFetch<RequirementListItem[]>(`/api/v1/projects/${projectId}/requirements`)
      .then((r) => {
        if (!cancelled) setAllCount(r.length);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const load = useCallback(async () => {
    const qs = new URLSearchParams();
    if (q.trim()) qs.set("q", q.trim());
    if (statusFilter) qs.set("status", statusFilter);
    if (priorityFilter) qs.set("priority", priorityFilter);
    const path = `/api/v1/projects/${projectId}/requirements${qs.toString() ? `?${qs}` : ""}`;
    const list = await apiFetch<RequirementListItem[]>(path);
    setRows(list);
  }, [projectId, q, statusFilter, priorityFilter]);

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
      const all = await apiFetch<RequirementListItem[]>(`/api/v1/projects/${projectId}/requirements`);
      setAllCount(all.length);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Delete failed");
    }
  }

  const subtitle =
    allCount > 0 ? `${rows.length} of ${allCount} requirements` : `${rows.length} requirements`;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Requirements</h1>
          <p className="mt-1 text-sm text-slate-500">{loading ? "Loading…" : subtitle}</p>
        </div>
        {isAdmin && (
          <Link
            href={`/projects/${projectId}/requirements/new`}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            + New Requirement
          </Link>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <IconSearch className="h-4 w-4" />
          </span>
          <input
            type="search"
            placeholder="Search requirements..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Status</option>
          {REQUIREMENT_STATUS.map((s) => (
            <option key={s} value={s}>
              {REQUIREMENT_STATUS_LABEL[s] ?? s}
            </option>
          ))}
        </select>
        <select
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
        >
          <option value="">All Priority</option>
          {PRIORITY.map((p) => (
            <option key={p} value={p}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

      {loading && <p className="mt-8 text-sm text-slate-500">Loading…</p>}

      {!loading && !error && (
        <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Module</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">TCS</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80">
                    <td className="whitespace-nowrap px-4 py-4">
                      <Link
                        href={`/projects/${projectId}/requirements/${r.id}`}
                        className="font-mono text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {r.code}
                      </Link>
                    </td>
                    <td className="max-w-md px-4 py-4">
                      <Link
                        href={`/projects/${projectId}/requirements/${r.id}`}
                        className="font-medium text-slate-900 hover:text-blue-600"
                      >
                        {r.title}
                      </Link>
                      {r.tags && r.tags.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {r.tags.map((t) => (
                            <span
                              key={t}
                              className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      {(() => {
                        const label = moduleCellLabel(r.module_id, modules, r.module_name);
                        return label ? (
                          <span className="max-w-[14rem] truncate rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700" title={label}>
                            {label}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        );
                      })()}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${priorityPillClass(r.priority)}`}
                      >
                        {requirementPriorityLabel(r.priority)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <span className="inline-flex items-center gap-1.5 text-sm text-slate-700">
                        <span className={`h-2 w-2 rounded-full ${statusDotClass(r.status)}`} />
                        {requirementStatusLabel(r.status)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <span className="inline-flex items-center gap-1 font-mono text-sm tabular-nums text-slate-600">
                        <IconLink className="text-slate-400" />
                        {r.linked_test_case_count}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/projects/${projectId}/requirements/${r.id}`}
                          className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                          title="View"
                        >
                          <IconEye />
                        </Link>
                        {isAdmin ? (
                          <Link
                            href={`/projects/${projectId}/requirements/${r.id}/edit`}
                            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                            title="Edit"
                          >
                            <IconPencil />
                          </Link>
                        ) : (
                          <span className="w-[34px]" aria-hidden />
                        )}
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => void removeRequirement(r.id)}
                            className="rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length === 0 && (
            <p className="px-4 py-12 text-center text-sm text-slate-500">No requirements match your filters.</p>
          )}
        </div>
      )}
    </div>
  );
}
