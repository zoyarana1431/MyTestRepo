export const REQUIREMENT_STATUS = [
  "draft",
  "approved",
  "in_progress",
  "completed",
  "deprecated",
] as const;

export const PRIORITY = ["low", "medium", "high", "critical"] as const;

export const TEST_CASE_STATUS = ["draft", "ready", "obsolete"] as const;

export const TEST_CASE_TYPE = [
  "functional",
  "regression",
  "smoke",
  "usability",
  "integration",
  "other",
] as const;

export const SEVERITY = ["minor", "major", "critical", "blocker"] as const;

export const EXECUTION_STATUS = ["pass", "fail", "blocked", "not_run", "retest"] as const;

export const EXECUTION_CYCLE_STATUS = ["planned", "active", "closed"] as const;

export const DEFECT_STATUS = [
  "open",
  "in_progress",
  "resolved",
  "closed",
  "duplicate",
  "deferred",
] as const;
