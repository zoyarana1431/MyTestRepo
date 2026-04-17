from pydantic import BaseModel


class RTMRequirementRow(BaseModel):
    requirement_id: int
    code: str
    title: str
    priority: str
    requirement_status: str
    module_id: int | None
    module_name: str | None
    linked_test_case_count: int
    execution_count: int
    pass_count: int
    fail_count: int
    blocked_count: int
    not_run_count: int
    retest_count: int
    open_defects: int
    closed_defects: int
    coverage_pct: float
    latest_status: str | None


class RTMModuleRow(BaseModel):
    module_id: int | None
    module_name: str | None
    requirement_count: int
    linked_test_case_count: int
    execution_count: int
    pass_count: int
    fail_count: int


class RTMProjectSummary(BaseModel):
    project_id: int
    requirement_total: int
    test_case_total: int
    execution_total: int
    defect_open: int
    defect_closed: int
    coverage_pct: float
    # QA Manager–style headline metrics (derived from requirement rows with same filters).
    requirement_tc_coverage_pct: float = 0.0
    passing_requirements: int = 0
    failing_requirements: int = 0
    not_covered_requirements: int = 0
