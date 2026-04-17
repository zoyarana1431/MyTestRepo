"""
Uvicorn entry shim so this works from the `backend` folder:

    uvicorn main:app --reload --port 8000

The real FastAPI app is defined in `app.main`.
"""

from app.main import app

__all__ = ["app"]
