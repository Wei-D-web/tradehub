"""Lead management — exhibition-generated and other leads with pipeline tracking."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from database import get_db
from models import Lead, Exhibition
from schemas import LeadCreate, LeadUpdate, LeadOut, MsgResponse

router = APIRouter(prefix="/api/leads", tags=["leads"])


def _enrich_lead_out(lead: Lead) -> LeadOut:
    d = LeadOut.model_validate(lead)
    if lead.exhibition:
        d.exhibition_name = lead.exhibition.name
    return d


@router.get("", response_model=list[LeadOut])
def list_leads(
    search: str = "",
    source: str = "",
    status: str = "",
    exhibition_id: int | None = None,
    db: Session = Depends(get_db),
):
    q = db.query(Lead)
    if search:
        kw = f"%{search}%"
        q = q.filter(
            Lead.company_name.ilike(kw) | Lead.contact_name.ilike(kw) |
            Lead.contact_phone.ilike(kw) | Lead.requirements.ilike(kw)
        )
    if source:
        q = q.filter(Lead.source == source)
    if status:
        q = q.filter(Lead.status == status)
    if exhibition_id is not None:
        q = q.filter(Lead.exhibition_id == exhibition_id)
    rows = q.options(joinedload(Lead.exhibition)).order_by(Lead.updated_at.desc()).all()
    return [_enrich_lead_out(r) for r in rows]


@router.get("/{lid}", response_model=LeadOut)
def get_lead(lid: int, db: Session = Depends(get_db)):
    r = db.query(Lead).options(joinedload(Lead.exhibition)).get(lid)
    if not r:
        raise HTTPException(404, detail="线索不存在")
    return _enrich_lead_out(r)


@router.post("", response_model=LeadOut)
def create_lead(body: LeadCreate, db: Session = Depends(get_db)):
    l = Lead(**body.model_dump())
    db.add(l)
    db.commit()
    db.refresh(l)
    return _enrich_lead_out(l)


@router.put("/{lid}", response_model=LeadOut)
def update_lead(lid: int, body: LeadUpdate, db: Session = Depends(get_db)):
    l = db.query(Lead).get(lid)
    if not l:
        raise HTTPException(404, detail="线索不存在")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(l, k, v)
    db.commit()
    db.refresh(l)
    return _enrich_lead_out(l)


@router.delete("/{lid}", response_model=MsgResponse)
def delete_lead(lid: int, db: Session = Depends(get_db)):
    l = db.query(Lead).get(lid)
    if not l:
        raise HTTPException(404, detail="线索不存在")
    db.delete(l)
    db.commit()
    return {"ok": True, "message": "已删除"}
