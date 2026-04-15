from fastapi import APIRouter

from app.api.v1 import (
    attachments,
    auth,
    dashboard_reporting,
    defects,
    execution_cycles,
    executions,
    modules,
    projects,
    requirements,
    rtm,
    test_cases,
)

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(projects.router)
api_router.include_router(modules.router)
api_router.include_router(requirements.router)
api_router.include_router(test_cases.router)
api_router.include_router(execution_cycles.router)
api_router.include_router(executions.router)
api_router.include_router(defects.router)
api_router.include_router(attachments.router)
api_router.include_router(rtm.router)
api_router.include_router(dashboard_reporting.router)
