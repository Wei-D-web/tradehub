"""Certification tracking — lab equipment compliance (CCC, CE, ISO, etc)."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Certification
from schemas import CertificationCreate, CertificationUpdate, CertificationOut, MsgResponse

router = APIRouter(prefix="/api/certifications", tags=["certifications"])


def _refresh_status(cert: Certification, today: date) -> str:
    """Derive status from expiry_date."""
    if cert.expiry_date is None:
        return "valid"
    if cert.expiry_date < today:
        return "expired"
    delta = (cert.expiry_date - today).days
    if delta <= 30:
        return "expiring_soon"
    return "valid"


@router.get("", response_model=list[CertificationOut])
def list_certifications(
    search: str = "",
    cert_type: str = "",
    status: str = "",
    db: Session = Depends(get_db),
):
    today = date.today()
    q = db.query(Certification)
    if search:
        kw = f"%{search}%"
        q = q.filter(
            Certification.product_name.ilike(kw) | Certification.cert_number.ilike(kw) |
            Certification.brand.ilike(kw) | Certification.issuing_body.ilike(kw)
        )
    if cert_type:
        q = q.filter(Certification.cert_type == cert_type)
    rows = q.order_by(Certification.expiry_date.asc().nullslast()).all()

    # Apply status filter and refresh
    out = []
    for r in rows:
        new_status = _refresh_status(r, today)
        if r.status != new_status:
            r.status = new_status
        if status and new_status != status:
            continue
        out.append(CertificationOut.model_validate(r))
    db.commit()  # persist any status updates
    return out


@router.get("/expiring", response_model=list[CertificationOut])
def expiring_certs(days: int = 30, db: Session = Depends(get_db)):
    """Return certifications expiring within N days, plus already expired ones."""
    today = date.today()
    from datetime import timedelta
    cutoff = today + timedelta(days=days)
    rows = db.query(Certification).filter(
        Certification.expiry_date <= cutoff,
    ).order_by(Certification.expiry_date.asc()).all()

    out = []
    for r in rows:
        r.status = _refresh_status(r, today)
        out.append(CertificationOut.model_validate(r))
    db.commit()
    return out


@router.get("/{cid}", response_model=CertificationOut)
def get_certification(cid: int, db: Session = Depends(get_db)):
    r = db.query(Certification).get(cid)
    if not r:
        raise HTTPException(404, detail="证书不存在")
    r.status = _refresh_status(r, date.today())
    db.commit()
    return r


@router.post("", response_model=CertificationOut)
def create_certification(body: CertificationCreate, db: Session = Depends(get_db)):
    c = Certification(**body.model_dump())
    c.status = _refresh_status(c, date.today())
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


@router.put("/{cid}", response_model=CertificationOut)
def update_certification(cid: int, body: CertificationUpdate, db: Session = Depends(get_db)):
    c = db.query(Certification).get(cid)
    if not c:
        raise HTTPException(404, detail="证书不存在")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(c, k, v)
    c.status = _refresh_status(c, date.today())
    db.commit()
    db.refresh(c)
    return c


@router.delete("/{cid}", response_model=MsgResponse)
def delete_certification(cid: int, db: Session = Depends(get_db)):
    c = db.query(Certification).get(cid)
    if not c:
        raise HTTPException(404, detail="证书不存在")
    db.delete(c)
    db.commit()
    return {"ok": True, "message": "已删除"}
