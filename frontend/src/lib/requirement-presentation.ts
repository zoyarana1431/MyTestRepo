import { REQUIREMENT_PRIORITY_LABEL, REQUIREMENT_STATUS_LABEL } from "@/lib/qa-options";

export function requirementStatusLabel(status: string): string {
  return REQUIREMENT_STATUS_LABEL[status] ?? status.replace(/_/g, " ");
}

export function requirementPriorityLabel(priority: string): string {
  return REQUIREMENT_PRIORITY_LABEL[priority] ?? priority;
}

export function priorityPillClass(priority: string): string {
  const p = priority.toLowerCase();
  if (p === "critical") return "bg-red-50 text-red-800 ring-red-100";
  if (p === "high") return "bg-orange-50 text-orange-900 ring-orange-100";
  if (p === "medium") return "bg-blue-50 text-blue-800 ring-blue-100";
  if (p === "low") return "bg-slate-100 text-slate-700 ring-slate-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

export function statusDotClass(status: string): string {
  const s = status.toLowerCase();
  if (s === "approved") return "bg-emerald-500";
  if (s === "draft") return "bg-slate-400";
  if (s === "in_review") return "bg-blue-500";
  if (s === "deprecated") return "bg-slate-400";
  if (s === "in_progress") return "bg-amber-500";
  if (s === "completed") return "bg-emerald-600";
  return "bg-slate-400";
}

export function tcStatusBadgeClass(status: string): string {
  const s = status.toLowerCase();
  if (s === "ready") return "bg-emerald-50 text-emerald-800 ring-emerald-100";
  if (s === "draft") return "bg-slate-100 text-slate-700 ring-slate-200";
  if (s === "obsolete") return "bg-slate-200 text-slate-600 ring-slate-300";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}
