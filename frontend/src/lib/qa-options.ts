export const REQUIREMENT_STATUS = [
  "draft",
  "in_review",
  "approved",
  "in_progress",
  "completed",
  "deprecated",
] as const;

/** UI labels for requirement status (matches QA Manager-style wording). */
export const REQUIREMENT_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  in_review: "In Review",
  approved: "Approved",
  in_progress: "In Progress",
  completed: "Completed",
  deprecated: "Deprecated",
};

export const REQUIREMENT_PRIORITY_LABEL: Record<string, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const PRIORITY = ["low", "medium", "high", "critical"] as const;

export const TEST_CASE_STATUS = ["draft", "ready", "obsolete"] as const;

export const TEST_CASE_TYPE = [
  "functional",
  "regression",
  "smoke",
  "usability",
  "integration",
  "performance",
  "security",
  "api",
  "other",
] as const;

export const TEST_CASE_TYPE_LABEL: Record<string, string> = {
  functional: "Functional",
  regression: "Regression",
  smoke: "Smoke",
  usability: "Usability",
  integration: "Integration",
  performance: "Performance",
  security: "Security",
  api: "API",
  other: "Other",
};

export const TEST_CASE_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  ready: "Ready",
  obsolete: "Obsolete",
};

export const SEVERITY = ["minor", "major", "critical", "blocker"] as const;

export const EXECUTION_STATUS = ["pass", "fail", "blocked", "not_run", "retest"] as const;

export const EXECUTION_CYCLE_STATUS = ["planned", "active", "closed"] as const;

/** UI labels for execution cycle status (matches QA Manager-style wording). */
export const EXECUTION_CYCLE_STATUS_LABEL: Record<string, string> = {
  planned: "Planned",
  active: "In Progress",
  closed: "Completed",
};

export const DEFECT_STATUS = [
  "open",
  "in_progress",
  "resolved",
  "closed",
  "duplicate",
  "deferred",
] as const;
