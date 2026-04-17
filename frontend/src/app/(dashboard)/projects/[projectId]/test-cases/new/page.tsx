"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ModuleSubmoduleSelect } from "@/components/modules/module-submodule-select";
import { TagInput } from "@/components/requirements/tag-input";
import { apiFetch, ApiError } from "@/lib/api";
import {
  PRIORITY,
  SEVERITY,
  TEST_CASE_STATUS,
  TEST_CASE_STATUS_LABEL,
  TEST_CASE_TYPE,
  TEST_CASE_TYPE_LABEL,
} from "@/lib/qa-options";
import { useProjectRole } from "@/hooks/use-project-role";
import type { ModuleFlat, TestCaseDetail } from "@/types/api";

type StepDraft = {
  step_number: number;
  action: string;
  test_data: string;
  expected_result: string;
};

function BackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function NewTestCasePage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const router = useRouter();
  const { isAdmin, loading: roleLoading } = useProjectRole(projectId);
  const [modules, setModules] = useState<ModuleFlat[]>([]);
  const [allReqs, setAllReqs] = useState<{ id: number; code: string; title: string }[]>([]);
  const [moduleId, setModuleId] = useState("");
  const [title, setTitle] = useState("");
  const [featureName, setFeatureName] = useState("");
  const [scenarioLine, setScenarioLine] = useState("");
  const [description, setDescription] = useState("");
  const [testType, setTestType] = useState("functional");
  const [priority, setPriority] = useState("medium");
  const [severity, setSeverity] = useState("major");
  const [preconditions, setPreconditions] = useState("");
  const [expectedSummary, setExpectedSummary] = useState("");
  const [platform, setPlatform] = useState("");
  const [environment, setEnvironment] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [status, setStatus] = useState("draft");
  const [isReusable, setIsReusable] = useState(false);
  const [reqIds, setReqIds] = useState<Set<number>>(new Set());
  const [steps, setSteps] = useState<StepDraft[]>([
    { step_number: 1, action: "", test_data: "", expected_result: "" },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const listHref = `/projects/${projectId}/test-cases`;

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
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (filledSteps.length === 0) {
      setError("Add at least one step with an action.");
      return;
    }
    setError(null);
    setPending(true);
    try {
      const scenarioBody =
        title.trim() + (scenarioLine.trim() ? `\n\n${scenarioLine.trim()}` : "");
      const tc = await apiFetch<TestCaseDetail>(`/api/v1/projects/${projectId}/test-cases`, {
        method: "POST",
        json: {
          module_id: moduleId === "" ? null : Number(moduleId),
          feature_name: featureName.trim() || null,
          test_scenario: scenarioBody,
          description: description.trim() || null,
          test_type: testType,
          priority,
          severity,
          preconditions: preconditions.trim() || null,
          expected_result_summary: expectedSummary.trim() || null,
          platform: platform.trim() || null,
          environment: environment.trim() || null,
          tags: tags.length ? tags : null,
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
      <p className="text-sm text-slate-600">
        <Link href={listHref} className="text-blue-600 hover:underline">
          Back
        </Link>{" "}
        — admin only.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-6xl pb-16">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <header className="flex gap-3 border-b border-slate-100 pb-6">
          <Link
            href={listHref}
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Back to test cases"
          >
            <BackIcon />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900">New Test Case</h1>
            <p className="mt-1 text-sm text-slate-500">Complete all relevant fields for quality documentation.</p>
          </div>
        </header>

        <form onSubmit={(e) => void onSubmit(e)} className="mt-8 space-y-10">
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="space-y-5 lg:col-span-2">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wide text-blue-600">Basic info</h2>
                <div className="mt-4 space-y-5">
                  <div>
                    <label className="text-sm font-medium text-slate-800">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      required
                      className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Test case title..."
                    />
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-slate-800">Feature / Area</label>
                      <input
                        className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={featureName}
                        onChange={(e) => setFeatureName(e.target.value)}
                        placeholder="e.g. User Authentication"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-800">Test Scenario</label>
                      <input
                        className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={scenarioLine}
                        onChange={(e) => setScenarioLine(e.target.value)}
                        placeholder="e.g. Login with valid credentials"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-800">Description</label>
                    <textarea
                      className="mt-1.5 min-h-[100px] w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Test case description..."
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-800">Preconditions</label>
                    <textarea
                      className="mt-1.5 min-h-[88px] w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={preconditions}
                      onChange={(e) => setPreconditions(e.target.value)}
                      placeholder="Prerequisites before executing this test..."
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-800">Expected Result Summary</label>
                    <textarea
                      className="mt-1.5 min-h-[88px] w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={expectedSummary}
                      onChange={(e) => setExpectedSummary(e.target.value)}
                      placeholder="Overall expected outcome..."
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6 lg:col-span-1">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wide text-blue-600">Classification</h2>
                <div className="mt-4 space-y-4">
                  <ModuleSubmoduleSelect
                    modules={modules}
                    value={moduleId === "" ? null : Number(moduleId)}
                    onChange={(id) => setModuleId(id == null ? "" : String(id))}
                  />
                  <div>
                    <label className="text-sm font-medium text-slate-800">Test Type</label>
                    <select
                      className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm capitalize focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={testType}
                      onChange={(e) => setTestType(e.target.value)}
                    >
                      {TEST_CASE_TYPE.map((t) => (
                        <option key={t} value={t}>
                          {TEST_CASE_TYPE_LABEL[t] ?? t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-800">Priority</label>
                    <select
                      className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm capitalize focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                    >
                      {PRIORITY.map((p) => (
                        <option key={p} value={p}>
                          {p.charAt(0).toUpperCase() + p.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-800">Severity</label>
                    <select
                      className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm capitalize focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={severity}
                      onChange={(e) => setSeverity(e.target.value)}
                    >
                      {SEVERITY.map((s) => (
                        <option key={s} value={s}>
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-800">Status</label>
                    <select
                      className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      {TEST_CASE_STATUS.map((s) => (
                        <option key={s} value={s}>
                          {TEST_CASE_STATUS_LABEL[s] ?? s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-800">Platform</label>
                    <input
                      className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={platform}
                      onChange={(e) => setPlatform(e.target.value)}
                      placeholder="Web / Chrome, iOS, Android..."
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-800">Environment</label>
                    <input
                      className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={environment}
                      onChange={(e) => setEnvironment(e.target.value)}
                      placeholder="Staging, Production, QA..."
                    />
                  </div>
                  <label className="flex cursor-pointer items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      checked={isReusable}
                      onChange={(e) => setIsReusable(e.target.checked)}
                    />
                    <span className="text-sm font-medium text-slate-800">Mark as Reusable</span>
                  </label>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-6">
                <h2 className="text-xs font-bold uppercase tracking-wide text-blue-600">Link requirements</h2>
                <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                  {allReqs.length === 0 && <li className="text-sm text-slate-500">No requirements yet.</li>}
                  {allReqs.map((r) => (
                    <li key={r.id} className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="mt-0.5 rounded border-slate-300"
                        checked={reqIds.has(r.id)}
                        onChange={() => toggleReq(r.id)}
                      />
                      <span>
                        <span className="font-mono text-xs font-semibold text-blue-600">{r.code}</span>{" "}
                        <span className="text-slate-800">{r.title}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="border-t border-slate-100 pt-6">
                <h2 className="text-xs font-bold uppercase tracking-wide text-blue-600">Tags</h2>
                <div className="mt-3">
                  <TagInput tags={tags} onChange={setTags} placeholder="Add tag..." />
                </div>
              </div>
            </div>
          </div>

          <section className="border-t border-slate-100 pt-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wide text-blue-600">Test steps</h2>
              <button
                type="button"
                onClick={addStep}
                className="text-sm font-semibold text-blue-600 hover:text-blue-800"
              >
                + Add Step
              </button>
            </div>
            <div className="space-y-4">
              {steps.map((st, i) => (
                <div key={i} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs text-white">
                        {i + 1}
                      </span>
                      Step {i + 1}
                    </span>
                    {steps.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeStep(i)}
                        className="text-slate-400 hover:text-red-600"
                        aria-label="Remove step"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                          <path
                            d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0v14a1 1 0 01-1 1H8a1 1 0 01-1-1V7h14z"
                            stroke="currentColor"
                            strokeWidth="2"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-slate-700">
                        Action <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        required
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        rows={2}
                        value={st.action}
                        onChange={(e) => updateStep(i, "action", e.target.value)}
                        placeholder="Describe the action to perform..."
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-700">Test Data</label>
                      <textarea
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        rows={2}
                        value={st.test_data}
                        onChange={(e) => updateStep(i, "test_data", e.target.value)}
                        placeholder="Input data, credentials, parameters..."
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-700">
                        Expected Result <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        rows={2}
                        value={st.expected_result}
                        onChange={(e) => updateStep(i, "expected_result", e.target.value)}
                        placeholder="What should happen after this step..."
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-6">
            <Link
              href={listHref}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-slate-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={pending || !isAdmin}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {pending ? "Creating…" : "Create Test Case"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
