"""Boss Dashboard — KPI aggregation + trend data."""

from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import Order, AfterSalesTicket, Customer, Invoice

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/kpi")
def kpi_overview(db: Session = Depends(get_db)):
    """Big-number KPIs for the boss."""
    total_orders = db.query(func.count(Order.id)).scalar() or 0
    active_orders = db.query(func.count(Order.id)).filter(
        Order.status.in_(["inquiry", "quoted", "ordered", "shipped", "customs"])
    ).scalar() or 0
    completed_orders = db.query(func.count(Order.id)).filter(
        Order.status == "completed"
    ).scalar() or 0

    total_customers = db.query(func.count(Customer.id)).filter(Customer.is_active == True).scalar() or 0

    # Revenue / profit
    rev_row = db.query(
        func.sum(Order.total_revenue),
        func.sum(Order.net_profit),
    ).filter(Order.status != "cancelled").first()
    total_revenue = float(rev_row[0] or 0)
    total_profit = float(rev_row[1] or 0)

    # Tickets
    open_tickets = db.query(func.count(AfterSalesTicket.id)).filter(
        AfterSalesTicket.status.in_(["open", "assigned", "in_progress", "waiting_parts"])
    ).scalar() or 0

    # Overdue invoices
    overdue = db.query(func.count(Invoice.id)).filter(
        Invoice.status == "overdue"
    ).scalar() or 0
    # Auto-mark overdue
    today = date.today()
    db.query(Invoice).filter(
        Invoice.status == "issued",
        Invoice.due_date < today,
    ).update({"status": "overdue"}, synchronize_session=False)
    db.commit()

    overdue = db.query(func.count(Invoice.id)).filter(Invoice.status == "overdue").scalar() or 0

    return {
        "total_orders": total_orders,
        "active_orders": active_orders,
        "completed_orders": completed_orders,
        "total_customers": total_customers,
        "total_revenue": total_revenue,
        "total_profit": total_profit,
        "open_tickets": open_tickets,
        "overdue_invoices": overdue,
    }


@router.get("/trend")
def monthly_trend(months: int = 6, db: Session = Depends(get_db)):
    """Monthly revenue and profit trend for the last N months."""
    result = []
    today = date.today()
    for i in range(months - 1, -1, -1):
        start = (today.replace(day=1) - timedelta(days=i * 31)).replace(day=1)
        if i == 0:
            end = today
        else:
            if start.month == 12:
                end = start.replace(year=start.year + 1, month=1, day=1)
            else:
                end = start.replace(month=start.month + 1, day=1)

        row = db.query(
            func.count(Order.id),
            func.coalesce(func.sum(Order.total_revenue), 0),
            func.coalesce(func.sum(Order.net_profit), 0),
        ).filter(
            Order.created_at >= start,
            Order.created_at < end,
            Order.status != "cancelled",
        ).first()

        result.append({
            "month": start.strftime("%Y-%m"),
            "order_count": row[0] or 0,
            "revenue": float(row[1] or 0),
            "profit": float(row[2] or 0),
        })

    return result


@router.get("/order-status")
def order_status_distribution(db: Session = Depends(get_db)):
    """Count of orders by status."""
    rows = db.query(Order.status, func.count(Order.id)).group_by(Order.status).all()
    return [{"status": s, "count": c} for s, c in rows]


@router.get("/recent")
def recent_activity(limit: int = 10, db: Session = Depends(get_db)):
    """Recent orders and tickets for the activity feed."""
    recent_orders = db.query(Order).order_by(Order.updated_at.desc()).limit(limit).all()
    recent_tickets = db.query(AfterSalesTicket).order_by(AfterSalesTicket.updated_at.desc()).limit(limit).all()

    activity = []
    for o in recent_orders:
        activity.append({
            "type": "order",
            "id": o.id,
            "title": f"订单 {o.order_no}",
            "status": o.status,
            "time": o.updated_at.isoformat() if o.updated_at else "",
        })
    for t in recent_tickets:
        activity.append({
            "type": "ticket",
            "id": t.id,
            "title": t.title,
            "status": t.status,
            "time": t.updated_at.isoformat() if t.updated_at else "",
        })

    activity.sort(key=lambda x: x["time"], reverse=True)
    return activity[:limit]
