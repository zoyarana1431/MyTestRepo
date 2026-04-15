"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { EXECUTION_STATUS } from "@/lib/qa-options";
import type {
  Execution,
  ExecutionCycle,
  LinkedRequirementBrief,
  TestCaseDetail,
  TestCaseListItem,
} from "@/types/api";

export default function NewExecutionPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const router = useRouter();
  const [testCases, setTestCases] = useState<TestCaseListItem[]>([]);
  const [cycles, setCycles] = useState<ExecutionCycle[]>([]);
  const [testCaseId, setTestCaseId] = useState("");
  const [reqIds, setReqIds] = useState<LinkedRequirementBrief[]>([]);
  const [requirementId, setRequirementId] = useState("");
  const [cycleId, setCycleId] = useState("");
  const [buildVersion, setBuildVersion] = useState("");
  const [platform, setPlatform] = useState("");
  const [environment, setEnvironment] = useState("");
  const [status, setStatus] = useState("pass");
  const [actualResult, setActualResult] = useState("");
  const [comments, setComments] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void Promise.all([
      apiFetch<TestCaseListItem[]>(`/api/v1/projects/${projectId}/test-cases`),
      apiFetch<ExecutionCycle[]>(`/api/v1/projects/${projectId}/execution-cycles`),
    ]).then(([t, c]) => {
      setTestCases(t);
      setCycles(c);
    });
  }, [projectId]);

  useEffect(() => {
    if (!testCaseId) {
      setReqIds([]);
      setRequirementId("");
      return;
    }
    void apiFetch<TestCaseDetail>(`/api/v1/projects/${projectId}/test-cases/${testCaseId}`).then((d) => {
      setReqIds(d.requirements);
      setRequirementId("");
    });
  }, [projectId, testCaseId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const ex = await apiFetch<Execution>(`/api/v1/projects/${projectId}/executions`, {
        method: "POST",
        json: {
          test_case_id: Number(testCaseId),
          requirement_id: requirementId === "" ? null : Number(requirementId),
          execution_cycle_id: cycleId === "" ? null : Number(cycleId),
          build_version: buildVersion.trim() || null,
          platform: platform.trim() || null,
          environment: environment.trim() || null,
          status,
          actual_result: actualResult.trim() || null,
          comments: comments.trim() || null,
        },
      });
      router.replace(`/projects/${projectId}/executions/${ex.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <Link href={`/projects/${projectId}/executions`} className="text-sm text-ink-muted hover:text-ink">
        ← Executions
      </Link>
      <h2 className="mt-4 text-lg font-semibold text-ink">Log execution</h2>
      <p className="mt-1 text-sm text-ink-muted">Creates a new immutable record. Link a requirement if applicable.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div>
          <label className="text-xs font-medium text-ink-muted">Test case *</label>
          <select
            required
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            value={testCaseId}
            onChange={(e) => setTestCaseId(e.target.value)}
          >
            <option value="">— Select —</option>
            {testCases.map((tc) => (
              <option key={tc.id} value={tc.id}>
                {tc.code} — {tc.feature_name || tc.test_scenario?.slice(0, 60) || "TC"}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-ink-muted">Requirement (optional)</label>
          <select
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            value={requirementId}
            onChange={(e) => setRequirementId(e.target.value)}
            disabled={!testCaseId}
          >
            <option value="">— None —</option>
            {reqIds.map((r) => (
              <option key={r.id} value={r.id}>
                {r.code} — {r.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-ink-muted">Execution run (optional)</label>
          <select
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            value={cycleId}
            onChange={(e) => setCycleId(e.target.value)}
          >
            <option value="">— Ad-hoc —</option>
            {cycles.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-ink-muted">Build</label>
            <input
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              value={buildVersion}
              onChange={(e) => setBuildVersion(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-muted">Status *</label>
            <select
              className="mt-1 w-full capitalize"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {EXECUTION_STATUS.map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-ink-muted">Platform</label>
            <input
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-muted">Environment</label>
            <input
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              value={environment}
              onChange={(e) => setEnvironment(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-ink-muted">Actual result</label>
          <textarea
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            rows={3}
            value={actualResult}
            onChange={(e) => setActualResult(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-ink-muted">Comments</label>
          <textarea
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            rows={2}
            value={comments}
            onChange={(e) => setComments(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save execution"}
        </button>
      </form>
    </div>
  );
}
