"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { moduleCellLabel } from "@/lib/module-display";
import {
  lastRunDotClass,
  lastRunLabel,
  lastRunPillClass,
  priorityLabel,
  priorityPillClass,
  severityLabel,
  severityPillClass,
  testCaseListHeading,
  testTypeLabel,
} from "@/lib/test-case-presentation";
import { PRIORITY, TEST_CASE_STATUS, TEST_CASE_TYPE, TEST_CASE_TYPE_LABEL } from "@/lib/qa-options";
import { useProjectRole } from "@/hooks/use-project-role";
import type { ModuleFlat, TestCaseListItem } from "@/types/api";

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

function IconEye() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function IconPencil() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
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

function IconDuplicate() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="8" y="8" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="2" />
      <rect x="4" y="4" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export default function TestCasesListPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const router = useRouter();
  const { isAdmin } = useProjectRole(projectId);
  const [rows, setRows] = useState<TestCaseListItem[]>([]);
  const [allCount, setAllCount] = useState(0);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dupId, setDupId] = useState<number | null>(null);
  const [modules, setModules] = useState<ModuleFlat[]>([]);

  useEffect(() => {
    void apiFetch<ModuleFlat[]>(`/api/v1/projects/${projectId}/modules`)
      .then(setModules)
      .catch(() => {});
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;
    void apiFetch<TestCaseListItem[]>(`/api/v1/projects/${projectId}/test-cases`)
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
    if (typeFilter) qs.set("test_type", typeFilter);
    if (priorityFilter) qs.set("priority", priorityFilter);
    const path = `/api/v1/projects/${projectId}/test-cases${qs.toString() ? `?${qs}` : ""}`;
    const list = await apiFetch<TestCaseListItem[]>(path);
    setRows(list);
  }, [projectId, q, statusFilter, typeFilter, priorityFilter]);

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
      const all = await apiFetch<TestCaseListItem[]>(`/api/v1/projects/${projectId}/test-cases`);
      setAllCount(all.length);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Delete failed");
    }
  }

  async function duplicateTestCase(id: number) {
    if (!isAdmin) return;
    setDupId(id);
    setError(null);
    try {
      const d = await apiFetch<{ id: number }>(`/api/v1/projects/${projectId}/test-cases/${id}/duplicate`, {
        method: "POST",
      });
      router.push(`/projects/${projectId}/test-cases/${d.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Duplicate failed");
    } finally {
      setDupId(null);
    }
  }

  const subtitle =
    allCount > 0 ? `${rows.length} of ${allCount} test cases` : `${rows.length} test cases`;

  return (
    <div className="mx-auto max-w-[1200px]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Test Cases</h1>
          <p className="mt-1 text-sm text-slate-500">{loading ? "Loading…" : subtitle}</p>
        </div>
        {isAdmin && (
          <Link
            href={`/projects/${projectId}/test-cases/new`}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            + New Test Case
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
            placeholder="Search test cases..."
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
          {TEST_CASE_STATUS.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
        <select
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">All Types</option>
          {TEST_CASE_TYPE.map((t) => (
            <option key={t} value={t}>
              {TEST_CASE_TYPE_LABEL[t] ?? t}
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
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Title / Feature</th>
                  <th className="px-4 py-3">Module</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">Last run</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((tc) => {
                  const { primary, secondary } = testCaseListHeading(tc);
                  const last = tc.last_run_status;
                  return (
                    <tr key={tc.id} className="hover:bg-slate-50/80">
                      <td className="align-top px-4 py-4">
                        <Link
                          href={`/projects/${projectId}/test-cases/${tc.id}`}
                          className="font-mono text-sm font-semibold text-violet-600 hover:text-violet-800 hover:underline"
                        >
                          {tc.code}
                        </Link>
                        {tc.is_reusable && (
                          <div className="mt-1">
                            <span className="inline-block rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                              Reusable
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="max-w-xs px-4 py-4">
                        <Link
                          href={`/projects/${projectId}/test-cases/${tc.id}`}
                          className="font-semibold text-slate-900 hover:text-blue-600"
                        >
                          {primary}
                        </Link>
                        {secondary && <p className="mt-0.5 text-xs text-slate-500">{secondary}</p>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        {(() => {
                          const label = moduleCellLabel(tc.module_id, modules, tc.module_name);
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
                        <span className="inline-flex rounded-md border border-blue-200 bg-white px-2 py-0.5 text-xs font-medium text-blue-700">
                          {testTypeLabel(tc.test_type)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${priorityPillClass(tc.priority)}`}
                        >
                          {priorityLabel(tc.priority)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${severityPillClass(tc.severity)}`}
                        >
                          {severityLabel(tc.severity)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        {last ? (
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${lastRunPillClass(last)}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${lastRunDotClass(last)}`} />
                            {lastRunLabel(last)}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          <Link
                            href={`/projects/${projectId}/test-cases/${tc.id}`}
                            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                            title="View"
                          >
                            <IconEye />
                          </Link>
                          {isAdmin && (
                            <>
                              <Link
                                href={`/projects/${projectId}/test-cases/${tc.id}/edit`}
                                className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                                title="Edit"
                              >
                                <IconPencil />
                              </Link>
                              <button
                                type="button"
                                title="Duplicate"
                                disabled={dupId === tc.id}
                                onClick={() => void duplicateTestCase(tc.id)}
                                className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
                              >
                                <IconDuplicate />
                              </button>
                              <button
                                type="button"
                                onClick={() => void removeTestCase(tc.id)}
                                className="rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {rows.length === 0 && (
            <p className="px-4 py-12 text-center text-sm text-slate-500">No test cases match your filters.</p>
          )}
        </div>
      )}
    </div>
  );
}
