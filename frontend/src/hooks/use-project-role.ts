"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import type { ProjectMember, ProjectRole } from "@/types/api";

export function useProjectRole(projectId: string) {
  const { user } = useAuth();
  const [role, setRole] = useState<ProjectRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const members = await apiFetch<ProjectMember[]>(`/api/v1/projects/${projectId}/members`);
        if (cancelled) return;
        const m = members.find((x) => x.user_id === user.id);
        setRole(m?.role ?? null);
      } catch {
        if (!cancelled) setRole(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, user]);

  return { role, loading, isAdmin: role === "admin" };
}
