export type ProjectRole = "admin" | "viewer";

export type User = {
  id: number;
  email: string;
  full_name: string | null;
  is_active: boolean;
  created_at: string;
};

export type Project = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  client_company: string | null;
  release_version: string | null;
  status: string;
  archived_at: string | null;
  created_at: string;
};

/** Returned by `GET /api/v1/projects` with aggregate QA stats. */
export type ProjectListItem = Project & {
  test_cases_count: number;
  pass_rate_pct: number;
  open_defects_count: number;
};

export type ReusableLibraryItem = {
  id: number;
  library_code: string;
  project_id: number;
  project_code: string;
  project_name: string;
  title: string;
  category_line: string;
  description: string | null;
  test_type: string;
  priority: string;
  tags: string[] | null;
  preconditions: string | null;
};

export type ProjectMember = {
  user_id: number;
  email: string;
  full_name: string | null;
  project_id: number;
  role: ProjectRole;
};

export type ModuleNode = {
  id: number;
  project_id: number;
  parent_id: number | null;
  name: string;
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  children: ModuleNode[];
};

export type ModuleFlat = {
  id: number;
  project_id: number;
  parent_id: number | null;
  name: string;
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type Requirement = {
  id: number;
  project_id: number;
  code: string;
  title: string;
  description: string | null;
  module_id: number | null;
  priority: string;
  status: string;
  source_reference: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
};

export type RequirementListItem = Requirement & {
  linked_test_case_count: number;
  /** Present when API returns module name for the list row. */
  module_name?: string | null;
};

export type LinkedTestCaseBrief = {
  id: number;
  code: string;
  title: string;
  status: string;
  priority?: string;
};

export type RequirementDetail = Requirement & {
  test_cases: LinkedTestCaseBrief[];
  open_defects_count?: number;
  total_executions_count?: number;
  module_name?: string | null;
};

export type TestCaseStep = {
  id: number;
  test_case_id: number;
  step_number: number;
  action: string;
  test_data: string | null;
  expected_result: string | null;
};

export type TestCase = {
  id: number;
  project_id: number;
  code: string;
  module_id: number | null;
  feature_name: string | null;
  test_scenario: string | null;
  description: string | null;
  test_type: string;
  priority: string;
  severity: string;
  preconditions: string | null;
  expected_result_summary: string | null;
  platform: string | null;
  environment: string | null;
  tags: string[] | null;
  is_reusable: boolean;
  status: string;
  created_by: number | null;
  created_at: string;
  updated_at: string;
};

export type TestCaseListItem = TestCase & {
  linked_requirement_count: number;
  step_count: number;
  module_name?: string | null;
  last_run_status?: string | null;
};

export type LinkedRequirementBrief = {
  id: number;
  code: string;
  title: string;
  status: string;
};

export type TestCaseDetail = TestCase & {
  steps: TestCaseStep[];
  requirements: LinkedRequirementBrief[];
};

export type ExecutionCycle = {
  id: number;
  project_id: number;
  code: string;
  name: string;
  build_version: string | null;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

/** `GET /execution-cycles` includes per-cycle execution aggregates. */
export type ExecutionCycleListItem = ExecutionCycle & {
  total_executions: number;
  pass_count: number;
  fail_count: number;
  blocked_count: number;
  not_run_count: number;
  retest_count: number;
};

export type Execution = {
  id: number;
  project_id: number;
  code: string;
  test_case_id: number;
  requirement_id: number | null;
  execution_cycle_id: number | null;
  build_version: string | null;
  platform: string | null;
  environment: string | null;
  executed_by: number | null;
  executed_at: string;
  status: string;
  actual_result: string | null;
  retest_required: boolean;
  retest_at: string | null;
  final_status: string | null;
  comments: string | null;
  created_at: string;
};

export type ExecutionListItem = Execution & {
  test_case_code: string;
  test_case_title: string;
  execution_cycle_code: string | null;
  execution_cycle_name: string | null;
};

export type Defect = {
  id: number;
  project_id: number;
  code: string;
  title: string;
  description: string | null;
  steps_to_reproduce: string | null;
  expected_result: string | null;
  actual_result: string | null;
  severity: string;
  priority: string;
  status: string;
  assigned_to: number | null;
  reported_by: number | null;
  module_id: number | null;
  requirement_id: number | null;
  test_case_id: number | null;
  execution_id: number | null;
  created_at: string;
  updated_at: string;
};

export type Attachment = {
  id: number;
  project_id: number;
  execution_id: number | null;
  defect_id: number | null;
  original_filename: string;
  content_type: string | null;
  file_size: number;
  uploaded_by: number | null;
  uploaded_at: string;
};

export type WorkspaceRecentDefect = {
  project_id: number;
  code: string;
  title: string;
  severity: string;
  status: string;
  created_at: string;
};

export type WorkspaceRecentExecution = {
  project_id: number;
  code: string;
  test_case_code: string;
  test_case_title: string;
  status: string;
  executed_at: string;
};

export type WorkspaceProjectRow = {
  id: number;
  code: string;
  name: string;
  status: string;
  requirements_total: number;
  test_cases_total: number;
  executions_total: number;
  execution_pass_pct: number;
  requirement_coverage_pct: number;
};

export type WorkspaceDashboard = {
  requirements_total: number;
  test_cases_total: number;
  executions_total: number;
  defects_total: number;
  defects_open: number;
  defects_closed: number;
  requirement_coverage_pct: number;
  execution_pass_pct: number;
  execution_fail_pct: number;
  execution_blocked_pct: number;
  execution_not_run_pct: number;
  execution_retest_pct: number;
  executions_by_status: Record<string, number>;
  defects_by_severity: Record<string, number>;
  active_run_cycles: number;
  active_projects: number;
  projects: WorkspaceProjectRow[];
  recent_defects: WorkspaceRecentDefect[];
  recent_executions: WorkspaceRecentExecution[];
};

export type DashboardSummary = {
  project_id: number;
  requirements_total: number;
  test_cases_total: number;
  executions_total: number;
  defects_open: number;
  defects_closed: number;
  requirement_coverage_pct: number;
  execution_pass_pct: number;
  execution_fail_pct: number;
  execution_blocked_pct: number;
  execution_not_run_pct: number;
  execution_retest_pct: number;
  executions_by_status: Record<string, number>;
  defects_by_severity: Record<string, number>;
  defects_by_priority: Record<string, number>;
  executions_trend: { date: string; count: number }[];
  module_execution_summary: {
    module_id: number | null;
    module_name: string;
    total: number;
    pass: number;
    fail: number;
    blocked: number;
  }[];
};

export type RTMRequirementRow = {
  requirement_id: number;
  code: string;
  title: string;
  priority: string;
  requirement_status: string;
  module_id: number | null;
  module_name: string | null;
  linked_test_case_count: number;
  execution_count: number;
  pass_count: number;
  fail_count: number;
  blocked_count: number;
  not_run_count: number;
  retest_count: number;
  open_defects: number;
  closed_defects: number;
  coverage_pct: number;
  latest_status: string | null;
};

export type RTMModuleRow = {
  module_id: number | null;
  module_name: string | null;
  requirement_count: number;
  linked_test_case_count: number;
  execution_count: number;
  pass_count: number;
  fail_count: number;
};

export type RTMProjectSummary = {
  project_id: number;
  requirement_total: number;
  test_case_total: number;
  execution_total: number;
  defect_open: number;
  defect_closed: number;
  coverage_pct: number;
  requirement_tc_coverage_pct: number;
  passing_requirements: number;
  failing_requirements: number;
  not_covered_requirements: number;
};
