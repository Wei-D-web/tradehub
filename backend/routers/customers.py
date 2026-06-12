"""Customer CRUD router."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import Customer, CustomerContact, Order
from schemas import CustomerCreate, CustomerUpdate, CustomerOut, CustomerContactCreate, CustomerContactOut, MsgResponse

router = APIRouter(prefix="/api/customers", tags=["customers"])


@router.get("", response_model=list[CustomerOut])
def list_customers(
    search: str = "",
    is_active: bool | None = None,
    db: Session = Depends(get_db),
):
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
    result = []
    for r in rows:
        d = CustomerOut.model_validate(r)
        d.order_count = db.query(func.count(Order.id)).filter(Order.customer_id == r.id).scalar() or 0
        result.append(d)
    return result


@router.get("/{cid}", response_model=CustomerOut)
def get_customer(cid: int, db: Session = Depends(get_db)):
    r = db.query(Customer).get(cid)
    if not r:
        raise HTTPException(404, "客户不存在")
    d = CustomerOut.model_validate(r)
    d.order_count = db.query(func.count(Order.id)).filter(Order.customer_id == r.id).scalar() or 0
    return d


@router.post("", response_model=CustomerOut)
def create_customer(body: CustomerCreate, db: Session = Depends(get_db)):
    c = Customer(**body.model_dump())
    db.add(c)
    db.commit()
    db.refresh(c)
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
def delete_customer(cid: int, db: Session = Depends(get_db)):
    c = db.query(Customer).get(cid)
    if not c:
        raise HTTPException(404, "客户不存在")
    db.delete(c)
    db.commit()
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
