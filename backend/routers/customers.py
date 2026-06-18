"""Customer CRUD router."""

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import Customer, CustomerContact, Order
from schemas import CustomerCreate, CustomerUpdate, CustomerOut, CustomerContactCreate, CustomerContactOut, MsgResponse
from audit import audit_log

router = APIRouter(prefix="/api/customers", tags=["customers"])


def _client_ip(request: Request) -> str:
    xff = request.headers.get("x-forwarded-for", "")
    return xff.split(",")[0].strip() if xff else (request.client.host if request.client else "unknown")


@router.get("")
def list_customers(
    search: str = "",
    is_active: bool | None = None,
    db: Session = Depends(get_db),
):
    import json
    try:
        q = db.query(Customer)
        if search:
            kw = f"%{search}%"
            q = q.filter(
                (Customer.name.ilike(kw)) |
                (Customer.contact_person.ilike(kw)) |
                (Customer.phone.ilike(kw)) |
                (Customer.email.ilike(kw))
            )
        if is_active is not None:
            q = q.filter(Customer.is_active == is_active)
        rows = q.order_by(Customer.updated_at.desc()).all()
        if not rows:
            return JSONResponse(content=[])
        # Manually build dicts, handling NULL
        result = []
        for r in rows:
            item = {}
            for col in r.__table__.columns:
                v = getattr(r, col.name)
                item[col.name] = "" if (v is None and isinstance(col.type, __import__('sqlalchemy').String)) else v
            item['exhibition_name'] = ""
            item['order_count'] = db.query(func.count(Order.id)).filter(Order.customer_id == r.id).scalar() or 0
            item['contacts'] = []
            for ct in (r.contacts or []):
                citem = {}
                for col in ct.__table__.columns:
                    cv = getattr(ct, col.name)
                    citem[col.name] = "" if (cv is None and hasattr(col.type, 'length')) else cv
                item['contacts'].append(citem)
            item['created_at'] = item['created_at'].isoformat() if item.get('created_at') else None
            item['updated_at'] = item['updated_at'].isoformat() if item.get('updated_at') else None
            for ct in item['contacts']:
                ct['created_at'] = ct['created_at'].isoformat() if ct.get('created_at') else None
            result.append(item)
        return JSONResponse(content=result)
    except Exception as e:
        import traceback
        return JSONResponse(status_code=500, content={"error": f"{type(e).__name__}: {e}\n{traceback.format_exc()}"})


@router.get("/{cid}", response_model=CustomerOut)
def get_customer(cid: int, db: Session = Depends(get_db)):
    r = db.query(Customer).get(cid)
    if not r:
        raise HTTPException(404, "客户不存在")
    d = CustomerOut.model_validate(r)
    d.order_count = db.query(func.count(Order.id)).filter(Order.customer_id == r.id).scalar() or 0
    return d


@router.post("", response_model=CustomerOut)
def create_customer(body: CustomerCreate, db: Session = Depends(get_db), request: Request = None):
    c = Customer(**body.model_dump())
    db.add(c)
    db.commit()
    db.refresh(c)
    if request:
        audit_log(db, "create", "customer", c.id, _client_ip(request), f"新建客户: {c.name}")
    return c


@router.put("/{cid}", response_model=CustomerOut)
def update_customer(cid: int, body: CustomerUpdate, db: Session = Depends(get_db)):
    c = db.query(Customer).get(cid)
    if not c:
        raise HTTPException(404, "客户不存在")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(c, k, v)
    db.commit()
    db.refresh(c)
    return c


@router.delete("/{cid}", response_model=MsgResponse)
def delete_customer(cid: int, db: Session = Depends(get_db), request: Request = None):
    c = db.query(Customer).get(cid)
    if not c:
        raise HTTPException(404, "客户不存在")
    name = c.name
    db.delete(c)
    db.commit()
    if request:
        audit_log(db, "delete", "customer", cid, _client_ip(request), f"删除客户: {name}")
    return {"ok": True, "message": "已删除"}


# ── Contacts sub-resource ──

@router.get("/{cid}/contacts", response_model=list[CustomerContactOut])
def list_contacts(cid: int, db: Session = Depends(get_db)):
    return db.query(CustomerContact).filter(CustomerContact.customer_id == cid).all()


@router.post("/{cid}/contacts", response_model=CustomerContactOut)
def add_contact(cid: int, body: CustomerContactCreate, db: Session = Depends(get_db)):
    c = db.query(Customer).get(cid)
    if not c:
        raise HTTPException(404, "客户不存在")
    ct = CustomerContact(customer_id=cid, **body.model_dump())
    db.add(ct)
    db.commit()
    db.refresh(ct)
    return ct


@router.delete("/{cid}/contacts/{ctid}", response_model=MsgResponse)
def delete_contact(cid: int, ctid: int, db: Session = Depends(get_db)):
    ct = db.query(CustomerContact).filter(
        CustomerContact.id == ctid, CustomerContact.customer_id == cid
    ).first()
    if not ct:
        raise HTTPException(404, "联系人不存在")
    db.delete(ct)
    db.commit()
    return {"ok": True, "message": "已删除"}
