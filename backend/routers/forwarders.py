"""Freight Forwarder CRUD + quote comparison router."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from database import get_db
from models import FreightForwarder, FreightQuote
from schemas import ForwarderCreate, ForwarderUpdate, ForwarderOut, FreightQuoteCreate, FreightQuoteOut, MsgResponse

router = APIRouter(prefix="/api/forwarders", tags=["forwarders"])


@router.get("", response_model=list[ForwarderOut])
def list_forwarders(search: str = "", is_active: bool | None = None, db: Session = Depends(get_db)):
    q = db.query(FreightForwarder)
    if search:
        kw = f"%{search}%"
        q = q.filter(FreightForwarder.name.ilike(kw) | FreightForwarder.contact_person.ilike(kw))
    if is_active is not None:
        q = q.filter(FreightForwarder.is_active == is_active)
    return q.options(joinedload(FreightForwarder.quotes)).order_by(FreightForwarder.name).all()


@router.get("/{fid}", response_model=ForwarderOut)
def get_forwarder(fid: int, db: Session = Depends(get_db)):
    r = db.query(FreightForwarder).options(joinedload(FreightForwarder.quotes)).get(fid)
    if not r:
        raise HTTPException(404, "货代不存在")
    return r


@router.post("", response_model=ForwarderOut)
def create_forwarder(body: ForwarderCreate, db: Session = Depends(get_db)):
    f = FreightForwarder(**body.model_dump())
    db.add(f)
    db.commit()
    db.refresh(f)
    return f


@router.put("/{fid}", response_model=ForwarderOut)
def update_forwarder(fid: int, body: ForwarderUpdate, db: Session = Depends(get_db)):
    f = db.query(FreightForwarder).get(fid)
    if not f:
        raise HTTPException(404, "货代不存在")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(f, k, v)
    db.commit()
    db.refresh(f)
    return f


@router.delete("/{fid}", response_model=MsgResponse)
def delete_forwarder(fid: int, db: Session = Depends(get_db)):
    f = db.query(FreightForwarder).get(fid)
    if not f:
        raise HTTPException(404, "货代不存在")
    db.delete(f)
    db.commit()
    return {"ok": True, "message": "已删除"}


# ── Quote sub-resource ──

@router.get("/{fid}/quotes", response_model=list[FreightQuoteOut])
def list_quotes(fid: int, db: Session = Depends(get_db)):
    return db.query(FreightQuote).filter(
        FreightQuote.forwarder_id == fid
    ).order_by(FreightQuote.quoted_at.desc()).all()


@router.post("/{fid}/quotes", response_model=FreightQuoteOut)
def add_quote(fid: int, body: FreightQuoteCreate, db: Session = Depends(get_db)):
    f = db.query(FreightForwarder).get(fid)
    if not f:
        raise HTTPException(404, "货代不存在")
    q = FreightQuote(forwarder_id=fid, **body.model_dump())
    db.add(q)
    db.commit()
    db.refresh(q)
    return q


@router.post("/compare", response_model=list[FreightQuoteOut])
def compare_quotes(
    origin: str = "",
    destination: str = "",
    transport_mode: str = "",
    db: Session = Depends(get_db),
):
    """Compare freight quotes across all forwarders for a given route."""
    q = db.query(FreightQuote).filter(FreightQuote.is_selected == False)
    if origin:
        q = q.filter(FreightQuote.origin.ilike(f"%{origin}%"))
    if destination:
        q = q.filter(FreightQuote.destination.ilike(f"%{destination}%"))
    if transport_mode:
        q = q.filter(FreightQuote.transport_mode == transport_mode)
    return q.order_by(FreightQuote.price).all()
