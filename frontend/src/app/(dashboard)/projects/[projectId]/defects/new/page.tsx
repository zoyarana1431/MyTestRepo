"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ReportDefectModal } from "@/components/defects/report-defect-modal";
import { useProjectRole } from "@/hooks/use-project-role";

export default function NewDefectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const { isAdmin, loading } = useProjectRole(projectId);

  if (!loading && !isAdmin) {
    return (
      <p className="text-sm text-ink-muted">
        <Link href={`/projects/${projectId}/defects`} className="text-blue-600 hover:underline">
          Back to Defects
        </Link>{" "}
        — admin only.
      </p>
    );
  }

  if (loading) {
    return <p className="text-sm text-ink-muted">Loading…</p>;
  }

  return (
    <ReportDefectModal
      open
      projectId={projectId}
      onClose={() => router.push(`/projects/${projectId}/defects`)}
      onCreated={(d) => router.replace(`/projects/${projectId}/defects/${d.id}`)}
    />
  );
}
