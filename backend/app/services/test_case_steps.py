from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.models.test_case import TestCaseStep
from app.schemas.test_case import TestCaseStepCreate


def replace_test_case_steps(db: Session, test_case_id: int, steps: list[TestCaseStepCreate]) -> None:
    db.execute(delete(TestCaseStep).where(TestCaseStep.test_case_id == test_case_id))
    for s in sorted(steps, key=lambda x: x.step_number):
        db.add(
            TestCaseStep(
                test_case_id=test_case_id,
                step_number=s.step_number,
                action=s.action.strip(),
                test_data=s.test_data.strip() if s.test_data else None,
                expected_result=s.expected_result.strip() if s.expected_result else None,
            )
        )
