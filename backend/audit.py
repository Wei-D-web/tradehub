"""
TradeHub audit logging — records sensitive operations for traceability.
Uses SQLite table (no external service needed).
"""
import datetime
from typing import Optional

from sqlalchemy.orm import Session

from models import AuditLog  # imported after models.py is updated


def audit_log(
    db: Session,
    action: str,
    target_type: str,
    target_id: Optional[int],
    operator_ip: str,
    summary: str,
) -> None:
    """
    Record a sensitive operation in the audit trail.

    Args:
        db: SQLAlchemy session
        action: e.g. 'create', 'delete', 'update_amount', 'sign'
        target_type: e.g. 'customer', 'order', 'invoice', 'contract'
        target_id: primary key of the affected record (or None)
        operator_ip: client IP address
        summary: human-readable one-liner (Chinese ok)
    """
    try:
        entry = AuditLog(
            timestamp=datetime.datetime.utcnow(),
            action=action,
            target_type=target_type,
            target_id=target_id,
            operator_ip=operator_ip,
            summary=summary[:500],  # truncate to DB column size
        )
        db.add(entry)
        db.commit()
    except Exception:
        # Audit failure must never break business operations
        db.rollback()
