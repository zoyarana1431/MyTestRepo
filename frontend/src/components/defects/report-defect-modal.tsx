"use client";

import { useEffect, useState } from "react";
import { ModuleSubmoduleSelect } from "@/components/modules/module-submodule-select";
import { apiFetch, ApiError } from "@/lib/api";
import { DEFECT_STATUS, PRIORITY, SEVERITY } from "@/lib/qa-options";
import {
  defectStatusLabel,
  priorityLabel,
  severityLabel,
  testCaseListHeading,
} from "@/lib/test-case-presentation";
import type { Defect, ExecutionListItem, ModuleFlat, RequirementListItem, TestCaseListItem } from "@/types/api";

function IconClose({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const inputClass =
  "mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
const labelClass = "text-sm font-medium text-slate-800";

type Props = {
  open: boolean;
  onClose: () => void;
  projectId: string;
  onCreated: (d: Defect) => void;
  /** Pre-select module (e.g. from test case context). */
  defaultModuleId?: number | null;
  /** Pre-select linked test case id as string (e.g. current test case). */
  defaultTestCaseId?: string;
};

export function ReportDefectModal({
  open,
  onClose,
  projectId,
  onCreated,
  defaultModuleId = null,
  defaultTestCaseId = "",
}: Props) {
  const [modules, setModules] = useState<ModuleFlat[]>([]);
  const [reqs, setReqs] = useState<RequirementListItem[]>([]);
  const [tcs, setTcs] = useState<TestCaseListItem[]>([]);
  const [exes, setExes] = useState<ExecutionListItem[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState("");
  const [expectedResult, setExpectedResult] = useState("");
  const [actualResult, setActualResult] = useState("");
  const [severity, setSeverity] = useState("major");
  const [priority, setPriority] = useState("high");
  const [status, setStatus] = useState("open");
  const [moduleId, setModuleId] = useState("");
  const [requirementId, setRequirementId] = useState("");
  const [testCaseId, setTestCaseId] = useState("");
  const [executionId, setExecutionId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setDescription("");
    setSteps("");
    setExpectedResult("");
    setActualResult("");
    setSeverity("major");
    setPriority("high");
    setStatus("open");
    setModuleId(defaultModuleId != null ? String(defaultModuleId) : "");
    setRequirementId("");
    setTestCaseId(defaultTestCaseId && /^\d+$/.test(defaultTestCaseId) ? defaultTestCaseId : "");
    setExecutionId("");
    setError(null);
  }, [open, defaultModuleId, defaultTestCaseId]);

  useEffect(() => {
    if (!open) return;
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
  }, [open, projectId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const d = await apiFetch<Defect>(`/api/v1/projects/${projectId}/defects`, {
        method: "POST",
        json: {
          title: title.trim(),
          description: description.trim() || null,
          steps_to_reproduce: steps.trim() || null,
          expected_result: expectedResult.trim() || null,
          actual_result: actualResult.trim() || null,
          severity,
          priority,
          status,
          module_id: moduleId === "" ? null : Number(moduleId),
          requirement_id: requirementId === "" ? null : Number(requirementId),
          test_case_id: testCaseId === "" ? null : Number(testCaseId),
          execution_id: executionId === "" ? null : Number(executionId),
        },
      });
      onCreated(d);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create defect");
    } finally {
      setPending(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-defect-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between border-b border-slate-100 bg-white px-6 py-4">
          <h2 id="report-defect-title" className="text-lg font-bold text-slate-900">
            Report Defect
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <IconClose />
          </button>
        </div>

        <form onSubmit={(e) => void onSubmit(e)} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <div className="space-y-5">
              <div>
                <label className={labelClass}>
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  className={inputClass}
                  placeholder="Defect title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  autoFocus
                />
              </div>

              <div>
                <label className={labelClass}>Description</label>
                <textarea
                  className={`${inputClass} min-h-[100px] resize-y`}
                  placeholder="Describe the defect in detail..."
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div>
                <label className={labelClass}>Steps to Reproduce</label>
                <textarea
                  className={`${inputClass} min-h-[88px] resize-y`}
                  placeholder={"1. Navigate to...\n2. Click on...\n3. Observe..."}
                  rows={4}
                  value={steps}
                  onChange={(e) => setSteps(e.target.value)}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Expected Result</label>
                  <textarea
                    className={`${inputClass} min-h-[88px] resize-y`}
                    placeholder="What should happen..."
                    rows={3}
                    value={expectedResult}
                    onChange={(e) => setExpectedResult(e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Actual Result</label>
                  <textarea
                    className={`${inputClass} min-h-[88px] resize-y`}
                    placeholder="What actually happened..."
                    rows={3}
                    value={actualResult}
                    onChange={(e) => setActualResult(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className={labelClass}>Severity</label>
                  <select
                    className={`${inputClass} capitalize`}
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                  >
                    {SEVERITY.map((s) => (
                      <option key={s} value={s}>
                        {severityLabel(s)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Priority</label>
                  <select
                    className={`${inputClass} capitalize`}
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                  >
                    {PRIORITY.map((p) => (
                      <option key={p} value={p}>
                        {priorityLabel(p)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Status</label>
                  <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value)}>
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
                    value={moduleId === "" ? null : Number(moduleId)}
                    onChange={(id) => setModuleId(id == null ? "" : String(id))}
                    selectClassName={inputClass}
                    labelClassName={labelClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Linked Test Case</label>
                  <select
                    className={inputClass}
                    value={testCaseId}
                    onChange={(e) => setTestCaseId(e.target.value)}
                  >
                    <option value="">None</option>
                    {tcs.map((t) => {
                      const { primary } = testCaseListHeading(t);
                      return (
                        <option key={t.id} value={t.id}>
                          {t.code} — {primary}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Requirement</label>
                  <select
                    className={inputClass}
                    value={requirementId}
                    onChange={(e) => setRequirementId(e.target.value)}
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
                  <label className={labelClass}>Execution</label>
                  <select
                    className={inputClass}
                    value={executionId}
                    onChange={(e) => setExecutionId(e.target.value)}
                  >
                    <option value="">None</option>
                    {exes.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.code} — {x.status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/80 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
            >
              {pending ? "Submitting…" : "Report Defect"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
