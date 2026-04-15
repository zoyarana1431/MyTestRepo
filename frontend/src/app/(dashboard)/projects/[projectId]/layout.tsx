import { ProjectShell } from "@/components/shell/project-shell";

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  return <ProjectShell>{children}</ProjectShell>;
}
