"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { useProjectRole } from "@/hooks/use-project-role";
import type { ProjectMember, ProjectRole } from "@/types/api";

export default function ProjectSettingsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { user } = useAuth();
  const { isAdmin } = useProjectRole(projectId);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<ProjectRole>("viewer");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const list = await apiFetch<ProjectMember[]>(`/api/v1/projects/${projectId}/members`);
    setMembers(list);
  }, [projectId]);

  useEffect(() => {
    void load()
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [load]);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;
    setError(null);
    try {
      await apiFetch<ProjectMember>(`/api/v1/projects/${projectId}/members`, {
        method: "POST",
        json: { email: email.trim(), role: inviteRole },
      });
      setEmail("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Invite failed");
    }
  }

  async function setRole(targetUserId: number, role: ProjectRole) {
    if (!isAdmin) return;
    setError(null);
    try {
      await apiFetch(`/api/v1/projects/${projectId}/members/${targetUserId}`, {
        method: "PATCH",
        json: { role },
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Update failed");
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="text-lg font-semibold text-ink">Team & access</h2>
      <p className="mt-1 text-sm text-ink-muted">
        <strong className="text-ink">Admins</strong> manage structure, modules, and membership.{" "}
        <strong className="text-ink">Viewers</strong> can browse the workspace read-only.
      </p>

      {loading && <p className="mt-6 text-sm text-ink-muted">Loading…</p>}
      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

      {!loading && (
        <div className="mt-8 overflow-hidden rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-muted/80 text-xs font-semibold uppercase text-ink-muted">
              <tr>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Role</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.user_id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink">{m.full_name || m.email}</div>
                    <div className="text-xs text-ink-muted">{m.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    {isAdmin && m.user_id !== user?.id ? (
                      <select
                        className="rounded-md border border-border bg-surface px-2 py-1 text-sm"
                        value={m.role}
                        onChange={(e) => void setRole(m.user_id, e.target.value as ProjectRole)}
                      >
                        <option value="admin">Admin</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    ) : (
                      <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium capitalize text-ink">
                        {m.role}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isAdmin && (
        <form onSubmit={invite} className="mt-8 space-y-4 rounded-xl border border-border bg-surface-muted/20 p-6">
          <h3 className="text-sm font-semibold text-ink">Invite by email</h3>
          <p className="text-xs text-ink-muted">The person must already have an account. Share the register link first if needed.</p>
          <div className="flex flex-wrap gap-3">
            <input
              type="email"
              required
              placeholder="colleague@company.com"
              className="min-w-[200px] flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <select
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as ProjectRole)}
            >
              <option value="viewer">Viewer</option>
              <option value="admin">Admin</option>
            </select>
            <button
              type="submit"
              className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
            >
              Add member
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
