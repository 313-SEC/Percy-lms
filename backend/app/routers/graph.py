"""Knowledge graph endpoint."""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.course import Course, Module
from app.models.learning import Note
from app.models.user import User
from app.utils.deps import get_current_user, get_db

router = APIRouter(prefix="/graph", tags=["graph"])

@router.get("")
async def get_knowledge_graph(db: AsyncSession = Depends(get_db), _user: User = Depends(get_current_user)):
    """Return nodes and edges for the knowledge graph visualization."""
    courses_result = await db.execute(select(Course))
    courses = courses_result.scalars().all()

    modules_result = await db.execute(select(Module))
    modules = modules_result.scalars().all()

    notes_result = await db.execute(select(Note).limit(100))
    notes = notes_result.scalars().all()

    nodes = []
    edges = []

    for c in courses:
        nodes.append({"id": f"course_{c.id}", "label": c.title, "type": "course", "size": 5, "color": c.color or "#00ffff"})

    for m in modules:
        nodes.append({"id": f"module_{m.id}", "label": m.title, "type": "module", "size": 3, "color": "#9d00ff"})
        edges.append({"source": f"course_{m.course_id}", "target": f"module_{m.id}", "label": "contains"})

    for n in notes:
        nodes.append({"id": f"note_{n.id}", "label": n.title, "type": "note", "size": 2, "color": "#39ff14"})
        if n.course_id:
            edges.append({"source": f"course_{n.course_id}", "target": f"note_{n.id}", "label": "note"})
        elif n.content_id:
            edges.append({"source": f"note_{n.id}", "target": f"note_{n.id}", "label": "note"})

    return {"nodes": nodes, "edges": edges}
