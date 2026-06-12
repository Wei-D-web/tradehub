"""Product CRUD + HS code search."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Product
from schemas import ProductCreate, ProductUpdate, ProductOut, MsgResponse

router = APIRouter(prefix="/api/products", tags=["products"])


@router.get("", response_model=list[ProductOut])
def list_products(
    search: str = "",
    category: str = "",
    db: Session = Depends(get_db),
):
    q = db.query(Product)
    if search:
        kw = f"%{search}%"
        q = q.filter(
            Product.name.ilike(kw) | Product.sku.ilike(kw) |
            Product.hs_code.ilike(kw) | Product.description.ilike(kw)
        )
    if category:
        q = q.filter(Product.category == category)
    return q.order_by(Product.name).all()


@router.get("/{pid}", response_model=ProductOut)
def get_product(pid: int, db: Session = Depends(get_db)):
    r = db.query(Product).get(pid)
    if not r:
        raise HTTPException(404, "产品不存在")
    return r


@router.post("", response_model=ProductOut)
def create_product(body: ProductCreate, db: Session = Depends(get_db)):
    p = Product(**body.model_dump())
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@router.put("/{pid}", response_model=ProductOut)
def update_product(pid: int, body: ProductUpdate, db: Session = Depends(get_db)):
    p = db.query(Product).get(pid)
    if not p:
        raise HTTPException(404, "产品不存在")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(p, k, v)
    db.commit()
    db.refresh(p)
    return p


@router.delete("/{pid}", response_model=MsgResponse)
def delete_product(pid: int, db: Session = Depends(get_db)):
    p = db.query(Product).get(pid)
    if not p:
        raise HTTPException(404, "产品不存在")
    db.delete(p)
    db.commit()
    return {"ok": True, "message": "已删除"}
