"""Order CRUD + status machine + timeline. The core of TradeHub."""

import datetime
import random
import string

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from database import get_db
from models import Order, OrderTimeline
from schemas import OrderCreate, OrderUpdate, OrderOut, MsgResponse

router = APIRouter(prefix="/api/orders", tags=["orders"])

VALID_TRANSITIONS = {
    "inquiry": ["quoted", "cancelled"],
    "quoted": ["ordered", "cancelled"],
    "ordered": ["shipped", "cancelled"],
    "shipped": ["customs", "cancelled"],
    "customs": ["delivered", "cancelled"],
    "delivered": ["completed"],
    "completed": [],
    "cancelled": ["inquiry"],  # reopen
}


def _gen_order_no() -> str:
    today = datetime.date.today().strftime("%Y%m%d")
    suffix = "".join(random.choices(string.digits, k=4))
    return f"TH{today}{suffix}"


def _calc_profit(o: Order) -> float:
    return o.total_revenue - o.purchase_cost - o.freight_cost - o.customs_cost


def _enrich(o: Order) -> OrderOut:
    d = OrderOut.model_validate(o)
    d.customer_name = o.customer.name if o.customer else ""
    d.supplier_name = o.supplier.name if o.supplier else ""
    d.forwarder_name = o.forwarder.name if o.forwarder else ""
    return d


@router.get("", response_model=list[OrderOut])
def list_orders(
    status: str = "",
    customer_id: int | None = None,
    supplier_id: int | None = None,
    db: Session = Depends(get_db),
):
    q = db.query(Order).order_by(Order.updated_at.desc())
    if status:
        q = q.filter(Order.status == status)
    if customer_id:
        q = q.filter(Order.customer_id == customer_id)
    if supplier_id:
        q = q.filter(Order.supplier_id == supplier_id)
    return [_enrich(r) for r in q.all()]


@router.get("/{oid}", response_model=OrderOut)
def get_order(oid: int, db: Session = Depends(get_db)):
    o = db.query(Order).get(oid)
    if not o:
        raise HTTPException(404, "订单不存在")
    return _enrich(o)


@router.post("", response_model=OrderOut)
def create_order(body: OrderCreate, db: Session = Depends(get_db)):
    o = Order(
        order_no=_gen_order_no(),
        customer_id=body.customer_id,
        supplier_id=body.supplier_id,
        forwarder_id=body.forwarder_id,
        status="inquiry",
        total_revenue=body.total_revenue,
        purchase_cost=body.purchase_cost,
        freight_cost=body.freight_cost,
        customs_cost=body.customs_cost,
        net_profit=body.total_revenue - body.purchase_cost - body.freight_cost - body.customs_cost,
        estimated_delivery=body.estimated_delivery,
        notes=body.notes,
    )
    db.add(o)
    db.flush()
    _add_timeline(db, o.id, "created", f"订单创建: {body.notes or ''}")
    db.commit()
    db.refresh(o)
    return _enrich(o)


@router.put("/{oid}", response_model=OrderOut)
def update_order(oid: int, body: OrderUpdate, db: Session = Depends(get_db)):
    o = db.query(Order).get(oid)
    if not o:
        raise HTTPException(404, "订单不存在")

    # Handle status transition
    if body.status and body.status != o.status:
        valid = VALID_TRANSITIONS.get(o.status, [])
        if body.status not in valid:
            raise HTTPException(400, f"不允许从 {o.status} 变更为 {body.status}，允许: {valid}")
        _add_timeline(db, o.id, "status_change", f"状态变更: {o.status} → {body.status}")

    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(o, k, v)

    o.net_profit = _calc_profit(o)
    db.commit()
    db.refresh(o)
    return _enrich(o)


@router.delete("/{oid}", response_model=MsgResponse)
def delete_order(oid: int, db: Session = Depends(get_db)):
    o = db.query(Order).get(oid)
    if not o:
        raise HTTPException(404, "订单不存在")
    db.delete(o)
    db.commit()
    return {"ok": True, "message": "已删除"}


@router.post("/{oid}/timeline")
def add_timeline(oid: int, event_type: str, description: str = "", operator: str = "system", db: Session = Depends(get_db)):
    o = db.query(Order).get(oid)
    if not o:
        raise HTTPException(404, "订单不存在")
    t = _add_timeline(db, oid, event_type, description, operator)
    db.commit()
    return {"ok": True, "id": t.id}


def _add_timeline(db: Session, order_id: int, event_type: str, description: str, operator: str = "system") -> OrderTimeline:
    t = OrderTimeline(order_id=order_id, event_type=event_type, description=description, operator=operator)
    db.add(t)
    db.flush()
    return t
