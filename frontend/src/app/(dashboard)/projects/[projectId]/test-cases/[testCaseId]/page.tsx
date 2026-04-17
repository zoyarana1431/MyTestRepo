"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ApiError, apiFetch } from "@/lib/api";
import { formatModulePath } from "@/lib/module-display";
import {
  lastRunDotClass,
  lastRunLabel,
  lastRunPillClass,
  parseTestScenarioBody,
  priorityLabel,
  priorityPillClass,
  severityLabel,
  severityPillClass,
  testTypeLabel,
} from "@/lib/test-case-presentation";
import { TEST_CASE_STATUS_LABEL } from "@/lib/qa-options";
import { TestCaseDefectsTab } from "@/components/test-cases/test-case-defects-tab";
import { useProjectRole } from "@/hooks/use-project-role";
import type { Defect, ExecutionListItem, ModuleFlat, TestCaseDetail } from "@/types/api";

type TabId = "steps" | "executions" | "defects" | "comments";

function BackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M8 5v14l11-7-11-7z" fill="currentColor" />
    </svg>
  );
}

function PencilIcon({ className }: { className?: string }) {
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

function formatShortDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function statusBadgeClass(status: string) {
  const s = status.toLowerCase();
  if (s === "ready" || s === "approved") return "bg-emerald-50 text-emerald-800 ring-emerald-100";
  if (s === "draft") return "bg-slate-100 text-slate-700 ring-slate-200";
  if (s === "obsolete") return "bg-amber-50 text-amber-900 ring-amber-100";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function statusDotClass(status: string) {
  const s = status.toLowerCase();
  if (s === "ready" || s === "approved") return "bg-emerald-500";
  if (s === "obsolete") return "bg-amber-500";
  return "bg-slate-400";
}

export default function TestCaseViewPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const testCaseId = params.testCaseId as string;
  const { isAdmin, loading: roleLoading } = useProjectRole(projectId);

  const [detail, setDetail] = useState<TestCaseDetail | null>(null);
  const [modules, setModules] = useState<ModuleFlat[]>([]);
  const [executions, setExecutions] = useState<ExecutionListItem[]>([]);
  const [defects, setDefects] = useState<Defect[]>([]);
  const [tab, setTab] = useState<TabId>("steps");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingExeId, setDeletingExeId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const id = Number(testCaseId);
    if (Number.isNaN(id)) {
      setError("Invalid test case");
      return;
    }
    const [d, mods, ex, df] = await Promise.all([
      apiFetch<TestCaseDetail>(`/api/v1/projects/${projectId}/test-cases/${testCaseId}`),
      apiFetch<ModuleFlat[]>(`/api/v1/projects/${projectId}/modules`),
      apiFetch<ExecutionListItem[]>(`/api/v1/projects/${projectId}/executions?test_case_id=${id}`),
      apiFetch<Defect[]>(`/api/v1/projects/${projectId}/defects?test_case_id=${id}`),
    ]);
    setDetail(d);
    setModules(mods);
    setExecutions(ex);
    setDefects(df);
  }, [projectId, testCaseId]);

  useEffect(() => {
    void load()
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [load]);

  const listHref = `/projects/${projectId}/test-cases`;
  const editHref = `/projects/${projectId}/test-cases/${testCaseId}/edit`;
  const executeHref = `/projects/${projectId}/executions/new?test_case_id=${testCaseId}`;

  if (loading) {
    return <p className="text-sm text-slate-500">Loading…</p>;
  }

  if (error || !detail) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-600">{error ?? "Not found"}</p>
        <Link href={listHref} className="text-sm text-blue-600 hover:underline">
          ← Test cases
        </Link>
      </div>
    );
  }

  const { title: displayTitle, scenarioLine: scenarioLine } = parseTestScenarioBody(detail.test_scenario);
  const heading = displayTitle.trim() || detail.code;
  const moduleDisplay =
    detail.module_id != null ? formatModulePath(detail.module_id, modules) || null : null;

  const sortedSteps = [...detail.steps].sort((a, b) => a.step_number - b.step_number);

  async function deleteExecutionRow(item: ExecutionListItem) {
    if (!isAdmin) return;
    if (
      !window.confirm(
        `Delete execution ${item.code}? This removes the record and any attached evidence files.`,
      )
    ) {
      return;
    }
    setDeletingExeId(item.id);
    try {
      await apiFetch(`/api/v1/projects/${projectId}/executions/${item.id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      window.alert(e instanceof ApiError ? e.message : "Failed to delete execution");
    } finally {
      setDeletingExeId(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl pb-16">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={listHref}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              aria-label="Back to test cases"
            >
              <BackIcon />
            </Link>
            <span className="inline-flex items-center rounded-md bg-fuchsia-100 px-2 py-0.5 font-mono text-xs font-semibold text-fuchsia-900">
              {detail.code}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statusBadgeClass(detail.status)}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${statusDotClass(detail.status)}`} />
              {TEST_CASE_STATUS_LABEL[detail.status] ?? detail.status}
            </span>
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${priorityPillClass(detail.priority)}`}
            >
              {priorityLabel(detail.priority)}
            </span>
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${severityPillClass(detail.severity)}`}
            >
              {severityLabel(detail.severity)}
            </span>
            {detail.is_reusable && (
              <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-800 ring-1 ring-inset ring-teal-100">
                Reusable
              </span>
            )}
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{heading}</h1>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            href={executeHref}
            className="inline-flex items-center gap-2 rounded-lg border-2 border-emerald-500 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 shadow-sm hover:bg-emerald-50"
          >
            <PlayIcon />
            Execute
          </Link>
          {!roleLoading && isAdmin && (
            <Link
              href={editHref}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
            >
              <PencilIcon />
              Edit
            </Link>
          )}
        </div>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Feature</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{detail.feature_name?.trim() || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Test scenario</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{scenarioLine.trim() || "—"}</p>
              </div>
            </div>
            {detail.description?.trim() && (
              <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Description</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{detail.description}</p>
              </div>
            )}
            {detail.preconditions?.trim() && (
              <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50/80 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-amber-800">Preconditions</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-amber-950/90">{detail.preconditions}</p>
              </div>
            )}
            {detail.expected_result_summary?.trim() && (
              <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/80 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-900">Expected result summary</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-emerald-950/90">{detail.expected_result_summary}</p>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap gap-1 border-b border-slate-100 px-4 pt-2">
              {(
                [
                  ["steps", `Steps (${sortedSteps.length})`],
                  ["executions", `Executions (${executions.length})`],
                  ["defects", `Defects (${defects.length})`],
                  ["comments", "Comments (0)"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`relative px-3 py-3 text-sm font-semibold transition-colors ${
                    tab === id ? "text-blue-600" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {label}
                  {tab === id && <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-blue-600" />}
                </button>
              ))}
            </div>

            <div className="p-6">
              {tab === "steps" && (
                <div className="space-y-8">
                  {sortedSteps.length === 0 && <p className="text-sm text-slate-500">No steps defined.</p>}
                  {sortedSteps.map((st) => (
                    <div key={st.id} className="flex gap-4">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                        {st.step_number}
                      </div>
                      <div className="min-w-0 flex-1 space-y-3">
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Action</p>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-900">{st.action}</p>
                        </div>
                        {st.test_data?.trim() && (
                          <div>
                            <p className="text-[11px] font-bold uppercase tracking-wide text-blue-600">Test data</p>
                            <div className="mt-1 rounded-md bg-sky-50 px-3 py-2 text-sm text-slate-800 ring-1 ring-sky-100">
                              {st.test_data}
                            </div>
                          </div>
                        )}
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">Expected result</p>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-emerald-800">
                            {st.expected_result?.trim() || "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {tab === "executions" && (
                <div className="space-y-3">
                  {executions.length === 0 && <p className="text-sm text-slate-500">No executions logged for this test case.</p>}
                  {executions.map((ex) => (
                    <div
                      key={ex.id}
                      className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/50 px-4 py-3 text-sm"
                    >
                      <Link
                        href={`/projects/${projectId}/executions/${ex.id}`}
                        className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-2 hover:opacity-90"
                      >
                        <span className="font-mono font-semibold text-violet-700">{ex.code}</span>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${lastRunPillClass(ex.status)}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${lastRunDotClass(ex.status)}`} />
                          {lastRunLabel(ex.status)}
                        </span>
                        <span className="text-xs text-slate-500">{formatShortDate(ex.executed_at)}</span>
                      </Link>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => void deleteExecutionRow(ex)}
                          disabled={deletingExeId === ex.id}
                          className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          {deletingExeId === ex.id ? "…" : "Delete"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {tab === "defects" && (
                <TestCaseDefectsTab
                  projectId={projectId}
                  testCaseId={detail.id}
                  testCaseCode={detail.code}
                  defaultModuleId={detail.module_id}
                  requirements={detail.requirements}
                  isAdmin={!roleLoading && isAdmin}
                  onDefectsChanged={() => void load()}
                />
              )}

              {tab === "comments" && (
                <p className="text-sm text-slate-500">Comments are not available yet.</p>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900">Details</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-xs font-medium text-slate-500">Module</dt>
                <dd className="mt-0.5 text-slate-900">{moduleDisplay ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Test type</dt>
                <dd className="mt-1">
                  <span className="inline-flex rounded-md border border-blue-200 bg-white px-2 py-0.5 text-xs font-medium text-blue-700">
                    {testTypeLabel(detail.test_type)}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Priority</dt>
                <dd className="mt-1">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${priorityPillClass(detail.priority)}`}
                  >
                    {priorityLabel(detail.priority)}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Severity</dt>
                <dd className="mt-1">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${severityPillClass(detail.severity)}`}
                  >
                    {severityLabel(detail.severity)}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Platform</dt>
                <dd className="mt-0.5 text-slate-900">{detail.platform?.trim() || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Environment</dt>
                <dd className="mt-0.5 text-slate-900">{detail.environment?.trim() || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Created</dt>
                <dd className="mt-0.5 text-slate-900">{formatShortDate(detail.created_at)}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900">Requirements ({detail.requirements.length})</h2>
            <ul className="mt-3 space-y-2">
              {detail.requirements.length === 0 && <li className="text-sm text-slate-500">None linked.</li>}
              {detail.requirements.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/projects/${projectId}/requirements/${r.id}`}
                    className="text-sm font-medium text-blue-600 hover:underline"
                  >
                    {r.code} {r.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900">Tags</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {(detail.tags ?? []).length === 0 && <p className="text-sm text-slate-500">No tags.</p>}
              {(detail.tags ?? []).map((t) => (
                <span
                  key={t}
                  className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-800"
                >
                  {t}
                </span>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
