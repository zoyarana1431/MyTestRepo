"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { PRIORITY, SEVERITY, TEST_CASE_STATUS, TEST_CASE_TYPE } from "@/lib/qa-options";
import { useProjectRole } from "@/hooks/use-project-role";
import type { ModuleFlat, TestCaseDetail } from "@/types/api";

type StepDraft = {
  step_number: number;
  action: string;
  test_data: string;
  expected_result: string;
};

function parseTags(s: string): string[] | null {
  const t = s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  return t.length ? t : null;
}

export default function NewTestCasePage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const router = useRouter();
  const { isAdmin, loading: roleLoading } = useProjectRole(projectId);
  const [modules, setModules] = useState<ModuleFlat[]>([]);
  const [allReqs, setAllReqs] = useState<{ id: number; code: string; title: string }[]>([]);
  const [moduleId, setModuleId] = useState("");
  const [featureName, setFeatureName] = useState("");
  const [testScenario, setTestScenario] = useState("");
  const [description, setDescription] = useState("");
  const [testType, setTestType] = useState("functional");
  const [priority, setPriority] = useState("medium");
  const [severity, setSeverity] = useState("major");
  const [preconditions, setPreconditions] = useState("");
  const [expectedSummary, setExpectedSummary] = useState("");
  const [platform, setPlatform] = useState("");
  const [environment, setEnvironment] = useState("");
  const [tags, setTags] = useState("");
  const [status, setStatus] = useState("draft");
  const [isReusable, setIsReusable] = useState(false);
  const [reqIds, setReqIds] = useState<Set<number>>(new Set());
  const [steps, setSteps] = useState<StepDraft[]>([
    { step_number: 1, action: "", test_data: "", expected_result: "" },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void Promise.all([
      apiFetch<ModuleFlat[]>(`/api/v1/projects/${projectId}/modules`),
      apiFetch<{ id: number; code: string; title: string }[]>(`/api/v1/projects/${projectId}/requirements`),
    ]).then(([m, r]) => {
      setModules(m);
      setAllReqs(r.map((x) => ({ id: x.id, code: x.code, title: x.title })));
    });
  }, [projectId]);

  function addStep() {
    const n = steps.length + 1;
    setSteps((s) => [...s, { step_number: n, action: "", test_data: "", expected_result: "" }]);
  }

  function removeStep(i: number) {
    setSteps((s) => {
      const next = s.filter((_, j) => j !== i);
      return next.map((row, idx) => ({ ...row, step_number: idx + 1 }));
    });
  }

  function updateStep(i: number, field: keyof StepDraft, value: string) {
    setSteps((s) => {
      const next = [...s];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  }

  function toggleReq(id: number) {
    setReqIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;
    const filledSteps = steps
      .filter((st) => st.action.trim())
      .map((st, idx) => ({
        step_number: idx + 1,
        action: st.action.trim(),
        test_data: st.test_data.trim() || null,
        expected_result: st.expected_result.trim() || null,
      }));
    if (filledSteps.length === 0) {
      setError("Add at least one step with an action.");
      return;
    }
    setError(null);
    setPending(true);
    try {
      const tc = await apiFetch<TestCaseDetail>(`/api/v1/projects/${projectId}/test-cases`, {
        method: "POST",
        json: {
          module_id: moduleId === "" ? null : Number(moduleId),
          feature_name: featureName.trim() || null,
          test_scenario: testScenario.trim() || null,
          description: description.trim() || null,
          test_type: testType,
          priority,
          severity,
          preconditions: preconditions.trim() || null,
          expected_result_summary: expectedSummary.trim() || null,
          platform: platform.trim() || null,
          environment: environment.trim() || null,
          tags: parseTags(tags),
          is_reusable: isReusable,
          status,
          requirement_ids: Array.from(reqIds),
          steps: filledSteps,
        },
      });
      router.replace(`/projects/${projectId}/test-cases/${tc.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create");
    } finally {
      setPending(false);
    }
  }

  if (!roleLoading && !isAdmin) {
    return (
      <p className="text-sm text-ink-muted">
        <Link href={`/projects/${projectId}/test-cases`} className="text-accent">
          Back
        </Link>{" "}
        — admin only.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-3xl pb-16">
      <Link href={`/projects/${projectId}/test-cases`} className="text-sm text-ink-muted hover:text-ink">
        ← Test cases
      </Link>
      <h2 className="mt-4 text-lg font-semibold text-ink">New test case</h2>

      <form onSubmit={onSubmit} className="mt-8 space-y-8">
        <section className="space-y-4 rounded-xl border border-border bg-surface-muted/20 p-6">
          <h3 className="text-sm font-semibold text-ink">Summary</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-ink-muted">Feature name</label>
              <input
                className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                value={featureName}
                onChange={(e) => setFeatureName(e.target.value)}
                placeholder="Short label for lists"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-ink-muted">Test scenario</label>
              <textarea
                className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                rows={2}
                value={testScenario}
                onChange={(e) => setTestScenario(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-ink-muted">Description</label>
              <textarea
                className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
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
                    [{m.id}] {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-ink-muted">Test type</label>
              <select
                className="mt-1 w-full capitalize"
                value={testType}
                onChange={(e) => setTestType(e.target.value)}
              >
                {TEST_CASE_TYPE.map((t) => (
                  <option key={t} value={t}>
                    {t}
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
              <label className="text-xs font-medium text-ink-muted">Status</label>
              <select className="mt-1 w-full capitalize" value={status} onChange={(e) => setStatus(e.target.value)}>
                {TEST_CASE_STATUS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="reusable"
                checked={isReusable}
                onChange={(e) => setIsReusable(e.target.checked)}
              />
              <label htmlFor="reusable" className="text-sm text-ink">
                Mark as reusable template
              </label>
            </div>
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
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-ink-muted">Preconditions</label>
              <textarea
                className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                rows={2}
                value={preconditions}
                onChange={(e) => setPreconditions(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-ink-muted">Expected result (summary)</label>
              <textarea
                className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                rows={2}
                value={expectedSummary}
                onChange={(e) => setExpectedSummary(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-ink-muted">Tags</label>
              <input
                className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-surface-muted/20 p-6">
          <h3 className="text-sm font-semibold text-ink">Linked requirements</h3>
          <ul className="mt-3 max-h-40 space-y-2 overflow-y-auto">
            {allReqs.length === 0 && <li className="text-sm text-ink-muted">No requirements yet.</li>}
            {allReqs.map((r) => (
              <li key={r.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={reqIds.has(r.id)} onChange={() => toggleReq(r.id)} />
                <span className="font-mono text-xs text-ink-muted">{r.code}</span>
                <span>{r.title}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink">Structured steps</h3>
            <button
              type="button"
              onClick={addStep}
              className="text-sm font-medium text-accent hover:underline"
            >
              + Add step
            </button>
          </div>
          {steps.map((st, i) => (
            <div key={i} className="rounded-lg border border-border bg-surface p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-ink-muted">Step {i + 1}</span>
                {steps.length > 1 && (
                  <button type="button" onClick={() => removeStep(i)} className="text-xs text-red-600 hover:underline">
                    Remove
                  </button>
                )}
              </div>
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-ink-muted">Action *</label>
                  <textarea
                    required
                    className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                    rows={2}
                    value={st.action}
                    onChange={(e) => updateStep(i, "action", e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-ink-muted">Test data</label>
                  <input
                    className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                    value={st.test_data}
                    onChange={(e) => updateStep(i, "test_data", e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-ink-muted">Expected result</label>
                  <textarea
                    className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                    rows={2}
                    value={st.expected_result}
                    onChange={(e) => updateStep(i, "expected_result", e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
        </section>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? "Creating…" : "Create test case"}
        </button>
      </form>
    </div>
  );
}
