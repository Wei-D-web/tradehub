"""Customs Operations router — 截关工具 (Cutoff document generation)."""

import os
import json
import datetime as _dt
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from database import get_db
from models import OpsJob
from schemas import OpsJobCreate, OpsJobUpdate, OpsJobOut, MsgResponse, GenerateRequest
from excel_engine import generate_all, make_zip, OUTPUT_DIR

router = APIRouter(prefix="/api/customs-ops", tags=["customs-ops"])

UPLOAD_DIR = Path(__file__).resolve().parent.parent / "data" / "uploads"


def _client_ip(request: Request) -> str:
    xff = request.headers.get("x-forwarded-for", "")
    return xff.split(",")[0].strip() if xff else (request.client.host if request.client else "unknown")


def _gen_job_no() -> str:
    now = _dt.datetime.utcnow()
    return f"JG{now.strftime('%Y%m%d')}{now.strftime('%H%M%S')}"


def _job_to_dict(job: OpsJob) -> dict:
    """Convert ORM object to dict, ensuring JSON fields are proper lists/dicts."""
    d = {}
    for col in job.__table__.columns:
        val = getattr(job, col.name)
        if col.name in ("containers", "products"):
            d[col.name] = val if isinstance(val, list) else (json.loads(val) if isinstance(val, str) else [])
        elif col.name in ("source_files", "generated_files"):
            d[col.name] = val if isinstance(val, (list, dict)) else (json.loads(val) if isinstance(val, str) else [])
        else:
            d[col.name] = val
    return d


# ═══════════════════════════════════════════════════════
# CRUD
# ═══════════════════════════════════════════════════════

@router.get("", response_model=list[OpsJobOut])
def list_jobs(search: str = "", db: Session = Depends(get_db)):
    q = db.query(OpsJob).order_by(OpsJob.updated_at.desc())
    if search:
        q = q.filter(
            OpsJob.customer_name.contains(search) |
            OpsJob.job_no.contains(search) |
            OpsJob.mbl_no.contains(search)
        )
    rows = q.all()
    return [_job_to_dict(r) for r in rows]


@router.get("/{jid}", response_model=OpsJobOut)
def get_job(jid: int, db: Session = Depends(get_db)):
    r = db.query(OpsJob).get(jid)
    if not r:
        raise HTTPException(404, "截关任务不存在")
    return _job_to_dict(r)


@router.post("", response_model=OpsJobOut)
def create_job(body: OpsJobCreate, db: Session = Depends(get_db)):
    data = body.model_dump()
    data["job_no"] = _gen_job_no()
    obj = OpsJob(**data)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return _job_to_dict(obj)


@router.put("/{jid}", response_model=OpsJobOut)
def update_job(jid: int, body: OpsJobUpdate, db: Session = Depends(get_db)):
    obj = db.query(OpsJob).get(jid)
    if not obj:
        raise HTTPException(404, "截关任务不存在")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return _job_to_dict(obj)


@router.delete("/{jid}", response_model=MsgResponse)
def delete_job(jid: int, db: Session = Depends(get_db)):
    obj = db.query(OpsJob).get(jid)
    if not obj:
        raise HTTPException(404, "截关任务不存在")
    db.delete(obj)
    db.commit()
    return {"ok": True, "message": "已删除"}


# ═══════════════════════════════════════════════════════
# File Upload
# ═══════════════════════════════════════════════════════

@router.post("/{jid}/upload")
def upload_files(jid: int, files: list[UploadFile] = File(...), db: Session = Depends(get_db)):
    job = db.query(OpsJob).get(jid)
    if not job:
        raise HTTPException(404, "截关任务不存在")

    upload_dir = UPLOAD_DIR / str(jid)
    upload_dir.mkdir(parents=True, exist_ok=True)

    uploaded = []
    for f in files:
        # Sanitize filename
        safe_name = f.filename.replace("/", "_").replace("\\", "_")
        file_path = upload_dir / safe_name
        content = f.file.read()
        with open(file_path, "wb") as out:
            out.write(content)
        uploaded.append({
            "filename": safe_name,
            "size": len(content),
            "path": str(file_path),
        })

    # Update job's source_files
    existing = job.source_files if isinstance(job.source_files, list) else []
    existing.extend(uploaded)
    job.source_files = existing
    db.commit()

    return {"ok": True, "files": uploaded}


@router.get("/{jid}/uploads")
def list_uploads(jid: int, db: Session = Depends(get_db)):
    job = db.query(OpsJob).get(jid)
    if not job:
        raise HTTPException(404, "截关任务不存在")
    files = job.source_files if isinstance(job.source_files, list) else []
    return {"files": files}


@router.delete("/{jid}/uploads/{filename}")
def delete_upload(jid: int, filename: str, db: Session = Depends(get_db)):
    job = db.query(OpsJob).get(jid)
    if not job:
        raise HTTPException(404, "截关任务不存在")

    files = job.source_files if isinstance(job.source_files, list) else []
    job.source_files = [f for f in files if f.get("filename") != filename]
    db.commit()

    # Delete from disk
    file_path = UPLOAD_DIR / str(jid) / filename
    if file_path.exists():
        os.remove(file_path)

    return {"ok": True, "message": f"已删除 {filename}"}


# ═══════════════════════════════════════════════════════
# Excel Generation & Download
# ═══════════════════════════════════════════════════════

@router.post("/{jid}/generate")
def generate_tables(jid: int, body: GenerateRequest, db: Session = Depends(get_db)):
    """Generate Excel files for the given job."""
    job = db.query(OpsJob).get(jid)
    if not job:
        raise HTTPException(404, "截关任务不存在")

    tables = body.tables or ["ens", "ics2", "manifest", "loading_notice"]

    # Auto-add multi_product if 2+ products
    products = job.products if isinstance(job.products, list) else []
    if len(products) >= 2 and "multi_product" not in tables:
        tables.append("multi_product")

    # Generate
    generated = generate_all(job, tables)
    zip_path = make_zip(jid, generated)

    # Update job
    gen_files = {}
    for key, filepath in generated.items():
        if filepath and filepath.exists():
            gen_files[key] = str(filepath.name)
    gen_files["zip"] = str(zip_path.name)
    job.generated_files = gen_files
    if job.status == "draft":
        job.status = "generated"
    db.commit()

    return {
        "ok": True,
        "tables": {k: (str(v.name) if v else None) for k, v in generated.items()},
        "zip": str(zip_path.name),
    }


@router.get("/{jid}/download/{filename}")
def download_file(jid: int, filename: str):
    """Download a generated file."""
    file_path = OUTPUT_DIR / str(jid) / filename
    if not file_path.exists():
        raise HTTPException(404, f"文件不存在: {filename}")
    return FileResponse(
        path=str(file_path),
        filename=filename,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )


@router.get("/{jid}/download-zip")
def download_zip(jid: int):
    """Download the ZIP archive of all generated tables."""
    # Find the zip file in the output directory
    out_dir = OUTPUT_DIR / str(jid)
    if not out_dir.exists():
        raise HTTPException(404, "尚未生成表格")

    zip_files = sorted(out_dir.glob("*.zip"), key=os.path.getmtime, reverse=True)
    if not zip_files:
        raise HTTPException(404, "尚未生成表格")

    zip_path = zip_files[0]
    return FileResponse(
        path=str(zip_path),
        filename=zip_path.name,
        media_type="application/zip",
    )
