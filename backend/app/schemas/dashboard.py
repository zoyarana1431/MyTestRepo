from datetime import datetime

from pydantic import BaseModel


class DashboardSummary(BaseModel):
    project_id: int
    requirements_total: int
    test_cases_total: int
    executions_total: int
    defects_open: int
    defects_closed: int
    requirement_coverage_pct: float

    execution_pass_pct: float
    execution_fail_pct: float
    execution_blocked_pct: float
    execution_not_run_pct: float
    execution_retest_pct: float

    executions_by_status: dict[str, int]
    defects_by_severity: dict[str, int]
    defects_by_priority: dict[str, int]
    executions_trend: list[dict[str, int | str]]
    module_execution_summary: list[dict[str, int | str | None]]


class WorkspaceRecentDefect(BaseModel):
    project_id: int
    code: str
    title: str
    severity: str
    status: str
    created_at: datetime


class WorkspaceRecentExecution(BaseModel):
    project_id: int
    code: str
    test_case_code: str
    test_case_title: str
    status: str
    executed_at: datetime


class WorkspaceProjectRow(BaseModel):
    id: int
    code: str
    name: str
    status: str
    requirements_total: int
    test_cases_total: int
    executions_total: int
    execution_pass_pct: float
    requirement_coverage_pct: float


class WorkspaceDashboard(BaseModel):
    """Aggregated metrics across all projects the user can access (SQLite-backed)."""

    requirements_total: int
    test_cases_total: int
    executions_total: int
    defects_total: int
    defects_open: int
    defects_closed: int
    requirement_coverage_pct: float
    execution_pass_pct: float
    execution_fail_pct: float
    execution_blocked_pct: float
    execution_not_run_pct: float
    execution_retest_pct: float
    executions_by_status: dict[str, int]
    defects_by_severity: dict[str, int]
    active_run_cycles: int
    active_projects: int
    projects: list[WorkspaceProjectRow]
    recent_defects: list[WorkspaceRecentDefect]
    recent_executions: list[WorkspaceRecentExecution]
