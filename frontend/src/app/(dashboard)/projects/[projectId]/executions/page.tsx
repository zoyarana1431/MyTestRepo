"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { EXECUTION_STATUS } from "@/lib/qa-options";
import {
  lastRunDotClass,
  lastRunLabel,
  lastRunPillClass,
} from "@/lib/test-case-presentation";
import { useProjectRole } from "@/hooks/use-project-role";
import type { Execution, ExecutionCycle, ExecutionListItem, TestCaseListItem } from "@/types/api";

function formatExecDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
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

function IconClose({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconTrash({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function statusOptionLabel(s: string) {
  const l = lastRunLabel(s);
  if (l === "—") return s;
  return l.replace(/\b\w/g, (c) => c.toUpperCase());
}

function RecordExecutionModal({
  projectId,
  open,
  onClose,
  presetTestCaseId,
  onCreated,
}: {
  projectId: string;
  open: boolean;
  onClose: () => void;
  presetTestCaseId: string;
  onCreated: () => void;
}) {
  const router = useRouter();
  const [testCases, setTestCases] = useState<TestCaseListItem[]>([]);
  const [cycles, setCycles] = useState<ExecutionCycle[]>([]);
  const [testCaseId, setTestCaseId] = useState("");
  const [cycleId, setCycleId] = useState("");
  const [buildVersion, setBuildVersion] = useState("");
  const [platform, setPlatform] = useState("");
  const [environment, setEnvironment] = useState("");
  const [status, setStatus] = useState("pass");
  const [actualResult, setActualResult] = useState("");
  const [notes, setNotes] = useState("");
  const [retestRequired, setRetestRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    void Promise.all([
      apiFetch<TestCaseListItem[]>(`/api/v1/projects/${projectId}/test-cases`),
      apiFetch<ExecutionCycle[]>(`/api/v1/projects/${projectId}/execution-cycles`),
    ]).then(([t, c]) => {
      setTestCases(t);
      setCycles(c);
    });
  }, [projectId, open]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setTestCaseId(presetTestCaseId && /^\d+$/.test(presetTestCaseId) ? presetTestCaseId : "");
    setCycleId("");
    setBuildVersion("");
    setPlatform("");
    setEnvironment("");
    setStatus("pass");
    setActualResult("");
    setNotes("");
    setRetestRequired(false);
  }, [open, presetTestCaseId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const ex = await apiFetch<Execution>(`/api/v1/projects/${projectId}/executions`, {
        method: "POST",
        json: {
          test_case_id: Number(testCaseId),
          requirement_id: null,
          execution_cycle_id: cycleId === "" ? null : Number(cycleId),
          build_version: buildVersion.trim() || null,
          platform: platform.trim() || null,
          environment: environment.trim() || null,
          status,
          actual_result: actualResult.trim() || null,
          comments: notes.trim() || null,
          retest_required: retestRequired,
        },
      });
      onCreated();
      onClose();
      router.push(`/projects/${projectId}/executions/${ex.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to record execution");
    } finally {
      setPending(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="record-exec-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white px-6 py-4">
          <h2 id="record-exec-title" className="text-lg font-bold text-slate-900">
            Record Execution
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
              Test Case <span className="text-red-500">*</span>
            </label>
            <select
              required
              className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={testCaseId}
              onChange={(e) => setTestCaseId(e.target.value)}
            >
              <option value="">— Select —</option>
              {testCases.map((tc) => (
                <option key={tc.id} value={tc.id}>
                  {tc.code} — {tc.test_scenario?.split(/\r?\n/)[0]?.trim() || tc.feature_name || "Test case"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-800">Execution Cycle</label>
            <select
              className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={cycleId}
              onChange={(e) => setCycleId(e.target.value)}
            >
              <option value="">No Cycle</option>
              {cycles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
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
              <label className="text-sm font-medium text-slate-800">Platform</label>
              <input
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                placeholder="Web / Chrome"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-800">Environment</label>
              <input
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
                placeholder="Staging"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-800">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                required
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm capitalize focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {EXECUTION_STATUS.map((s) => (
                  <option key={s} value={s}>
                    {statusOptionLabel(s)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-800">Actual Result</label>
            <textarea
              className="mt-1.5 min-h-[100px] w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm placeholder:italic placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={actualResult}
              onChange={(e) => setActualResult(e.target.value)}
              placeholder="Describe what actually happened during execution..."
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-800">Notes</label>
            <textarea
              className="mt-1.5 min-h-[80px] w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm placeholder:italic placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes or observations..."
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              checked={retestRequired}
              onChange={(e) => setRetestRequired(e.target.checked)}
            />
            <span className="text-sm font-medium text-slate-800">Retest Required</span>
          </label>
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
              disabled={pending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Record Execution"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ExecutionsPageInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params.projectId as string;
  const { isAdmin } = useProjectRole(projectId);

  const [rows, setRows] = useState<ExecutionListItem[]>([]);
  const [totalUnfiltered, setTotalUnfiltered] = useState<number | null>(null);
  const [cycles, setCycles] = useState<ExecutionCycle[]>([]);
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [cycleFilter, setCycleFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recordOpen, setRecordOpen] = useState(false);
  const [presetTestCaseId, setPresetTestCaseId] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setQ(qInput), 300);
    return () => clearTimeout(t);
  }, [qInput]);

  useEffect(() => {
    void apiFetch<ExecutionCycle[]>(`/api/v1/projects/${projectId}/execution-cycles`).then(setCycles);
  }, [projectId]);

  useEffect(() => {
    void apiFetch<ExecutionListItem[]>(`/api/v1/projects/${projectId}/executions`)
      .then((list) => setTotalUnfiltered(list.length))
      .catch(() => setTotalUnfiltered(null));
  }, [projectId]);

  useEffect(() => {
    const rec = searchParams.get("record");
    const tc = searchParams.get("test_case_id");
    if (rec === "1") {
      setPresetTestCaseId(tc && /^\d+$/.test(tc) ? tc : "");
      setRecordOpen(true);
      router.replace(`/projects/${projectId}/executions`, { scroll: false });
    }
  }, [projectId, router, searchParams]);

  const load = useCallback(async () => {
    const qs = new URLSearchParams();
    if (q.trim()) qs.set("q", q.trim());
    if (statusFilter) qs.set("status", statusFilter);
    if (cycleFilter) qs.set("execution_cycle_id", cycleFilter);
    const path = `/api/v1/projects/${projectId}/executions${qs.toString() ? `?${qs}` : ""}`;
    const list = await apiFetch<ExecutionListItem[]>(path);
    setRows(list);
  }, [projectId, q, statusFilter, cycleFilter]);

  useEffect(() => {
    setLoading(true);
    void load()
      .then(() => setError(null))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, [load]);

  const filtered = !!(q.trim() || statusFilter || cycleFilter);

  async function deleteExecution(id: number, code: string) {
    if (!isAdmin) return;
    if (
      !window.confirm(
        `Delete execution ${code}? This removes the record and any attached evidence files. Defects linked to this execution will have the link cleared.`,
      )
    ) {
      return;
    }
    setError(null);
    try {
      await apiFetch(`/api/v1/projects/${projectId}/executions/${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Delete failed");
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Test Executions</h2>
          <p className="mt-1 text-sm text-slate-500">
            {totalUnfiltered != null
              ? filtered
                ? `Showing ${rows.length} of ${totalUnfiltered} execution records`
                : `${rows.length} of ${totalUnfiltered} execution records`
              : `${rows.length} execution record${rows.length === 1 ? "" : "s"}`}
          </p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => {
              setPresetTestCaseId("");
              setRecordOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            + Record Execution
          </button>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <input
          type="search"
          className="min-w-[200px] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Search executions..."
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          aria-label="Search executions"
        />
        <select
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="">All Status</option>
          {EXECUTION_STATUS.map((s) => (
            <option key={s} value={s}>
              {statusOptionLabel(s)}
            </option>
          ))}
        </select>
        <select
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={cycleFilter}
          onChange={(e) => setCycleFilter(e.target.value)}
          aria-label="Filter by cycle"
        >
          <option value="">All Cycles</option>
          {cycles.map((c) => (
            <option key={c.id} value={String(c.id)}>
              {c.code}
            </option>
          ))}
        </select>
      </div>

      {loading && <p className="mt-8 text-sm text-slate-500">Loading…</p>}
      {error && <p className="mt-8 text-sm text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/90 text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3">EXE ID</th>
                  <th className="min-w-[240px] px-4 py-3">Test Case</th>
                  <th className="whitespace-nowrap px-4 py-3">Cycle</th>
                  <th className="whitespace-nowrap px-4 py-3">Build</th>
                  <th className="whitespace-nowrap px-4 py-3">Status</th>
                  <th className="whitespace-nowrap px-4 py-3">Retest</th>
                  <th className="whitespace-nowrap px-4 py-3">Date</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/80">
                    <td className="whitespace-nowrap px-4 py-3">
                      <Link
                        href={`/projects/${projectId}/executions/${e.id}`}
                        className="font-mono text-sm font-semibold text-emerald-700 hover:text-emerald-900 hover:underline"
                      >
                        {e.code}
                      </Link>
                    </td>
                    <td className="max-w-xs px-4 py-3">
                      <div className="font-semibold text-slate-900">
                        {e.test_case_code} — {e.test_case_title}
                      </div>
                      {(e.platform || e.environment) && (
                        <div className="mt-0.5 text-xs text-slate-500">
                          {[e.platform, e.environment].filter(Boolean).join(" · ")}
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {e.execution_cycle_code ? (
                        <span className="inline-flex rounded-md border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-800">
                          {e.execution_cycle_code}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                      {e.build_version ? e.build_version : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${lastRunPillClass(e.status)}`}
                      >
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${lastRunDotClass(e.status)}`} />
                        {lastRunLabel(e.status)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                      {e.retest_required ? (
                        <span className="font-medium text-amber-800">Yes</span>
                      ) : (
                        <span className="text-slate-500">No</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatExecDate(e.executed_at)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="inline-flex items-center justify-end gap-0.5">
                        <Link
                          href={`/projects/${projectId}/executions/${e.id}`}
                          className="inline-flex rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                          title="View"
                          aria-label="View execution"
                        >
                          <IconEye />
                        </Link>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => void deleteExecution(e.id, e.code)}
                            className="inline-flex rounded-md p-2 text-slate-500 hover:bg-red-50 hover:text-red-700"
                            title="Delete execution"
                            aria-label="Delete execution"
                          >
                            <IconTrash />
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
            <p className="px-4 py-12 text-center text-sm text-slate-500">No executions found.</p>
          )}
        </div>
      )}

      {isAdmin && (
        <RecordExecutionModal
          projectId={projectId}
          open={recordOpen}
          onClose={() => setRecordOpen(false)}
          presetTestCaseId={presetTestCaseId}
          onCreated={() => void load()}
        />
      )}
    </div>
  );
}

export default function ExecutionsListPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Loading…</p>}>
      <ExecutionsPageInner />
    </Suspense>
  );
}
