"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ModuleSubmoduleSelect } from "@/components/modules/module-submodule-select";
import { TagInput } from "@/components/requirements/tag-input";
import { apiFetch, ApiError } from "@/lib/api";
import { PRIORITY, REQUIREMENT_STATUS, REQUIREMENT_STATUS_LABEL } from "@/lib/qa-options";
import { useProjectRole } from "@/hooks/use-project-role";
import type { ModuleFlat, RequirementDetail, TestCaseListItem } from "@/types/api";

function BackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function EditRequirementPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const requirementId = params.requirementId as string;
  const router = useRouter();
  const { isAdmin, loading: roleLoading } = useProjectRole(projectId);

  const [detail, setDetail] = useState<RequirementDetail | null>(null);
  const [modules, setModules] = useState<ModuleFlat[]>([]);
  const [allTestCases, setAllTestCases] = useState<TestCaseListItem[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [moduleId, setModuleId] = useState<string>("");
  const [priority, setPriority] = useState("medium");
  const [status, setStatus] = useState("draft");
  const [sourceReference, setSourceReference] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [selectedTc, setSelectedTc] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [d, mods, tcs] = await Promise.all([
      apiFetch<RequirementDetail>(`/api/v1/projects/${projectId}/requirements/${requirementId}`),
      apiFetch<ModuleFlat[]>(`/api/v1/projects/${projectId}/modules`),
      apiFetch<TestCaseListItem[]>(`/api/v1/projects/${projectId}/test-cases`),
    ]);
    setDetail(d);
    setModules(mods);
    setAllTestCases(tcs);
    setTitle(d.title);
    setDescription(d.description ?? "");
    setModuleId(d.module_id != null ? String(d.module_id) : "");
    setPriority(d.priority);
    setStatus(d.status);
    setSourceReference(d.source_reference ?? "");
    setTags(d.tags ?? []);
    setSelectedTc(new Set(d.test_cases.map((t) => t.id)));
  }, [projectId, requirementId]);

  useEffect(() => {
    void load()
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [load]);

  async function saveMeta(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin || !detail) return;
    setPending(true);
    setError(null);
    try {
      await apiFetch(`/api/v1/projects/${projectId}/requirements/${requirementId}`, {
        method: "PATCH",
        json: {
          title: title.trim(),
          description: description.trim() || null,
          module_id: moduleId === "" ? null : Number(moduleId),
          priority,
          status,
          source_reference: sourceReference.trim() || null,
          tags: tags.length ? tags : null,
        },
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Save failed");
    } finally {
      setPending(false);
    }
  }

  async function saveLinks() {
    if (!isAdmin) return;
    setPending(true);
    setError(null);
    try {
      const d = await apiFetch<RequirementDetail>(
        `/api/v1/projects/${projectId}/requirements/${requirementId}/test-cases`,
        {
          method: "PUT",
          json: { test_case_ids: Array.from(selectedTc) },
        },
      );
      setDetail(d);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update links");
    } finally {
      setPending(false);
    }
  }

  function toggleTc(id: number) {
    setSelectedTc((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  if (loading || !detail) {
    return <p className="text-sm text-slate-500">{error ?? "Loading…"}</p>;
  }

  if (!roleLoading && !isAdmin) {
    return (
      <p className="text-sm text-slate-600">
        <Link href={`/projects/${projectId}/requirements/${requirementId}`} className="text-blue-600 hover:underline">
          Back
        </Link>{" "}
        — admin only.
      </p>
    );
  }

  const backHref = `/projects/${projectId}/requirements/${requirementId}`;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <header className="flex gap-3 border-b border-slate-100 pb-6">
          <Link
            href={backHref}
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Back to requirement"
          >
            <BackIcon />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-900">Edit Requirement</h1>
            <p className="mt-1 text-sm text-slate-500">Fill in the requirement details below.</p>
          </div>
        </header>

        <form onSubmit={(e) => void saveMeta(e)} className="mt-8 space-y-5">
          <div>
            <label className="text-sm font-medium text-slate-800">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              required
              disabled={!isAdmin || roleLoading}
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-800">Description</label>
            <textarea
              disabled={!isAdmin || roleLoading}
              className="mt-1.5 min-h-[120px] w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <ModuleSubmoduleSelect
                modules={modules}
                value={moduleId === "" ? null : Number(moduleId)}
                onChange={(id) => setModuleId(id == null ? "" : String(id))}
                disabled={!isAdmin || roleLoading}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-800">Source / Reference</label>
              <input
                disabled={!isAdmin || roleLoading}
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:opacity-60"
                value={sourceReference}
                onChange={(e) => setSourceReference(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-800">Priority</label>
              <select
                disabled={!isAdmin || roleLoading}
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm capitalize disabled:opacity-60"
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
              <label className="text-sm font-medium text-slate-800">Status</label>
              <select
                disabled={!isAdmin || roleLoading}
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:opacity-60"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {REQUIREMENT_STATUS.map((s) => (
                  <option key={s} value={s}>
                    {REQUIREMENT_STATUS_LABEL[s] ?? s}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-800">Tags</label>
            <div className="mt-1.5">
              <TagInput tags={tags} onChange={setTags} disabled={!isAdmin || roleLoading} />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-6">
            <Link
              href={backHref}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-slate-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={pending || !isAdmin}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Linked test cases</h2>
        <p className="mt-1 text-xs text-slate-500">
          Select which test cases validate this requirement. You can also link from a test case detail page.
        </p>
        <ul className="mt-4 max-h-72 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/50 p-3">
          {allTestCases.length === 0 && <li className="text-sm text-slate-500">No test cases in this project yet.</li>}
          {allTestCases.map((tc) => (
            <li key={tc.id} className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-1 rounded border-slate-300"
                checked={selectedTc.has(tc.id)}
                disabled={!isAdmin || roleLoading}
                onChange={() => toggleTc(tc.id)}
              />
              <div>
                <span className="font-mono text-xs text-slate-500">{tc.code}</span>
                <Link
                  href={`/projects/${projectId}/test-cases/${tc.id}`}
                  className="ml-2 font-medium text-blue-600 hover:underline"
                >
                  {tc.feature_name || tc.test_scenario?.slice(0, 80) || "Untitled"}
                </Link>
                <span className="ml-2 text-xs capitalize text-slate-500">{tc.status}</span>
              </div>
            </li>
          ))}
        </ul>
        {isAdmin && !roleLoading && (
          <button
            type="button"
            disabled={pending}
            onClick={() => void saveLinks()}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Save links
          </button>
        )}
      </div>
    </div>
  );
}
