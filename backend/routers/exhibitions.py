"""Exhibition management — track expos, ROI, and generated leads."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import Exhibition, Lead
from schemas import ExhibitionCreate, ExhibitionUpdate, ExhibitionOut, LeadOut, MsgResponse

router = APIRouter(prefix="/api/exhibitions", tags=["exhibitions"])


def _enrich_list(rows, db):
    """Batch-enrich exhibition rows with lead/won counts in 2 queries."""
    ids = [r.id for r in rows]
    if not ids:
        return []
    lead_counts = dict(db.query(Lead.exhibition_id, func.count(Lead.id)).filter(
        Lead.exhibition_id.in_(ids)
    ).group_by(Lead.exhibition_id).all())
    won_counts = dict(db.query(Lead.exhibition_id, func.count(Lead.id)).filter(
        Lead.exhibition_id.in_(ids), Lead.status == "won"
    ).group_by(Lead.exhibition_id).all())
    out = []
    for r in rows:
        d = ExhibitionOut.model_validate(r)
        d.lead_count = lead_counts.get(r.id, 0)
        d.won_count = won_counts.get(r.id, 0)
        out.append(d)
    return out


@router.get("", response_model=list[ExhibitionOut])
def list_exhibitions(search: str = "", db: Session = Depends(get_db)):
    q = db.query(Exhibition)
    if search:
        kw = f"%{search}%"
        q = q.filter(Exhibition.name.ilike(kw) | Exhibition.location.ilike(kw))
    rows = q.order_by(Exhibition.date_start.desc().nullslast()).all()
    return _enrich_list(rows, db)


@router.get("/roi")
def exhibition_roi(db: Session = Depends(get_db)):
    """ROI summary across all exhibitions."""
    total_cost = db.query(func.coalesce(func.sum(Exhibition.cost_cny), 0)).scalar() or 0
    total_leads = db.query(func.count(Lead.id)).filter(Lead.source == "exhibition").scalar() or 0
    total_won = db.query(func.count(Lead.id)).filter(
        Lead.source == "exhibition", Lead.status == "won"
    ).scalar() or 0
    total_value = db.query(func.coalesce(func.sum(Lead.estimated_value_cny), 0)).filter(
        Lead.source == "exhibition", Lead.status == "won"
    ).scalar() or 0
    conversion = f"{(total_won / total_leads * 100):.1f}%" if total_leads > 0 else "0%"
    cost_per_lead = float(total_cost) / total_leads if total_leads > 0 else 0

    return {
        "total_exhibitions": db.query(func.count(Exhibition.id)).scalar() or 0,
        "total_cost": float(total_cost),
        "total_leads": total_leads,
        "total_won": total_won,
        "conversion_rate": conversion,
        "won_value_cny": float(total_value),
        "cost_per_lead_cny": round(cost_per_lead, 2),
    }


@router.get("/{eid}", response_model=ExhibitionOut)
def get_exhibition(eid: int, db: Session = Depends(get_db)):
    r = db.query(Exhibition).get(eid)
    if not r:
        raise HTTPException(404, detail="展会不存在")
    return _enrich_list([r], db)[0]


@router.get("/{eid}/leads", response_model=list[LeadOut])
def list_exhibition_leads(eid: int, db: Session = Depends(get_db)):
    r = db.query(Exhibition).get(eid)
    if not r:
        raise HTTPException(404, detail="展会不存在")
    rows = db.query(Lead).filter(Lead.exhibition_id == eid).order_by(Lead.updated_at.desc()).all()
    out = []
    for lead in rows:
        d = LeadOut.model_validate(lead)
        if lead.exhibition:
            d.exhibition_name = lead.exhibition.name
        out.append(d)
    return out


@router.post("", response_model=ExhibitionOut)
def create_exhibition(body: ExhibitionCreate, db: Session = Depends(get_db)):
    e = Exhibition(**body.model_dump())
    db.add(e)
    db.commit()
    db.refresh(e)
    return _enrich_list([e], db)[0]


@router.put("/{eid}", response_model=ExhibitionOut)
def update_exhibition(eid: int, body: ExhibitionUpdate, db: Session = Depends(get_db)):
    e = db.query(Exhibition).get(eid)
    if not e:
        raise HTTPException(404, detail="展会不存在")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(e, k, v)
    db.commit()
    db.refresh(e)
    return _enrich_list([e], db)[0]


@router.delete("/{eid}", response_model=MsgResponse)
def delete_exhibition(eid: int, db: Session = Depends(get_db)):
    e = db.query(Exhibition).get(eid)
    if not e:
        raise HTTPException(404, detail="展会不存在")
    db.delete(e)
    db.commit()
    return {"ok": True, "message": "已删除"}
