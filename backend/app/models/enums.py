import enum


class ProjectRole(str, enum.Enum):
    admin = "admin"
    viewer = "viewer"


class ProjectStatus(str, enum.Enum):
    active = "active"
    archived = "archived"


class RequirementStatus(str, enum.Enum):
    draft = "draft"
    approved = "approved"
    in_progress = "in_progress"
    completed = "completed"
    deprecated = "deprecated"


class RequirementPriority(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class TestCaseStatus(str, enum.Enum):
    draft = "draft"
    ready = "ready"
    obsolete = "obsolete"


class TestCaseType(str, enum.Enum):
    functional = "functional"
    regression = "regression"
    smoke = "smoke"
    usability = "usability"
    integration = "integration"
    other = "other"


class Severity(str, enum.Enum):
    minor = "minor"
    major = "major"
    critical = "critical"
    blocker = "blocker"


class ExecutionStatus(str, enum.Enum):
    pass_ = "pass"
    fail = "fail"
    blocked = "blocked"
    not_run = "not_run"
    retest = "retest"


class ExecutionCycleStatus(str, enum.Enum):
    planned = "planned"
    active = "active"
    closed = "closed"


class DefectStatus(str, enum.Enum):
    open = "open"
    in_progress = "in_progress"
    resolved = "resolved"
    closed = "closed"
    duplicate = "duplicate"
    deferred = "deferred"
