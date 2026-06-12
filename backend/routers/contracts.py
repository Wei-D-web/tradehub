"""Contract CRUD + PDF generation router."""

import os
from pathlib import Path
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from database import get_db
from models import Contract, Order
from schemas import ContractCreate, ContractUpdate, ContractOut, MsgResponse

router = APIRouter(prefix="/api/contracts", tags=["contracts"])

PDF_DIR = Path(__file__).parent.parent / "data" / "contracts"
PDF_DIR.mkdir(parents=True, exist_ok=True)


@router.get("", response_model=list[ContractOut])
def list_contracts(order_id: int | None = None, db: Session = Depends(get_db)):
    q = db.query(Contract).order_by(Contract.created_at.desc())
    if order_id:
        q = q.filter(Contract.order_id == order_id)
    return q.all()


@router.get("/{cid}", response_model=ContractOut)
def get_contract(cid: int, db: Session = Depends(get_db)):
    r = db.query(Contract).get(cid)
    if not r:
        raise HTTPException(404, "合同不存在")
    return r


@router.post("", response_model=ContractOut)
def create_contract(body: ContractCreate, db: Session = Depends(get_db)):
    contract_no = body.contract_no or f"CONTRACT-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    c = Contract(
        order_id=body.order_id,
        contract_no=contract_no,
        type=body.type,
        party_name=body.party_name,
        content_json=body.content_json,
        status=body.status or "draft",
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


@router.put("/{cid}", response_model=ContractOut)
def update_contract(cid: int, body: ContractUpdate, db: Session = Depends(get_db)):
    c = db.query(Contract).get(cid)
    if not c:
        raise HTTPException(404, "合同不存在")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(c, k, v)
    db.commit()
    db.refresh(c)
    return c


@router.delete("/{cid}", response_model=MsgResponse)
def delete_contract(cid: int, db: Session = Depends(get_db)):
    c = db.query(Contract).get(cid)
    if not c:
        raise HTTPException(404, "合同不存在")
    # Clean up PDF
    if c.pdf_path and os.path.exists(c.pdf_path):
        os.remove(c.pdf_path)
    db.delete(c)
    db.commit()
    return {"ok": True, "message": "已删除"}


@router.post("/{cid}/sign", response_model=ContractOut)
def sign_contract(cid: int, db: Session = Depends(get_db)):
    c = db.query(Contract).get(cid)
    if not c:
        raise HTTPException(404, "合同不存在")
    c.status = "signed"
    c.signed_at = datetime.utcnow()
    db.commit()
    db.refresh(c)
    return c


@router.post("/{cid}/pdf")
def generate_pdf(cid: int, db: Session = Depends(get_db)):
    """Generate a simple Chinese contract PDF using reportlab."""
    c = db.query(Contract).get(cid)
    if not c:
        raise HTTPException(404, "合同不存在")

    try:
        from reportlab.pdfgen import canvas
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont
        from reportlab.lib.units import mm

        pdf_path = str(PDF_DIR / f"{c.contract_no}.pdf")

        # Try to register a Chinese font
        font_name = "Helvetica"
        for font_path in [
            "/System/Library/Fonts/PingFang.ttc",
            "/System/Library/Fonts/STHeiti Light.ttc",
        ]:
            if os.path.exists(font_path):
                try:
                    pdfmetrics.registerFont(TTFont("CNFont", font_path))
                    font_name = "CNFont"
                    break
                except Exception:
                    pass

        p = canvas.Canvas(pdf_path, pagesize=(210 * mm, 297 * mm))
        p.setFont(font_name, 18)
        p.drawString(50 * mm, 270 * mm, "销售合同" if c.type == "sales" else "采购合同")

        p.setFont(font_name, 10)
        p.drawString(30 * mm, 255 * mm, f"合同编号: {c.contract_no}")
        p.drawString(30 * mm, 248 * mm, f"签约方: {c.party_name}")
        p.drawString(30 * mm, 241 * mm, f"签约日期: {c.signed_at.strftime('%Y-%m-%d') if c.signed_at else '待签'}")

        y = 225 * mm
        p.setFont(font_name, 9)
        for key, val in c.content_json.items():
            p.drawString(30 * mm, y, f"{key}: {val}")
            y -= 6 * mm

        p.setFont(font_name, 8)
        p.drawString(30 * mm, 30 * mm, "本合同由 TradeHub 进贸通系统生成")

        p.save()

        c.pdf_path = pdf_path
        db.commit()

        return FileResponse(pdf_path, filename=f"{c.contract_no}.pdf",
                           media_type="application/pdf")
    except ImportError:
        raise HTTPException(500, "reportlab 未安装, 请运行: pip install reportlab")
    except Exception as e:
        raise HTTPException(500, f"PDF生成失败: {e}")
