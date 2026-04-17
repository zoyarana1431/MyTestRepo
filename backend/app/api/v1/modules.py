from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, get_db_session, get_project_or_404, require_project_admin, require_project_member
from app.models.module import Module
from app.schemas.module import ModuleCreate, ModuleRead, ModuleTreeNode, ModuleUpdate

router = APIRouter(prefix="/projects/{project_id}/modules", tags=["modules"])


def _module_in_project(db: Session, project_id: int, module_id: int) -> Module | None:
    m = db.get(Module, module_id)
    if m is None or m.project_id != project_id:
        return None
    return m


def _collect_descendant_ids(db: Session, root_id: int) -> set[int]:
    out: set[int] = {root_id}
    frontier = [root_id]
    while frontier:
        pid = frontier.pop()
        children = db.execute(select(Module.id).where(Module.parent_id == pid)).scalars().all()
        for cid in children:
            if cid not in out:
                out.add(cid)
                frontier.append(cid)
    return out


def _validate_parent(db: Session, project_id: int, parent_id: int | None, exclude_module_id: int | None) -> None:
    if parent_id is None:
        return
    parent = _module_in_project(db, project_id, parent_id)
    if parent is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Parent module not in this project")
    if exclude_module_id is not None:
        desc = _collect_descendant_ids(db, exclude_module_id)
        if parent_id in desc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot set parent to this module or its descendant",
            )


def _build_tree(nodes: list[Module]) -> list[ModuleTreeNode]:
    by_parent: dict[int | None, list[Module]] = {}
    for n in nodes:
        by_parent.setdefault(n.parent_id, []).append(n)
    for lst in by_parent.values():
        lst.sort(key=lambda x: (x.sort_order, x.id))

    def walk(parent_id: int | None) -> list[ModuleTreeNode]:
        children: list[ModuleTreeNode] = []
        for m in by_parent.get(parent_id, []):
            node = ModuleTreeNode.model_validate(m)
            node.children = walk(m.id)
            children.append(node)
        return children

    return walk(None)


@router.get("/tree", response_model=list[ModuleTreeNode])
def get_module_tree(
    project_id: int,
    user: CurrentUser,
    db: Session = Depends(get_db_session),
) -> list[ModuleTreeNode]:
    require_project_member(db, user, project_id)
    get_project_or_404(db, project_id)
    nodes = list(db.execute(select(Module).where(Module.project_id == project_id)).scalars().all())
    return _build_tree(nodes)


@router.get("", response_model=list[ModuleRead])
def list_modules_flat(
    project_id: int,
    user: CurrentUser,
    db: Session = Depends(get_db_session),
) -> list[Module]:
    require_project_member(db, user, project_id)
    get_project_or_404(db, project_id)
    rows = db.execute(
        select(Module).where(Module.project_id == project_id).order_by(Module.sort_order, Module.id)
    ).scalars().all()
    return list(rows)


@router.post("", response_model=ModuleRead, status_code=status.HTTP_201_CREATED)
def create_module(
    project_id: int,
    body: ModuleCreate,
    user: CurrentUser,
    db: Session = Depends(get_db_session),
) -> Module:
    require_project_admin(db, user, project_id)
    get_project_or_404(db, project_id)
    _validate_parent(db, project_id, body.parent_id, None)
    desc = body.description.strip() if body.description and body.description.strip() else None
    mod = Module(
        project_id=project_id,
        parent_id=body.parent_id,
        name=body.name.strip(),
        description=desc,
        sort_order=body.sort_order,
    )
    db.add(mod)
    db.commit()
    db.refresh(mod)
    return mod


@router.patch("/{module_id}", response_model=ModuleRead)
def update_module(
    project_id: int,
    module_id: int,
    body: ModuleUpdate,
    user: CurrentUser,
    db: Session = Depends(get_db_session),
) -> Module:
    require_project_admin(db, user, project_id)
    mod = _module_in_project(db, project_id, module_id)
    if mod is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Module not found")
    data = body.model_dump(exclude_unset=True)
    new_parent = data.get("parent_id", mod.parent_id)
    if "parent_id" in data:
        _validate_parent(db, project_id, new_parent, mod.id)
    if "name" in data and data["name"] is not None:
        data["name"] = data["name"].strip()
    if "description" in data and data["description"] is not None:
        d = str(data["description"]).strip()
        data["description"] = d if d else None
    for k, v in data.items():
        setattr(mod, k, v)
    db.commit()
    db.refresh(mod)
    return mod


@router.delete("/{module_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_module(
    project_id: int,
    module_id: int,
    user: CurrentUser,
    db: Session = Depends(get_db_session),
) -> None:
    require_project_admin(db, user, project_id)
    mod = _module_in_project(db, project_id, module_id)
    if mod is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Module not found")
    db.delete(mod)
    db.commit()
