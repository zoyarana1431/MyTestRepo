"use client";

/** Layout wrapper for project routes; primary navigation lives in AppShell. */
export function ProjectShell({ children }: { children: React.ReactNode }) {
  return <div className="min-w-0">{children}</div>;
}
