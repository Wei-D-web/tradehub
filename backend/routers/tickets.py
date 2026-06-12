"""After-Sales Ticket CRUD + lifecycle + comments."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import AfterSalesTicket, TicketComment, Order, Customer, Technician
from schemas import TicketCreate, TicketUpdate, TicketOut, TicketCommentCreate, TicketCommentOut, MsgResponse

router = APIRouter(prefix="/api/tickets", tags=["tickets"])


def _enrich(t: AfterSalesTicket) -> TicketOut:
    d = TicketOut.model_validate(t)
    d.order_no = t.order.order_no if t.order else ""
    d.customer_name = t.customer.name if t.customer else ""
    if t.technician:
        d.technician_name = t.technician.name
    return d


@router.get("", response_model=list[TicketOut])
def list_tickets(
    status: str = "",
    priority: str = "",
    assigned_to: int | None = None,
    db: Session = Depends(get_db),
):
    q = db.query(AfterSalesTicket).order_by(AfterSalesTicket.updated_at.desc())
    if status:
        q = q.filter(AfterSalesTicket.status == status)
    if priority:
        q = q.filter(AfterSalesTicket.priority == priority)
    if assigned_to is not None:
        q = q.filter(AfterSalesTicket.assigned_to == assigned_to)
    return [_enrich(r) for r in q.all()]


@router.get("/{tid}", response_model=TicketOut)
def get_ticket(tid: int, db: Session = Depends(get_db)):
    t = db.query(AfterSalesTicket).get(tid)
    if not t:
        raise HTTPException(404, "工单不存在")
    return _enrich(t)


@router.post("", response_model=TicketOut)
def create_ticket(body: TicketCreate, db: Session = Depends(get_db)):
    t = AfterSalesTicket(**body.model_dump())
    db.add(t)
    db.commit()
    db.refresh(t)
    return _enrich(t)


@router.put("/{tid}", response_model=TicketOut)
def update_ticket(tid: int, body: TicketUpdate, db: Session = Depends(get_db)):
    t = db.query(AfterSalesTicket).get(tid)
    if not t:
        raise HTTPException(404, "工单不存在")

    old_status = t.status

    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(t, k, v)

    if body.status and body.status == "resolved" and old_status != "resolved":
        t.resolved_at = datetime.utcnow()

    db.commit()
    db.refresh(t)
    return _enrich(t)


@router.delete("/{tid}", response_model=MsgResponse)
def delete_ticket(tid: int, db: Session = Depends(get_db)):
    t = db.query(AfterSalesTicket).get(tid)
    if not t:
        raise HTTPException(404, "工单不存在")
    db.delete(t)
    db.commit()
    return {"ok": True, "message": "已删除"}


# ── Comments ──

@router.get("/{tid}/comments", response_model=list[TicketCommentOut])
def list_comments(tid: int, db: Session = Depends(get_db)):
    return db.query(TicketComment).filter(
        TicketComment.ticket_id == tid
    ).order_by(TicketComment.created_at).all()


@router.post("/{tid}/comments", response_model=TicketCommentOut)
def add_comment(tid: int, body: TicketCommentCreate, db: Session = Depends(get_db)):
    t = db.query(AfterSalesTicket).get(tid)
    if not t:
        raise HTTPException(404, "工单不存在")
    c = TicketComment(ticket_id=tid, **body.model_dump())
    db.add(c)
    db.commit()
    db.refresh(c)
    return c
