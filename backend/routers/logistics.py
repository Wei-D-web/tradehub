"""Logistics / Shipment tracking router."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload, relationship

from database import get_db
from models import Order
from schemas import ShipmentCreate, ShipmentUpdate, ShipmentOut, MsgResponse

# Minimal shipment tracking — we store shipment data in a simple SQLite table
# For full CustomsFlow-style logistics, see customs_saas. This is the lightweight version.

# We'll use a simple in-model approach: shipment data is stored as JSON in Order.notes
# OR we can add a shipments table. Let's add a lightweight one.

from sqlalchemy import Column, Integer, String, Float, Text, Date, DateTime, ForeignKey

from database import Base
import datetime as _dt


class Shipment(Base):
    __tablename__ = "shipments"
    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    transport_mode = Column(String(20), default="sea")
    carrier = Column(String(100), default="")
    tracking_no = Column(String(100), default="")
    origin = Column(String(200), default="")
    destination = Column(String(200), default="")
    estimated_departure = Column(Date, nullable=True)
    estimated_arrival = Column(Date, nullable=True)
    actual_departure = Column(Date, nullable=True)
    actual_arrival = Column(Date, nullable=True)
    status = Column(String(20), default="pending")  # pending / in_transit / customs / delivered
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=_dt.datetime.utcnow)

    order = relationship("Order")


router = APIRouter(prefix="/api/logistics", tags=["logistics"])


@router.get("", response_model=list[ShipmentOut])
def list_shipments(order_id: int | None = None, status: str = "", db: Session = Depends(get_db)):
    q = db.query(Shipment).order_by(Shipment.created_at.desc())
    if order_id:
        q = q.filter(Shipment.order_id == order_id)
    if status:
        q = q.filter(Shipment.status == status)
    rows = q.options(joinedload(Shipment.order)).all()
    out = []
    for r in rows:
        d = ShipmentOut.model_validate(r)
        d.order_no = r.order.order_no if r.order else ""
        out.append(d)
    return out


@router.get("/{sid}", response_model=ShipmentOut)
def get_shipment(sid: int, db: Session = Depends(get_db)):
    r = db.query(Shipment).options(joinedload(Shipment.order)).get(sid)
    if not r:
        raise HTTPException(404, "物流记录不存在")
    d = ShipmentOut.model_validate(r)
    d.order_no = r.order.order_no if r.order else ""
    return d


@router.post("", response_model=ShipmentOut)
def create_shipment(body: ShipmentCreate, db: Session = Depends(get_db)):
    s = Shipment(**body.model_dump())
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


@router.put("/{sid}", response_model=ShipmentOut)
def update_shipment(sid: int, body: ShipmentUpdate, db: Session = Depends(get_db)):
    s = db.query(Shipment).get(sid)
    if not s:
        raise HTTPException(404, "物流记录不存在")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(s, k, v)
    db.commit()
    db.refresh(s)
    return s


@router.delete("/{sid}", response_model=MsgResponse)
def delete_shipment(sid: int, db: Session = Depends(get_db)):
    s = db.query(Shipment).get(sid)
    if not s:
        raise HTTPException(404, "物流记录不存在")
    db.delete(s)
    db.commit()
    return {"ok": True, "message": "已删除"}
