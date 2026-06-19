"""RMA Returns router."""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session, joinedload

from database import get_db
from models import RMAReturn, Order, Product
from schemas import RMACreate, RMAUpdate, RMAOut, MsgResponse

router = APIRouter(prefix="/api/rma", tags=["rma"])


def _enrich(r: RMAReturn) -> RMAOut:
    d = RMAOut.model_validate(r)
    d.order_no = r.order.order_no if r.order else ""
    d.product_name = r.product.name if r.product else ""
    return d


@router.get("")
def list_rmas(status: str = "", order_id: int | None = None, db: Session = Depends(get_db)):
    try:
        q = db.query(RMAReturn).order_by(RMAReturn.created_at.desc())
        if status:
            q = q.filter(RMAReturn.status == status)
        if order_id:
            q = q.filter(RMAReturn.order_id == order_id)
        rows = q.options(joinedload(RMAReturn.order), joinedload(RMAReturn.product)).all()
        if not rows:
            return JSONResponse(content=[])
        result = []
        for r in rows:
            item = {}
            for col in r.__table__.columns:
                v = getattr(r, col.name)
                item[col.name] = "" if (v is None and hasattr(col.type, 'length')) else v
            item['order_no'] = r.order.order_no if r.order else ""
            item['product_name'] = r.product.name if r.product else ""
            item['created_at'] = item['created_at'].isoformat() if item.get('created_at') else None
            result.append(item)
        return JSONResponse(content=result)
    except Exception as e:
        import traceback
        return JSONResponse(status_code=500, content={"error": f"{type(e).__name__}: {e}\n{traceback.format_exc()}"})


@router.get("/{rid}", response_model=RMAOut)
def get_rma(rid: int, db: Session = Depends(get_db)):
    r = db.query(RMAReturn).options(joinedload(RMAReturn.order), joinedload(RMAReturn.product)).get(rid)
    if not r:
        raise HTTPException(404, "RMA不存在")
    return _enrich(r)


@router.post("", response_model=RMAOut)
def create_rma(body: RMACreate, db: Session = Depends(get_db)):
    r = RMAReturn(**body.model_dump())
    db.add(r)
    db.commit()
    db.refresh(r)
    return _enrich(r)


@router.put("/{rid}", response_model=RMAOut)
def update_rma(rid: int, body: RMAUpdate, db: Session = Depends(get_db)):
    r = db.query(RMAReturn).options(joinedload(RMAReturn.order), joinedload(RMAReturn.product)).get(rid)
    if not r:
        raise HTTPException(404, "RMA不存在")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(r, k, v)
    db.commit()
    db.refresh(r)
    return _enrich(r)


@router.delete("/{rid}", response_model=MsgResponse)
def delete_rma(rid: int, db: Session = Depends(get_db)):
    r = db.query(RMAReturn).options(joinedload(RMAReturn.order), joinedload(RMAReturn.product)).get(rid)
    if not r:
        raise HTTPException(404, "RMA不存在")
    db.delete(r)
    db.commit()
    return {"ok": True, "message": "已删除"}
