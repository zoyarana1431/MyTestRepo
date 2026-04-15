"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiDownloadBlob, apiFetch, apiUploadFile } from "@/lib/api";
import { DEFECT_STATUS, PRIORITY, SEVERITY } from "@/lib/qa-options";
import { useProjectRole } from "@/hooks/use-project-role";
import type { Attachment, Defect, ExecutionListItem, ModuleFlat, RequirementListItem, TestCaseListItem } from "@/types/api";

export default function DefectDetailPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const defectId = params.defectId as string;
  const router = useRouter();
  const { isAdmin } = useProjectRole(projectId);
  const [d, setD] = useState<Defect | null>(null);
  const [modules, setModules] = useState<ModuleFlat[]>([]);
  const [reqs, setReqs] = useState<RequirementListItem[]>([]);
  const [tcs, setTcs] = useState<TestCaseListItem[]>([]);
  const [exes, setExes] = useState<ExecutionListItem[]>([]);
  const [atts, setAtts] = useState<Attachment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    const [def, a] = await Promise.all([
      apiFetch<Defect>(`/api/v1/projects/${projectId}/defects/${defectId}`),
      apiFetch<Attachment[]>(`/api/v1/projects/${projectId}/defects/${defectId}/attachments`),
    ]);
    setD(def);
    setAtts(a);
  }, [projectId, defectId]);

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

  useEffect(() => {
    void load().catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin || !d) return;
    setPending(true);
    setError(null);
    try {
      await apiFetch(`/api/v1/projects/${projectId}/defects/${defectId}`, {
        method: "PATCH",
        json: {
          title: d.title,
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
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    if (!isAdmin || !d) return;
    if (!window.confirm(`Delete ${d.code}?`)) return;
    await apiFetch(`/api/v1/projects/${projectId}/defects/${defectId}`, { method: "DELETE" });
    router.replace(`/projects/${projectId}/defects`);
  }

  async function onFile(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    if (!file || !isAdmin) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      await apiUploadFile<Attachment>(`/api/v1/projects/${projectId}/defects/${defectId}/attachments`, fd);
      await load();
    } finally {
      setUploading(false);
      ev.target.value = "";
    }
  }

  async function download(att: Attachment) {
    const blob = await apiDownloadBlob(`/api/v1/projects/${projectId}/attachments/${att.id}/download`);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = att.original_filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!d) {
    return <p className="text-sm text-ink-muted">{error ?? "Loading…"}</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <Link href={`/projects/${projectId}/defects`} className="text-sm text-ink-muted hover:text-ink">
        ← Defects
      </Link>
      <h2 className="text-xl font-semibold text-ink">
        {d.title} <span className="font-mono text-sm text-ink-muted">{d.code}</span>
      </h2>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <form onSubmit={save} className="space-y-4 rounded-xl border border-border bg-surface-muted/20 p-6">
        <div>
          <label className="text-xs font-medium text-ink-muted">Title</label>
          <input
            disabled={!isAdmin}
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm disabled:opacity-60"
            value={d.title}
            onChange={(e) => setD({ ...d, title: e.target.value })}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-ink-muted">Description</label>
          <textarea
            disabled={!isAdmin}
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm disabled:opacity-60"
            rows={3}
            value={d.description ?? ""}
            onChange={(e) => setD({ ...d, description: e.target.value || null })}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-ink-muted">Steps to reproduce</label>
          <textarea
            disabled={!isAdmin}
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm disabled:opacity-60"
            rows={3}
            value={d.steps_to_reproduce ?? ""}
            onChange={(e) => setD({ ...d, steps_to_reproduce: e.target.value || null })}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-ink-muted">Expected result</label>
          <textarea
            disabled={!isAdmin}
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm disabled:opacity-60"
            rows={2}
            value={d.expected_result ?? ""}
            onChange={(e) => setD({ ...d, expected_result: e.target.value || null })}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-ink-muted">Actual result</label>
          <textarea
            disabled={!isAdmin}
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm disabled:opacity-60"
            rows={2}
            value={d.actual_result ?? ""}
            onChange={(e) => setD({ ...d, actual_result: e.target.value || null })}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="text-xs font-medium text-ink-muted">Severity</label>
            <select
              disabled={!isAdmin}
              className="mt-1 w-full capitalize disabled:opacity-60"
              value={d.severity}
              onChange={(e) => setD({ ...d, severity: e.target.value })}
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
              disabled={!isAdmin}
              className="mt-1 w-full capitalize disabled:opacity-60"
              value={d.priority}
              onChange={(e) => setD({ ...d, priority: e.target.value })}
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
            <select
              disabled={!isAdmin}
              className="mt-1 w-full disabled:opacity-60"
              value={d.status}
              onChange={(e) => setD({ ...d, status: e.target.value })}
            >
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
            disabled={!isAdmin}
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm disabled:opacity-60"
            value={d.module_id ?? ""}
            onChange={(e) =>
              setD({ ...d, module_id: e.target.value === "" ? null : Number(e.target.value) })
            }
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
            disabled={!isAdmin}
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm disabled:opacity-60"
            value={d.requirement_id ?? ""}
            onChange={(e) =>
              setD({ ...d, requirement_id: e.target.value === "" ? null : Number(e.target.value) })
            }
          >
            <option value="">— None —</option>
            {reqs.map((r) => (
              <option key={r.id} value={r.id}>
                {r.code}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-ink-muted">Test case</label>
          <select
            disabled={!isAdmin}
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm disabled:opacity-60"
            value={d.test_case_id ?? ""}
            onChange={(e) =>
              setD({ ...d, test_case_id: e.target.value === "" ? null : Number(e.target.value) })
            }
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
            disabled={!isAdmin}
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm disabled:opacity-60"
            value={d.execution_id ?? ""}
            onChange={(e) =>
              setD({ ...d, execution_id: e.target.value === "" ? null : Number(e.target.value) })
            }
          >
            <option value="">— None —</option>
            {exes.map((x) => (
              <option key={x.id} value={x.id}>
                {x.code}
              </option>
            ))}
          </select>
        </div>
        {isAdmin && (
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => void remove()}
              className="rounded-md border border-red-300 px-4 py-2 text-sm text-red-700"
            >
              Delete
            </button>
          </div>
        )}
      </form>

      <div className="rounded-xl border border-border bg-surface-muted/20 p-6">
        <h3 className="text-sm font-semibold text-ink">Attachments</h3>
        {isAdmin && (
          <input type="file" disabled={uploading} onChange={(e) => void onFile(e)} className="mt-3 text-sm" />
        )}
        <ul className="mt-4 space-y-2">
          {atts.map((a) => (
            <li key={a.id} className="flex justify-between text-sm">
              <span>{a.original_filename}</span>
              <button type="button" className="text-accent hover:underline" onClick={() => void download(a)}>
                Download
              </button>
            </li>
          ))}
          {atts.length === 0 && <li className="text-ink-muted">No files.</li>}
        </ul>
      </div>
    </div>
  );
}
