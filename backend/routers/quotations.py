"""Quotation CRUD + status lifecycle."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Quotation, Customer
from schemas import QuotationCreate, QuotationUpdate, QuotationOut, MsgResponse

router = APIRouter(prefix="/api/quotations", tags=["quotations"])


@router.get("", response_model=list[QuotationOut])
def list_quotations(status: str = "", customer_id: int | None = None, db: Session = Depends(get_db)):
    q = db.query(Quotation)
    if status:
        q = q.filter(Quotation.status == status)
    if customer_id:
        q = q.filter(Quotation.customer_id == customer_id)
    rows = q.order_by(Quotation.updated_at.desc()).all()
    return [_enrich(r) for r in rows]


@router.get("/{qid}", response_model=QuotationOut)
def get_quotation(qid: int, db: Session = Depends(get_db)):
    r = db.query(Quotation).get(qid)
    if not r:
        raise HTTPException(404, "报价单不存在")
    return _enrich(r)


@router.post("", response_model=QuotationOut)
def create_quotation(body: QuotationCreate, db: Session = Depends(get_db)):
    items = [it.model_dump() for it in body.items]
    subtotal = sum(it.amount for it in body.items)
    total = subtotal + body.tax
    q = Quotation(
        customer_id=body.customer_id,
        title=body.title,
        items=items,
        subtotal=subtotal,
        tax=body.tax,
        total=total,
        currency=body.currency,
        valid_until=body.valid_until,
        notes=body.notes,
        status="draft",
    )
    db.add(q)
    db.commit()
    db.refresh(q)
    return _enrich(q)


@router.put("/{qid}", response_model=QuotationOut)
def update_quotation(qid: int, body: QuotationUpdate, db: Session = Depends(get_db)):
    q = db.query(Quotation).get(qid)
    if not q:
        raise HTTPException(404, "报价单不存在")

    # Apply tax first so total calculation uses the correct value
    if body.tax is not None:
        q.tax = body.tax

    if body.items is not None:
        items = [it.model_dump() for it in body.items]
        q.items = items
        q.subtotal = sum(it.amount for it in body.items)
        q.total = q.subtotal + q.tax

    # Apply remaining fields (skip items/tax already handled)
    for k, v in body.model_dump(exclude_unset=True).items():
        if k in ("items", "tax"):
            continue
        setattr(q, k, v)

    db.commit()
    db.refresh(q)
    return _enrich(q)


@router.delete("/{qid}", response_model=MsgResponse)
def delete_quotation(qid: int, db: Session = Depends(get_db)):
    q = db.query(Quotation).get(qid)
    if not q:
        raise HTTPException(404, "报价单不存在")
    db.delete(q)
    db.commit()
    return {"ok": True, "message": "已删除"}


@router.post("/{qid}/send", response_model=QuotationOut)
def send_quotation(qid: int, db: Session = Depends(get_db)):
    q = db.query(Quotation).get(qid)
    if not q:
        raise HTTPException(404, "报价单不存在")
    q.status = "sent"
    db.commit()
    db.refresh(q)
    return _enrich(q)


@router.post("/{qid}/accept", response_model=QuotationOut)
def accept_quotation(qid: int, db: Session = Depends(get_db)):
    q = db.query(Quotation).get(qid)
    if not q:
        raise HTTPException(404, "报价单不存在")
    q.status = "accepted"
    db.commit()
    db.refresh(q)
    return _enrich(q)


def _enrich(r: Quotation) -> QuotationOut:
    d = QuotationOut.model_validate(r)
    if r.customer:
        d.customer_name = r.customer.name
    return d
