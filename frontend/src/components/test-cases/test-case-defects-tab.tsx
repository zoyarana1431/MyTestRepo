"use client";

import { useCallback, useEffect, useState } from "react";
import { ReportDefectModal } from "@/components/defects/report-defect-modal";
import { ModuleSubmoduleSelect } from "@/components/modules/module-submodule-select";
import { apiFetch, ApiError } from "@/lib/api";
import { DEFECT_STATUS, PRIORITY, SEVERITY } from "@/lib/qa-options";
import {
  defectStatusDotClass,
  defectStatusLabel,
  defectStatusPillClass,
  priorityLabel,
  priorityPillClass,
  severityLabel,
  severityPillClass,
  testCaseListHeading,
} from "@/lib/test-case-presentation";
import type { Defect, ExecutionListItem, LinkedRequirementBrief, ModuleFlat, RequirementListItem, TestCaseListItem } from "@/types/api";

function formatGbDate(iso: string) {
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

function IconClose({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function tcOptionLabel(tc: TestCaseListItem): string {
  const { primary } = testCaseListHeading(tc);
  return `${tc.code} — ${primary}`;
}

type TabProps = {
  projectId: string;
  testCaseId: number;
  testCaseCode: string;
  defaultModuleId: number | null;
  requirements: LinkedRequirementBrief[];
  isAdmin: boolean;
  onDefectsChanged: () => void;
};

export function TestCaseDefectsTab({
  projectId,
  testCaseId,
  testCaseCode,
  defaultModuleId,
  requirements,
  isAdmin,
  onDefectsChanged,
}: TabProps) {
  const tcParam = String(testCaseId);

  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [rows, setRows] = useState<Defect[]>([]);
  const [totalAll, setTotalAll] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modules, setModules] = useState<ModuleFlat[]>([]);
  const [reqs, setReqs] = useState<RequirementListItem[]>([]);
  const [tcs, setTcs] = useState<TestCaseListItem[]>([]);
  const [exes, setExes] = useState<ExecutionListItem[]>([]);

  const [reportOpen, setReportOpen] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setQ(qInput), 300);
    return () => clearTimeout(t);
  }, [qInput]);

  useEffect(() => {
    void Promise.all([
      apiFetch<ModuleFlat[]>(`/api/v1/projects/${projectId}/modules`),
      apiFetch<RequirementListItem[]>(`/api/v1/projects/${projectId}/requirements`),
      apiFetch<TestCaseListItem[]>(`/api/v1/projects/${projectId}/test-cases`),
      apiFetch<ExecutionListItem[]>(`/api/v1/projects/${projectId}/executions`),
    ]).then(([m, r, t, e]) => {
      setModules(m);
      setReqs(r);
      setTcs(t);
      setExes(e);
    });
  }, [projectId]);

  const loadTotal = useCallback(async () => {
    const list = await apiFetch<Defect[]>(
      `/api/v1/projects/${projectId}/defects?test_case_id=${testCaseId}`,
    );
    setTotalAll(list.length);
  }, [projectId, testCaseId]);

  const loadFiltered = useCallback(async () => {
    const qs = new URLSearchParams();
    qs.set("test_case_id", String(testCaseId));
    if (q.trim()) qs.set("q", q.trim());
    if (statusFilter) qs.set("status", statusFilter);
    if (severityFilter) qs.set("severity", severityFilter);
    const list = await apiFetch<Defect[]>(
      `/api/v1/projects/${projectId}/defects?${qs.toString()}`,
    );
    setRows(list);
  }, [projectId, testCaseId, q, statusFilter, severityFilter]);

  useEffect(() => {
    void loadTotal().catch(() => setTotalAll(null));
  }, [loadTotal]);

  useEffect(() => {
    setLoading(true);
    void loadFiltered()
      .then(() => setError(null))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, [loadFiltered]);

  const filtered = !!(q.trim() || statusFilter || severityFilter);
  const countSubtitle =
    totalAll != null
      ? filtered
        ? `Showing ${rows.length} of ${totalAll} defects`
        : `${rows.length} of ${totalAll} defects`
      : `${rows.length} defect${rows.length === 1 ? "" : "s"}`;

  function afterMutation() {
    void loadTotal();
    void loadFiltered();
    onDefectsChanged();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Defects</h3>
          <p className="mt-0.5 text-sm text-slate-500">{countSubtitle}</p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setReportOpen(true)}
            className="inline-flex w-full shrink-0 items-center justify-center rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 sm:w-auto"
          >
            + Report Defect
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search defects..."
            className="w-full rounded-lg border border-slate-200 py-2 pl-10 pr-3 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            aria-label="Search defects"
          />
        </div>
        <div className="flex flex-wrap gap-2 sm:shrink-0">
          <select
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
          >
            <option value="">All Status</option>
            {DEFECT_STATUS.map((s) => (
              <option key={s} value={s}>
                {defectStatusLabel(s)}
              </option>
            ))}
          </select>
          <select
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm capitalize focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            aria-label="Filter by severity"
          >
            <option value="">All Severity</option>
            {SEVERITY.map((s) => (
              <option key={s} value={s}>
                {severityLabel(s)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-slate-500">Loading…</p>}

      {!loading && !error && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/90 text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3">Bug ID</th>
                  <th className="min-w-[200px] px-4 py-3">Title</th>
                  <th className="whitespace-nowrap px-4 py-3">Severity</th>
                  <th className="whitespace-nowrap px-4 py-3">Priority</th>
                  <th className="whitespace-nowrap px-4 py-3">Status</th>
                  <th className="whitespace-nowrap px-4 py-3">Created</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/80">
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="inline-flex rounded-md bg-red-50 px-2 py-0.5 font-mono text-xs font-semibold text-red-800 ring-1 ring-red-100">
                        {d.code}
                      </span>
                    </td>
                    <td className="max-w-xs px-4 py-3">
                      <span className="font-semibold text-slate-900">{d.title}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset ${severityPillClass(d.severity)}`}
                      >
                        {severityLabel(d.severity)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset ${priorityPillClass(d.priority)}`}
                      >
                        {priorityLabel(d.priority)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${defectStatusPillClass(d.status)}`}
                      >
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${defectStatusDotClass(d.status)}`} />
                        {defectStatusLabel(d.status)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatGbDate(d.created_at)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setDetailId(d.id)}
                          className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                          title="View"
                          aria-label="View defect"
                        >
                          <IconEye />
                        </button>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => setEditId(d.id)}
                            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                            title="Edit"
                            aria-label="Edit defect"
                          >
                            <IconPencil />
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
            <p className="px-4 py-10 text-center text-sm text-slate-500">
              {filtered ? "No defects match your filters." : "No defects linked to this test case yet."}
            </p>
          )}
        </div>
      )}

      {isAdmin && (
        <ReportDefectModal
          open={reportOpen}
          projectId={projectId}
          defaultModuleId={defaultModuleId}
          defaultTestCaseId={tcParam}
          onClose={() => setReportOpen(false)}
          onCreated={(_d) => {
            afterMutation();
            setReportOpen(false);
          }}
        />
      )}

      {detailId != null && (
        <DefectDetailModal
          projectId={projectId}
          defectId={detailId}
          modules={modules}
          requirements={requirements}
          tcs={tcs}
          isAdmin={isAdmin}
          onClose={() => setDetailId(null)}
          onEdit={() => {
            const id = detailId;
            setDetailId(null);
            if (id != null && isAdmin) setEditId(id);
          }}
        />
      )}

      {editId != null && isAdmin && (
        <EditDefectModal
          projectId={projectId}
          defectId={editId}
          modules={modules}
          reqs={reqs}
          tcs={tcs}
          exes={exes}
          onClose={() => setEditId(null)}
          onSaved={afterMutation}
        />
      )}
    </div>
  );
}

function DefectDetailModal({
  projectId,
  defectId,
  modules,
  requirements,
  tcs,
  isAdmin,
  onClose,
  onEdit,
}: {
  projectId: string;
  defectId: number;
  modules: ModuleFlat[];
  requirements: LinkedRequirementBrief[];
  tcs: TestCaseListItem[];
  isAdmin: boolean;
  onClose: () => void;
  onEdit: () => void;
}) {
  const [d, setD] = useState<Defect | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiFetch<Defect>(`/api/v1/projects/${projectId}/defects/${defectId}`)
      .then((x) => {
        setD(x);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, [projectId, defectId]);

  if (error && !d) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" role="alert">
        <div className="rounded-xl bg-white p-6 shadow-xl">
          <p className="text-sm text-red-600">{error}</p>
          <button type="button" onClick={onClose} className="mt-4 text-sm font-medium text-blue-600">
            Close
          </button>
        </div>
      </div>
    );
  }

  if (!d) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
        <p className="text-sm text-slate-600">Loading…</p>
      </div>
    );
  }

  const moduleName = d.module_id != null ? modules.find((m) => m.id === d.module_id)?.name : null;
  const reqCode =
    d.requirement_id != null ? requirements.find((r) => r.id === d.requirement_id)?.code : null;
  const tcDisplay =
    d.test_case_id != null ? tcs.find((t) => t.id === d.test_case_id)?.code ?? "—" : "—";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="defect-detail-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
          <h2 id="defect-detail-title" className="text-lg font-bold text-slate-900">
            Defect Detail
          </h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Close">
            <IconClose />
          </button>
        </div>
        <div className="space-y-4 px-6 py-5">
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex rounded-md bg-red-50 px-2 py-0.5 font-mono text-xs font-semibold text-red-800 ring-1 ring-red-100">
              {d.code}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${defectStatusPillClass(d.status)}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${defectStatusDotClass(d.status)}`} />
              {defectStatusLabel(d.status)}
            </span>
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${severityPillClass(d.severity)}`}
            >
              {severityLabel(d.severity)}
            </span>
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${priorityPillClass(d.priority)}`}
            >
              {priorityLabel(d.priority)}
            </span>
          </div>
          <h3 className="text-xl font-bold text-slate-900">{d.title}</h3>

          {d.description?.trim() && (
            <div className="rounded-lg border border-slate-200 bg-slate-50/90 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Description</p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{d.description}</p>
            </div>
          )}

          {d.steps_to_reproduce?.trim() && (
            <div className="rounded-lg border border-slate-200 bg-slate-50/90 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Steps to Reproduce</p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{d.steps_to_reproduce}</p>
            </div>
          )}

          {(d.expected_result?.trim() || d.actual_result?.trim()) && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-4">
                <p className="text-xs font-semibold text-emerald-800">Expected</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-emerald-950/90">{d.expected_result ?? "—"}</p>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50/80 p-4">
                <p className="text-xs font-semibold text-red-800">Actual</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-red-950/90">{d.actual_result ?? "—"}</p>
              </div>
            </div>
          )}

          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium text-slate-500">Module</dt>
              <dd className="mt-0.5 font-semibold text-slate-900">{moduleName ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Test Case</dt>
              <dd className="mt-0.5 font-semibold text-slate-900">{tcDisplay}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Requirement</dt>
              <dd className="mt-0.5 font-semibold text-slate-900">{reqCode ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Reported</dt>
              <dd className="mt-0.5 font-semibold text-slate-900">{formatGbDate(d.created_at)}</dd>
            </div>
          </dl>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-sm font-semibold text-slate-800">Comments (0)</p>
            <p className="mt-2 text-sm text-slate-500">No comments yet.</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            Close
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={onEdit}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function EditDefectModal({
  projectId,
  defectId,
  modules,
  reqs,
  tcs,
  exes,
  onClose,
  onSaved,
}: {
  projectId: string;
  defectId: number;
  modules: ModuleFlat[];
  reqs: RequirementListItem[];
  tcs: TestCaseListItem[];
  exes: ExecutionListItem[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [d, setD] = useState<Defect | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void apiFetch<Defect>(`/api/v1/projects/${projectId}/defects/${defectId}`)
      .then((x) => {
        setD(x);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, [projectId, defectId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!d) return;
    setPending(true);
    setError(null);
    try {
      await apiFetch(`/api/v1/projects/${projectId}/defects/${defectId}`, {
        method: "PATCH",
        json: {
          title: d.title.trim(),
          description: d.description ?? null,
          steps_to_reproduce: d.steps_to_reproduce ?? null,
          expected_result: d.expected_result ?? null,
          actual_result: d.actual_result ?? null,
          severity: d.severity,
          priority: d.priority,
          status: d.status,
          module_id: d.module_id,
          requirement_id: d.requirement_id,
          test_case_id: d.test_case_id,
          execution_id: d.execution_id,
        },
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Save failed");
    } finally {
      setPending(false);
    }
  }

  if (error && !d) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
        <div className="rounded-xl bg-white p-6">
          <p className="text-sm text-red-600">{error}</p>
          <button type="button" onClick={onClose} className="mt-4 text-blue-600">
            Close
          </button>
        </div>
      </div>
    );
  }

  if (!d) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
        <p className="text-sm text-slate-600">Loading…</p>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      role="dialog"
      aria-labelledby="edit-defect-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
          <h2 id="edit-defect-title" className="text-lg font-bold text-slate-900">
            Edit Defect
          </h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Close">
            <IconClose />
          </button>
        </div>
        <form onSubmit={(e) => void onSubmit(e)} className="space-y-4 px-6 py-5">
          <div>
            <label className="text-sm font-medium text-slate-800">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              required
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={d.title}
              onChange={(e) => setD({ ...d, title: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-800">Description</label>
            <textarea
              className="mt-1.5 min-h-[80px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={d.description ?? ""}
              onChange={(e) => setD({ ...d, description: e.target.value || null })}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-800">Steps to Reproduce</label>
            <textarea
              className="mt-1.5 min-h-[88px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={d.steps_to_reproduce ?? ""}
              onChange={(e) => setD({ ...d, steps_to_reproduce: e.target.value || null })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-800">Expected Result</label>
              <textarea
                className="mt-1.5 min-h-[80px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={d.expected_result ?? ""}
                onChange={(e) => setD({ ...d, expected_result: e.target.value || null })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-800">Actual Result</label>
              <textarea
                className="mt-1.5 min-h-[80px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={d.actual_result ?? ""}
                onChange={(e) => setD({ ...d, actual_result: e.target.value || null })}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="text-sm font-medium text-slate-800">Severity</label>
              <select
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm capitalize focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={d.severity}
                onChange={(e) => setD({ ...d, severity: e.target.value })}
              >
                {SEVERITY.map((s) => (
                  <option key={s} value={s}>
                    {severityLabel(s)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-800">Priority</label>
              <select
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm capitalize focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={d.priority}
                onChange={(e) => setD({ ...d, priority: e.target.value })}
              >
                {PRIORITY.map((p) => (
                  <option key={p} value={p}>
                    {priorityLabel(p)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-800">Status</label>
              <select
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={d.status}
                onChange={(e) => setD({ ...d, status: e.target.value })}
              >
                {DEFECT_STATUS.map((s) => (
                  <option key={s} value={s}>
                    {defectStatusLabel(s)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <ModuleSubmoduleSelect
                modules={modules}
                value={d.module_id}
                onChange={(id) => setD({ ...d, module_id: id })}
                selectClassName="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-800">Linked Test Case</label>
              <select
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={d.test_case_id ?? ""}
                onChange={(e) =>
                  setD({ ...d, test_case_id: e.target.value === "" ? null : Number(e.target.value) })
                }
              >
                <option value="">None</option>
                {tcs.map((t) => (
                  <option key={t.id} value={t.id}>
                    {tcOptionLabel(t)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-800">Requirement</label>
            <select
              className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={d.requirement_id ?? ""}
              onChange={(e) =>
                setD({ ...d, requirement_id: e.target.value === "" ? null : Number(e.target.value) })
              }
            >
              <option value="">None</option>
              {reqs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.code} — {r.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-800">Execution</label>
            <select
              className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={d.execution_id ?? ""}
              onChange={(e) =>
                setD({ ...d, execution_id: e.target.value === "" ? null : Number(e.target.value) })
              }
            >
              <option value="">None</option>
              {exes.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.code}
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
              disabled={pending}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
