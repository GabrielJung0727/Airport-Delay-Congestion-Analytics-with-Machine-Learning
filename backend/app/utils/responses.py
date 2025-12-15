from __future__ import annotations

from typing import Any, Dict
from uuid import uuid4


def wrap_response(data: Any) -> Dict[str, Any]:
    return {"data": data, "meta": {"request_id": str(uuid4())}}
