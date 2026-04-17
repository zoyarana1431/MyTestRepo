import { REQUIREMENT_PRIORITY_LABEL, TEST_CASE_TYPE_LABEL } from "@/lib/qa-options";

/** Split stored `test_scenario` into title + optional scenario line (matches new/edit forms). */
export function parseTestScenarioBody(raw: string | null): { title: string; scenarioLine: string } {
  const s = raw?.trim() ?? "";
  if (!s) return { title: "", scenarioLine: "" };
  const idx = s.indexOf("\n\n");
  if (idx !== -1) {
    return { title: s.slice(0, idx).trim(), scenarioLine: s.slice(idx + 2).trim() };
  }
  const lines = s.split(/\n+/);
  const firstLine = lines[0]?.trim() ?? "";
  const rest = lines.slice(1).join("\n").trim();
  return { title: firstLine, scenarioLine: rest };
}

export function testCaseListHeading(tc: {
  test_scenario: string | null;
  feature_name: string | null;
}): { primary: string; secondary: string | null } {
  const raw = tc.test_scenario?.trim() || "";
  const firstLine = raw.split(/\n+/)[0]?.trim() || "";
  const fe = tc.feature_name?.trim() || "";
  if (firstLine && fe) return { primary: firstLine, secondary: fe };
  if (firstLine) return { primary: firstLine, secondary: null };
  if (fe) return { primary: fe, secondary: null };
  return { primary: "(Untitled)", secondary: null };
}

export function testTypeLabel(t: string): string {
  return TEST_CASE_TYPE_LABEL[t] ?? t;
}

export function priorityPillClass(priority: string): string {
  const p = priority.toLowerCase();
  if (p === "critical") return "bg-red-50 text-red-800 ring-red-100";
  if (p === "high") return "bg-orange-50 text-orange-900 ring-orange-100";
  if (p === "medium") return "bg-blue-50 text-blue-800 ring-blue-100";
  if (p === "low") return "bg-slate-100 text-slate-700 ring-slate-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

export function priorityLabel(priority: string): string {
  return REQUIREMENT_PRIORITY_LABEL[priority] ?? priority;
}

export function severityPillClass(severity: string): string {
  const s = severity.toLowerCase();
  if (s === "critical" || s === "blocker") return "bg-red-50 text-red-800 ring-red-100";
  if (s === "major") return "bg-orange-50 text-orange-900 ring-orange-100";
  if (s === "minor") return "bg-blue-50 text-blue-800 ring-blue-100";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

export function severityLabel(severity: string): string {
  const m: Record<string, string> = {
    critical: "Critical",
    major: "Major",
    minor: "Minor",
    blocker: "Blocker",
  };
  return m[severity.toLowerCase()] ?? severity;
}

export function lastRunDotClass(status: string): string {
  const s = status.toLowerCase();
  if (s === "pass") return "bg-emerald-500";
  if (s === "fail") return "bg-red-500";
  if (s === "blocked") return "bg-amber-400";
  if (s === "not_run") return "bg-slate-400";
  if (s === "retest") return "bg-violet-500";
  return "bg-slate-400";
}

export function lastRunPillClass(status: string): string {
  const s = status.toLowerCase();
  if (s === "pass") return "bg-emerald-50 text-emerald-800 ring-emerald-100";
  if (s === "fail") return "bg-red-50 text-red-800 ring-red-100";
  if (s === "blocked") return "bg-amber-50 text-amber-900 ring-amber-100";
  if (s === "not_run") return "bg-slate-100 text-slate-600 ring-slate-200";
  if (s === "retest") return "bg-violet-50 text-violet-800 ring-violet-100";
  return "bg-slate-100 text-slate-600 ring-slate-200";
}

export function lastRunLabel(status: string | null | undefined): string {
  if (!status) return "—";
  const s = status.toLowerCase();
  const m: Record<string, string> = {
    pass: "Pass",
    fail: "Fail",
    blocked: "Blocked",
    not_run: "Not run",
    retest: "Retest",
  };
  return m[s] ?? status;
}

export function defectStatusLabel(status: string): string {
  const s = status.toLowerCase();
  const m: Record<string, string> = {
    open: "Open",
    in_progress: "In Progress",
    resolved: "Resolved",
    closed: "Closed",
    duplicate: "Duplicate",
    deferred: "Deferred",
  };
  return m[s] ?? status;
}

export function defectStatusDotClass(status: string): string {
  const s = status.toLowerCase();
  if (s === "open") return "bg-red-500";
  if (s === "in_progress") return "bg-amber-400";
  if (s === "resolved") return "bg-emerald-500";
  if (s === "closed") return "bg-slate-400";
  if (s === "duplicate") return "bg-violet-500";
  if (s === "deferred") return "bg-slate-400";
  return "bg-slate-400";
}

export function defectStatusPillClass(status: string): string {
  const s = status.toLowerCase();
  if (s === "open") return "bg-red-50 text-red-800 ring-red-100";
  if (s === "in_progress") return "bg-amber-50 text-amber-900 ring-amber-100";
  if (s === "resolved") return "bg-emerald-50 text-emerald-800 ring-emerald-100";
  if (s === "closed") return "bg-slate-100 text-slate-700 ring-slate-200";
  if (s === "duplicate") return "bg-violet-50 text-violet-800 ring-violet-100";
  if (s === "deferred") return "bg-slate-100 text-slate-600 ring-slate-200";
  return "bg-slate-100 text-slate-600 ring-slate-200";
}
