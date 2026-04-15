from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.id_sequence import IdSequence


def next_code(db: Session, key: str, prefix: str, width: int = 3) -> str:
    row = db.execute(select(IdSequence).where(IdSequence.key == key).with_for_update()).scalar_one_or_none()
    if row is None:
        row = IdSequence(key=key, value=0)
        db.add(row)
        db.flush()
    row.value += 1
    db.flush()
    return f"{prefix}-{row.value:0{width}d}"
