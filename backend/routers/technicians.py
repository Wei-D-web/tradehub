"""Technician CRUD + scheduling router."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import Technician, WorkSchedule, AfterSalesTicket
from schemas import TechnicianCreate, TechnicianUpdate, TechnicianOut, ScheduleCreate, ScheduleUpdate, ScheduleOut, MsgResponse

router = APIRouter(prefix="/api/technicians", tags=["technicians"])


@router.get("", response_model=list[TechnicianOut])
def list_technicians(is_available: bool | None = None, db: Session = Depends(get_db)):
    q = db.query(Technician).order_by(Technician.name)
    if is_available is not None:
        q = q.filter(Technician.is_available == is_available)
    rows = q.all()

    if rows:
        # Batch-load active ticket counts in 1 query
        loads = dict(
            db.query(
                AfterSalesTicket.assigned_to,
                func.count(AfterSalesTicket.id),
            ).filter(
                AfterSalesTicket.assigned_to.in_([r.id for r in rows]),
                AfterSalesTicket.status.in_(["open", "assigned", "in_progress", "waiting_parts"]),
            ).group_by(AfterSalesTicket.assigned_to).all()
        )
        for r in rows:
            r.current_load = loads.get(r.id, 0)

    return rows


@router.get("/{tid}", response_model=TechnicianOut)
def get_technician(tid: int, db: Session = Depends(get_db)):
    r = db.query(Technician).get(tid)
    if not r:
        raise HTTPException(404, "技术员不存在")
    r.current_load = db.query(func.count(AfterSalesTicket.id)).filter(
        AfterSalesTicket.assigned_to == tid,
        AfterSalesTicket.status.in_(["open", "assigned", "in_progress", "waiting_parts"]),
    ).scalar() or 0
    return r


@router.post("", response_model=TechnicianOut)
def create_technician(body: TechnicianCreate, db: Session = Depends(get_db)):
    t = Technician(**body.model_dump())
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


@router.put("/{tid}", response_model=TechnicianOut)
def update_technician(tid: int, body: TechnicianUpdate, db: Session = Depends(get_db)):
    t = db.query(Technician).get(tid)
    if not t:
        raise HTTPException(404, "技术员不存在")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(t, k, v)
    db.commit()
    db.refresh(t)
    return t


@router.delete("/{tid}", response_model=MsgResponse)
def delete_technician(tid: int, db: Session = Depends(get_db)):
    t = db.query(Technician).get(tid)
    if not t:
        raise HTTPException(404, "技术员不存在")
    db.delete(t)
    db.commit()
    return {"ok": True, "message": "已删除"}


# ── Schedule ──

@router.get("/schedules", response_model=list[ScheduleOut])
def list_schedules(date: str = "", technician_id: int | None = None, db: Session = Depends(get_db)):
    q = db.query(WorkSchedule).order_by(WorkSchedule.scheduled_date.desc())
    if date:
        q = q.filter(WorkSchedule.scheduled_date == date)
    if technician_id:
        q = q.filter(WorkSchedule.technician_id == technician_id)
    return q.all()


@router.post("/schedules", response_model=ScheduleOut)
def create_schedule(body: ScheduleCreate, db: Session = Depends(get_db)):
    s = WorkSchedule(**body.model_dump())
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


@router.put("/schedules/{sid}", response_model=ScheduleOut)
def update_schedule(sid: int, body: ScheduleUpdate, db: Session = Depends(get_db)):
    s = db.query(WorkSchedule).get(sid)
    if not s:
        raise HTTPException(404, "排班不存在")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(s, k, v)
    db.commit()
    db.refresh(s)
    return s


@router.delete("/schedules/{sid}", response_model=MsgResponse)
def delete_schedule(sid: int, db: Session = Depends(get_db)):
    s = db.query(WorkSchedule).get(sid)
    if not s:
        raise HTTPException(404, "排班不存在")
    db.delete(s)
    db.commit()
    return {"ok": True, "message": "已删除"}
