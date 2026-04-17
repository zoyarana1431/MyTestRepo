"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { moduleCellLabel } from "@/lib/module-display";
import {
  priorityPillClass,
  requirementPriorityLabel,
  requirementStatusLabel,
  statusDotClass,
  tcStatusBadgeClass,
} from "@/lib/requirement-presentation";
import { useProjectRole } from "@/hooks/use-project-role";
import type { ModuleFlat, RequirementDetail } from "@/types/api";

function BackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function formatShortDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function RequirementDetailPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const requirementId = params.requirementId as string;
  const router = useRouter();
  const { isAdmin, loading: roleLoading } = useProjectRole(projectId);

  const [detail, setDetail] = useState<RequirementDetail | null>(null);
  const [modules, setModules] = useState<ModuleFlat[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [d, mods] = await Promise.all([
      apiFetch<RequirementDetail>(`/api/v1/projects/${projectId}/requirements/${requirementId}`),
      apiFetch<ModuleFlat[]>(`/api/v1/projects/${projectId}/modules`),
    ]);
    setDetail(d);
    setModules(mods);
  }, [projectId, requirementId]);

  useEffect(() => {
    void load()
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [load]);

  async function remove() {
    if (!isAdmin || !detail) return;
    if (!window.confirm(`Delete requirement ${detail.code}?`)) return;
    try {
      await apiFetch(`/api/v1/projects/${projectId}/requirements/${requirementId}`, { method: "DELETE" });
      router.replace(`/projects/${projectId}/requirements`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Delete failed");
    }
  }

  if (loading || !detail) {
    return <p className="text-sm text-slate-500">{error ?? "Loading…"}</p>;
  }

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        href={`/projects/${projectId}/requirements`}
        className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
      >
        <BackIcon />
        Requirements
      </Link>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-6">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-semibold text-blue-600">{detail.code}</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-800 ring-1 ring-inset ring-slate-200">
              <span className={`h-1.5 w-1.5 rounded-full ${statusDotClass(detail.status)}`} />
              {requirementStatusLabel(detail.status)}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${priorityPillClass(detail.priority)}`}
            >
              {requirementPriorityLabel(detail.priority)}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{detail.title}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAdmin && !roleLoading && (
            <>
              <Link
                href={`/projects/${projectId}/requirements/${requirementId}/edit`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
              >
                Edit
              </Link>
              <button
                type="button"
                onClick={() => void remove()}
                className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </header>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Description</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
              {detail.description?.trim() ? detail.description : "No description provided."}
            </p>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Linked Test Cases ({detail.test_cases.length})</h2>
            <ul className="mt-4 space-y-3">
              {detail.test_cases.length === 0 && (
                <li className="text-sm text-slate-500">No test cases linked yet. Use Edit to link test cases.</li>
              )}
              {detail.test_cases.map((tc) => (
                <li key={tc.id} className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                  <Link
                    href={`/projects/${projectId}/test-cases/${tc.id}`}
                    className="min-w-0 flex-1 text-sm font-medium text-blue-600 hover:underline"
                  >
                    <span className="font-mono text-xs text-slate-500">{tc.code}</span>{" "}
                    <span className="text-slate-900">{tc.title}</span>
                  </Link>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${priorityPillClass(tc.priority ?? "medium")}`}
                  >
                    {requirementPriorityLabel(tc.priority ?? "medium")}
                  </span>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${tcStatusBadgeClass(tc.status)}`}
                  >
                    {tc.status}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Comments (0)</h2>
            <p className="mt-3 text-sm text-slate-500">No comments yet.</p>
            <p className="mt-4 text-xs text-slate-400">Comments will be available in a future update.</p>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Details</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Status</dt>
                <dd className="font-medium text-slate-800">{requirementStatusLabel(detail.status)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Priority</dt>
                <dd className="font-medium text-slate-800">{requirementPriorityLabel(detail.priority)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Module</dt>
                <dd className="max-w-[60%] text-right font-medium text-slate-800">
                  {moduleCellLabel(detail.module_id, modules, detail.module_name) || "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Source</dt>
                <dd className="text-right text-slate-800">{detail.source_reference ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Created</dt>
                <dd className="text-slate-800">{formatShortDate(detail.created_at)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Updated</dt>
                <dd className="text-slate-800">{formatShortDate(detail.updated_at)}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Tags</h2>
            {detail.tags && detail.tags.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {detail.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-800 ring-1 ring-inset ring-blue-100"
                  >
                    {t}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">No tags</p>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Coverage Summary</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Linked TCs</dt>
                <dd className="font-semibold tabular-nums text-slate-900">{detail.test_cases.length}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Defects (open)</dt>
                <dd
                  className={`font-semibold tabular-nums ${(detail.open_defects_count ?? 0) > 0 ? "text-red-600" : "text-slate-900"}`}
                >
                  {detail.open_defects_count ?? 0}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Total Executions</dt>
                <dd className="font-semibold tabular-nums text-slate-900">{detail.total_executions_count ?? 0}</dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}
