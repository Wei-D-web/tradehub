"""Supplier CRUD + quote history router."""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session, selectinload

from database import get_db
from models import Supplier, SupplierQuote, Product
from schemas import SupplierCreate, SupplierUpdate, SupplierOut, SupplierQuoteCreate, SupplierQuoteOut, MsgResponse

router = APIRouter(prefix="/api/suppliers", tags=["suppliers"])


@router.get("")
def list_suppliers(search: str = "", is_active: bool | None = None, db: Session = Depends(get_db)):
    try:
        q = db.query(Supplier)
        if search:
            kw = f"%{search}%"
            q = q.filter(Supplier.name.ilike(kw) | Supplier.contact_person.ilike(kw))
        if is_active is not None:
            q = q.filter(Supplier.is_active == is_active)
        rows = q.options(selectinload(Supplier.quotes)).order_by(Supplier.created_at.desc()).all()
        if not rows:
            return JSONResponse(content=[])
        result = []
        for r in rows:
            item = {}
            for col in r.__table__.columns:
                v = getattr(r, col.name)
                item[col.name] = "" if (v is None and hasattr(col.type, 'length')) else v
            item['agency_start'] = item['agency_start'].isoformat() if item.get('agency_start') else None
            item['agency_end'] = item['agency_end'].isoformat() if item.get('agency_end') else None
            item['created_at'] = item['created_at'].isoformat() if item.get('created_at') else None
            item['updated_at'] = item['updated_at'].isoformat() if item.get('updated_at') else None
            item['quotes'] = []
            for qq in (r.quotes or []):
                qitem = {}
                for col in qq.__table__.columns:
                    qv = getattr(qq, col.name)
                    qitem[col.name] = "" if (qv is None and hasattr(col.type, 'length')) else qv
                qitem['product_name'] = qq.product.name if qq.product else ""
                qitem['valid_until'] = qitem['valid_until'].isoformat() if qitem.get('valid_until') else None
                qitem['quoted_at'] = qitem['quoted_at'].isoformat() if qitem.get('quoted_at') else None
                item['quotes'].append(qitem)
            result.append(item)
        return JSONResponse(content=result)
    except Exception as e:
        import traceback
        return JSONResponse(status_code=500, content={"error": f"{type(e).__name__}: {e}\n{traceback.format_exc()}"})


@router.get("/{sid}", response_model=SupplierOut)
def get_supplier(sid: int, db: Session = Depends(get_db)):
    r = db.query(Supplier).options(selectinload(Supplier.quotes)).get(sid)
    if not r:
        raise HTTPException(404, "供应商不存在")
    return r


@router.post("", response_model=SupplierOut)
def create_supplier(body: SupplierCreate, db: Session = Depends(get_db)):
    s = Supplier(**body.model_dump())
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


@router.put("/{sid}", response_model=SupplierOut)
def update_supplier(sid: int, body: SupplierUpdate, db: Session = Depends(get_db)):
    s = db.query(Supplier).get(sid)
    if not s:
        raise HTTPException(404, "供应商不存在")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(s, k, v)
    db.commit()
    db.refresh(s)
    return s


@router.delete("/{sid}", response_model=MsgResponse)
def delete_supplier(sid: int, db: Session = Depends(get_db)):
    s = db.query(Supplier).get(sid)
    if not s:
        raise HTTPException(404, "供应商不存在")
    db.delete(s)
    db.commit()
    return {"ok": True, "message": "已删除"}


# ── Quote sub-resource ──

@router.get("/{sid}/quotes", response_model=list[SupplierQuoteOut])
def list_quotes(sid: int, db: Session = Depends(get_db)):
    rows = db.query(SupplierQuote).filter(SupplierQuote.supplier_id == sid).order_by(SupplierQuote.quoted_at.desc()).all()
    out = []
    for r in rows:
        d = SupplierQuoteOut.model_validate(r)
        if r.product:
            d.product_name = r.product.name
        out.append(d)
    return out


@router.post("/{sid}/quotes", response_model=SupplierQuoteOut)
def add_quote(sid: int, body: SupplierQuoteCreate, db: Session = Depends(get_db)):
    s = db.query(Supplier).get(sid)
    if not s:
        raise HTTPException(404, "供应商不存在")
    # Mark previous quotes as not current
    db.query(SupplierQuote).filter(
        SupplierQuote.supplier_id == sid, SupplierQuote.is_current == True
    ).update({"is_current": False})
    q = SupplierQuote(supplier_id=sid, **body.model_dump(), is_current=True)
    db.add(q)
    db.commit()
    db.refresh(q)
    return q
