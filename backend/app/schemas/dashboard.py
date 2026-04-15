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
