"""Finance router — invoices, payments, profit calculation."""

from datetime import datetime, date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from database import get_db
from models import Invoice, Payment, Order
from schemas import (
    InvoiceCreate, InvoiceUpdate, InvoiceOut,
    PaymentCreate, PaymentOut,
    ProfitSummary, MsgResponse,
)
from audit import audit_log

router = APIRouter(prefix="/api/finance", tags=["finance"])


def _client_ip(request: Request) -> str:
    xff = request.headers.get("x-forwarded-for", "")
    return xff.split(",")[0].strip() if xff else (request.client.host if request.client else "unknown")


# ── Invoices ────────────────────────────────────────

def _gen_invoice_no(prefix: str = "INV") -> str:
    today = date.today().strftime("%Y%m%d")
    return f"{prefix}-{today}-{''.join(__import__('random').choices(__import__('string').digits, k=4))}"


def _enrich_invoice(inv: Invoice) -> InvoiceOut:
    d = InvoiceOut.model_validate(inv)
    d.order_no = inv.order.order_no if inv.order else ""
    return d


@router.get("/invoices", response_model=list[InvoiceOut])
def list_invoices(order_id: int | None = None, status: str = "", db: Session = Depends(get_db)):
    q = db.query(Invoice).order_by(Invoice.created_at.desc())
    if order_id:
        q = q.filter(Invoice.order_id == order_id)
    if status:
        q = q.filter(Invoice.status == status)
    return [_enrich_invoice(r) for r in q.options(joinedload(Invoice.order)).all()]


@router.get("/invoices/{iid}", response_model=InvoiceOut)
def get_invoice(iid: int, db: Session = Depends(get_db)):
    r = db.query(Invoice).options(joinedload(Invoice.order)).get(iid)
    if not r:
        raise HTTPException(404, "发票不存在")
    return _enrich_invoice(r)


@router.post("/invoices", response_model=InvoiceOut)
def create_invoice(body: InvoiceCreate, db: Session = Depends(get_db)):
    inv = Invoice(
        order_id=body.order_id,
        invoice_no=_gen_invoice_no("INV" if body.type == "sales" else "PINV"),
        type=body.type,
        amount=body.amount,
        currency=body.currency,
        issue_date=body.issue_date,
        due_date=body.due_date,
        status=body.status or "issued",
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)
    return _enrich_invoice(inv)


@router.put("/invoices/{iid}", response_model=InvoiceOut)
def update_invoice(iid: int, body: InvoiceUpdate, db: Session = Depends(get_db)):
    inv = db.query(Invoice).get(iid)
    if not inv:
        raise HTTPException(404, "发票不存在")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(inv, k, v)
    db.commit()
    db.refresh(inv)
    return _enrich_invoice(inv)


@router.delete("/invoices/{iid}", response_model=MsgResponse)
def delete_invoice(iid: int, db: Session = Depends(get_db), request: Request = None):
    inv = db.query(Invoice).get(iid)
    if not inv:
        raise HTTPException(404, "发票不存在")
    invoice_no = inv.invoice_no
    amount = inv.amount
    db.delete(inv)
    db.commit()
    if request:
        audit_log(db, "delete", "invoice", iid, _client_ip(request), f"删除发票: {invoice_no} (¥{amount:,.2f})")
    return {"ok": True, "message": "已删除"}


# ── Payments ────────────────────────────────────────

@router.get("/payments", response_model=list[PaymentOut])
def list_payments(order_id: int | None = None, db: Session = Depends(get_db)):
    q = db.query(Payment).order_by(Payment.paid_at.desc())
    if order_id:
        q = q.filter(Payment.order_id == order_id)
    return q.all()


@router.post("/payments", response_model=PaymentOut)
def create_payment(body: PaymentCreate, db: Session = Depends(get_db)):
    p = Payment(**body.model_dump())
    db.add(p)

    # Auto-update invoice status if fully paid
    inv = db.query(Invoice).get(body.invoice_id)
    if inv:
        total_paid = db.query(func.sum(Payment.amount)).filter(
            Payment.invoice_id == body.invoice_id
        ).scalar() or 0
        if total_paid + body.amount >= inv.amount:
            inv.status = "paid"
            inv.paid_at = datetime.utcnow()

    db.commit()
    db.refresh(p)
    return p


@router.delete("/payments/{pid}", response_model=MsgResponse)
def delete_payment(pid: int, db: Session = Depends(get_db)):
    p = db.query(Payment).get(pid)
    if not p:
        raise HTTPException(404, "付款记录不存在")
    db.delete(p)
    db.commit()
    return {"ok": True, "message": "已删除"}


# ── Profit Summary ──────────────────────────────────

@router.get("/profit", response_model=ProfitSummary)
def profit_summary(
    period: str = Query("all", description="YYYY-MM or YYYY-QN or 'all'"),
    db: Session = Depends(get_db),
):
    q = db.query(Order).filter(Order.status != "cancelled")
    if period != "all":
        # Simple month filter
        if "-" in period and not period.startswith("Q"):
            q = q.filter(Order.created_at >= f"{period}-01")
        elif period.startswith("Q"):
            year = int(period[:4])
            quarter = int(period[-1])
            start_month = (quarter - 1) * 3 + 1
            q = q.filter(Order.created_at >= f"{year}-{start_month:02d}-01")
            q = q.filter(Order.created_at < f"{year}-{start_month + 3:02d}-01" if start_month < 10 else f"{year + 1}-01-01")

    rows = q.all()
    revenue = sum(r.total_revenue for r in rows)
    cost = sum(r.purchase_cost + r.freight_cost + r.customs_cost for r in rows)
    return ProfitSummary(
        total_revenue=revenue,
        total_cost=cost,
        total_profit=revenue - cost,
        order_count=len(rows),
        period=period,
    )
