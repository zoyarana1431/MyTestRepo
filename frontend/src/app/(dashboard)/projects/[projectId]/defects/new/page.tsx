"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { DEFECT_STATUS, PRIORITY, SEVERITY } from "@/lib/qa-options";
import { useProjectRole } from "@/hooks/use-project-role";
import type { Defect, ExecutionListItem, ModuleFlat, RequirementListItem, TestCaseListItem } from "@/types/api";

export default function NewDefectPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const router = useRouter();
  const { isAdmin, loading: roleLoading } = useProjectRole(projectId);
  const [modules, setModules] = useState<ModuleFlat[]>([]);
  const [reqs, setReqs] = useState<RequirementListItem[]>([]);
  const [tcs, setTcs] = useState<TestCaseListItem[]>([]);
  const [exes, setExes] = useState<ExecutionListItem[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState("");
  const [severity, setSeverity] = useState("major");
  const [priority, setPriority] = useState("medium");
  const [status, setStatus] = useState("open");
  const [moduleId, setModuleId] = useState("");
  const [requirementId, setRequirementId] = useState("");
  const [testCaseId, setTestCaseId] = useState("");
  const [executionId, setExecutionId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;
    setPending(true);
    setError(null);
    try {
      const d = await apiFetch<Defect>(`/api/v1/projects/${projectId}/defects`, {
        method: "POST",
        json: {
          title: title.trim(),
          description: description.trim() || null,
          steps_to_reproduce: steps.trim() || null,
          severity,
          priority,
          status,
          module_id: moduleId === "" ? null : Number(moduleId),
          requirement_id: requirementId === "" ? null : Number(requirementId),
          test_case_id: testCaseId === "" ? null : Number(testCaseId),
          execution_id: executionId === "" ? null : Number(executionId),
        },
      });
      router.replace(`/projects/${projectId}/defects/${d.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed");
    } finally {
      setPending(false);
    }
  }

  if (!roleLoading && !isAdmin) {
    return (
      <p className="text-sm text-ink-muted">
        <Link href={`/projects/${projectId}/defects`} className="text-accent">
          Back
        </Link>{" "}
        — admin only.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <Link href={`/projects/${projectId}/defects`} className="text-sm text-ink-muted hover:text-ink">
        ← Defects
      </Link>
      <h2 className="mt-4 text-lg font-semibold text-ink">Report defect</h2>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div>
          <label className="text-xs font-medium text-ink-muted">Title *</label>
          <input
            required
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-ink-muted">Description</label>
          <textarea
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-ink-muted">Steps to reproduce</label>
          <textarea
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            rows={3}
            value={steps}
            onChange={(e) => setSteps(e.target.value)}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="text-xs font-medium text-ink-muted">Severity</label>
            <select
              className="mt-1 w-full capitalize"
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
            >
              {SEVERITY.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-ink-muted">Priority</label>
            <select
              className="mt-1 w-full capitalize"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              {PRIORITY.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-ink-muted">Status</label>
            <select className="mt-1 w-full" value={status} onChange={(e) => setStatus(e.target.value)}>
              {DEFECT_STATUS.map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-ink-muted">Module</label>
          <select
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            value={moduleId}
            onChange={(e) => setModuleId(e.target.value)}
          >
            <option value="">— None —</option>
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-ink-muted">Requirement</label>
          <select
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            value={requirementId}
            onChange={(e) => setRequirementId(e.target.value)}
          >
            <option value="">— None —</option>
            {reqs.map((r) => (
              <option key={r.id} value={r.id}>
                {r.code} — {r.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-ink-muted">Test case</label>
          <select
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            value={testCaseId}
            onChange={(e) => setTestCaseId(e.target.value)}
          >
            <option value="">— None —</option>
            {tcs.map((t) => (
              <option key={t.id} value={t.id}>
                {t.code}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-ink-muted">Execution</label>
          <select
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            value={executionId}
            onChange={(e) => setExecutionId(e.target.value)}
          >
            <option value="">— None —</option>
            {exes.map((x) => (
              <option key={x.id} value={x.id}>
                {x.code} — {x.status}
              </option>
            ))}
          </select>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? "Saving…" : "Create defect"}
        </button>
      </form>
    </div>
  );
}
