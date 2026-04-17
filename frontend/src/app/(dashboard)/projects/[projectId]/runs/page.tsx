"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { EXECUTION_CYCLE_STATUS, EXECUTION_CYCLE_STATUS_LABEL } from "@/lib/qa-options";
import { useProjectRole } from "@/hooks/use-project-role";
import type { ExecutionCycle, ExecutionCycleListItem } from "@/types/api";

function formatShortDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function cycleStatusPillClass(status: string) {
  const s = status.toLowerCase();
  if (s === "closed") return "bg-emerald-50 text-emerald-800 ring-emerald-100";
  if (s === "active") return "bg-orange-50 text-orange-800 ring-orange-100";
  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function dateInputToIso(dateStr: string): string | null {
  const t = dateStr.trim();
  if (!t) return null;
  return new Date(`${t}T12:00:00`).toISOString();
}

function IconCalendar({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M16 3v4M8 3v4M3 11h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconClose({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CreateCycleModal({
  projectId,
  open,
  onClose,
  onCreated,
}: {
  projectId: string;
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { isAdmin, loading: roleLoading } = useProjectRole(projectId);
  const [name, setName] = useState("");
  const [buildVersion, setBuildVersion] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("planned");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setBuildVersion("");
      setDescription("");
      setStartDate("");
      setEndDate("");
      setStatus("planned");
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin || roleLoading) return;
    setPending(true);
    setError(null);
    try {
      await apiFetch<ExecutionCycle>(`/api/v1/projects/${projectId}/execution-cycles`, {
        method: "POST",
        json: {
          name: name.trim(),
          build_version: buildVersion.trim() || null,
          description: description.trim() || null,
          start_date: dateInputToIso(startDate),
          end_date: dateInputToIso(endDate),
          status,
        },
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create cycle");
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-cycle-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
          <h2 id="create-cycle-title" className="text-lg font-bold text-slate-900">
            Create Execution Cycle
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <IconClose />
          </button>
        </div>
        <form onSubmit={(e) => void onSubmit(e)} className="space-y-4 px-6 py-5">
          <div>
            <label className="text-sm font-medium text-slate-800">
              Cycle Name <span className="text-red-500">*</span>
            </label>
            <input
              required
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Build 1 - Smoke Test"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-800">Build Version</label>
            <input
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={buildVersion}
              onChange={(e) => setBuildVersion(e.target.value)}
              placeholder="e.g. v2.4.0-build1"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-800">Description</label>
            <textarea
              className="mt-1.5 min-h-[88px] w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the purpose of this test cycle..."
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-800">Start Date</label>
              <input
                type="date"
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-800">End Date</label>
              <input
                type="date"
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-800">Status</label>
            <select
              className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {EXECUTION_CYCLE_STATUS.map((s) => (
                <option key={s} value={s}>
                  {EXECUTION_CYCLE_STATUS_LABEL[s] ?? s}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending || !isAdmin || roleLoading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {pending ? "Creating…" : "Create Cycle"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RunsPageInner() {
  const params = useParams();
  const projectId = params.projectId as string;
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAdmin } = useProjectRole(projectId);
  const [rows, setRows] = useState<ExecutionCycleListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    const list = await apiFetch<ExecutionCycleListItem[]>(`/api/v1/projects/${projectId}/execution-cycles`);
    setRows(list);
  }, [projectId]);

  useEffect(() => {
    void load().catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, [load]);

  useEffect(() => {
    if (searchParams.get("create") === "1") {
      setCreateOpen(true);
      router.replace(`/projects/${projectId}/runs`, { scroll: false });
    }
  }, [searchParams, projectId, router]);

  async function removeCycle(id: number) {
    if (!isAdmin) return;
    if (
      !window.confirm(
        "Delete this cycle? Executions remain; they will no longer be grouped under this cycle.",
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
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Execution Cycles</h2>
          <p className="mt-1 text-sm text-slate-500">
            {rows.length} run cycle{rows.length === 1 ? "" : "s"}
          </p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            + New Cycle
          </button>
        )}
      </div>

      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        {rows.map((r) => {
          const t = r.total_executions;
          const pct = (n: number) => (t > 0 ? (n / t) * 100 : 0);
          const passRate = t > 0 ? Math.round((r.pass_count / t) * 100) : null;
          const statusLabel = EXECUTION_CYCLE_STATUS_LABEL[r.status] ?? r.status;

          return (
            <div
              key={r.id}
              className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
            >
              <Link
                href={`/projects/${projectId}/runs/${r.id}`}
                className="block flex-1 p-5 hover:bg-slate-50/80"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <span className="font-mono text-sm font-semibold text-violet-700">{r.code}</span>
                  <span
                    className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${cycleStatusPillClass(r.status)}`}
                  >
                    {statusLabel}
                  </span>
                </div>
                <h3 className="mt-2 text-lg font-bold text-slate-900">{r.name}</h3>
                {r.build_version && (
                  <p className="mt-0.5 text-sm font-medium text-slate-600">{r.build_version}</p>
                )}
                {r.description?.trim() && (
                  <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-600">{r.description}</p>
                )}

                <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs font-semibold">
                  <div className="rounded-lg bg-emerald-50 py-2 text-emerald-800 ring-1 ring-emerald-100">
                    <div className="text-lg tabular-nums">{r.pass_count}</div>
                    <div className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Pass</div>
                  </div>
                  <div className="rounded-lg bg-red-50 py-2 text-red-800 ring-1 ring-red-100">
                    <div className="text-lg tabular-nums">{r.fail_count}</div>
                    <div className="text-[10px] font-bold uppercase tracking-wide text-red-700">Fail</div>
                  </div>
                  <div className="rounded-lg bg-amber-50 py-2 text-amber-900 ring-1 ring-amber-100">
                    <div className="text-lg tabular-nums">{r.blocked_count}</div>
                    <div className="text-[10px] font-bold uppercase tracking-wide text-amber-800">Blocked</div>
                  </div>
                  <div className="rounded-lg bg-sky-50 py-2 text-sky-900 ring-1 ring-sky-100">
                    <div className="text-lg tabular-nums">{t}</div>
                    <div className="text-[10px] font-bold uppercase tracking-wide text-sky-800">Total</div>
                  </div>
                </div>

                {t > 0 && (
                  <>
                    <div className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                      {pct(r.pass_count) > 0 && (
                        <div
                          className="h-full bg-emerald-500 transition-all"
                          style={{ width: `${pct(r.pass_count)}%` }}
                        />
                      )}
                      {pct(r.fail_count) > 0 && (
                        <div
                          className="h-full bg-red-500 transition-all"
                          style={{ width: `${pct(r.fail_count)}%` }}
                        />
                      )}
                      {pct(r.blocked_count) > 0 && (
                        <div
                          className="h-full bg-amber-400 transition-all"
                          style={{ width: `${pct(r.blocked_count)}%` }}
                        />
                      )}
                      {pct(r.not_run_count + r.retest_count) > 0 && (
                        <div
                          className="h-full bg-slate-400 transition-all"
                          style={{ width: `${pct(r.not_run_count + r.retest_count)}%` }}
                        />
                      )}
                    </div>
                    {passRate !== null && (
                      <p className="mt-2 text-center text-sm font-semibold text-slate-700">{passRate}% pass rate</p>
                    )}
                  </>
                )}

                <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                  <IconCalendar className="shrink-0 text-slate-400" />
                  <span>
                    {formatShortDate(r.start_date)} — {formatShortDate(r.end_date)}
                  </span>
                </div>
              </Link>
              {isAdmin && (
                <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/50 px-5 py-2">
                  <Link
                    href={`/projects/${projectId}/runs/${r.id}`}
                    className="text-sm font-medium text-blue-600 hover:underline"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => void removeCycle(r.id)}
                    className="text-sm font-medium text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {rows.length === 0 && !error && (
        <p className="mt-12 text-center text-sm text-slate-500">No execution cycles yet. Create one to group test runs.</p>
      )}

      <CreateCycleModal
        projectId={projectId}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => void load()}
      />
    </div>
  );
}

export default function RunsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Loading…</p>}>
      <RunsPageInner />
    </Suspense>
  );
}
