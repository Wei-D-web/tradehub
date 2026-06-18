"""Boss Dashboard — KPI aggregation + trend data + audit log."""

from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from database import get_db
from models import Order, AfterSalesTicket, Customer, Invoice, AuditLog
from models import Certification, Exhibition, Lead, Product

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


# ── Audit Log ──
@router.get("/audit")
def audit_trail(limit: int = 100, action: str = "", db: Session = Depends(get_db)):
    """Recent audit log entries — who did what."""
    q = db.query(AuditLog).order_by(desc(AuditLog.timestamp))
    if action:
        q = q.filter(AuditLog.action == action)
    rows = q.limit(limit).all()
    return [
        {
            "id": r.id,
            "timestamp": r.timestamp.isoformat() if r.timestamp else "",
            "action": r.action,
            "target_type": r.target_type,
            "target_id": r.target_id,
            "operator_ip": r.operator_ip,
            "summary": r.summary,
        }
        for r in rows
    ]


# ── Certification Alerts ──
@router.get("/cert-alerts")
def cert_alerts(days: int = 90, db: Session = Depends(get_db)):
    """Certifications expiring within N days + already expired."""
    today = date.today()
    cutoff = today + timedelta(days=days)

    expired = db.query(func.count(Certification.id)).filter(
        Certification.expiry_date < today
    ).scalar() or 0

    expiring_30 = db.query(func.count(Certification.id)).filter(
        Certification.expiry_date >= today,
        Certification.expiry_date <= today + timedelta(days=30),
    ).scalar() or 0

    expiring_60 = db.query(func.count(Certification.id)).filter(
        Certification.expiry_date > today + timedelta(days=30),
        Certification.expiry_date <= today + timedelta(days=60),
    ).scalar() or 0

    expiring_90 = db.query(func.count(Certification.id)).filter(
        Certification.expiry_date > today + timedelta(days=60),
        Certification.expiry_date <= today + timedelta(days=90),
    ).scalar() or 0

    total = db.query(func.count(Certification.id)).scalar() or 0

    # Recent expiring/expired list
    recent = db.query(Certification).filter(
        Certification.expiry_date <= cutoff,
    ).order_by(Certification.expiry_date.asc()).limit(10).all()

    items = []
    for c in recent:
        delta = (c.expiry_date - today).days if c.expiry_date else 999
        items.append({
            "id": c.id,
            "product_name": c.product_name,
            "brand": c.brand,
            "cert_type": c.cert_type,
            "cert_number": c.cert_number,
            "expiry_date": c.expiry_date.isoformat() if c.expiry_date else "",
            "days_left": delta,
            "status": "expired" if delta < 0 else ("expiring_soon" if delta <= 30 else "valid"),
        })

    return {
        "total": total,
        "expired": expired,
        "expiring_30": expiring_30,
        "expiring_60": expiring_60,
        "expiring_90": expiring_90,
        "recent_items": items,
    }


# ── Exhibition Summary ──
@router.get("/exhibition-summary")
def exhibition_summary(db: Session = Depends(get_db)):
    """Exhibition ROI and lead pipeline overview."""
    total_cost = db.query(func.coalesce(func.sum(Exhibition.cost_cny), 0)).scalar() or 0
    total_exhibitions = db.query(func.count(Exhibition.id)).scalar() or 0
    total_leads = db.query(func.count(Lead.id)).scalar() or 0
    exhibition_leads = db.query(func.count(Lead.id)).filter(Lead.source == "exhibition").scalar() or 0
    won = db.query(func.count(Lead.id)).filter(Lead.status == "won").scalar() or 0
    quotation_sent = db.query(func.count(Lead.id)).filter(Lead.status == "quoted").scalar() or 0
    won_value = db.query(func.coalesce(func.sum(Lead.estimated_value_cny), 0)).filter(
        Lead.status == "won"
    ).scalar() or 0

    conversion = f"{(won / exhibition_leads * 100):.1f}%" if exhibition_leads > 0 else "0%"
    cost_per_lead = float(total_cost) / exhibition_leads if exhibition_leads > 0 else 0

    return {
        "total_exhibitions": total_exhibitions,
        "total_cost": float(total_cost),
        "total_leads": total_leads,
        "exhibition_leads": exhibition_leads,
        "won_leads": won,
        "quoted_leads": quotation_sent,
        "conversion_rate": conversion,
        "won_value_cny": float(won_value),
        "cost_per_lead_cny": round(cost_per_lead, 2),
    }


# ── Brand Distribution ──
@router.get("/brand-distribution")
def brand_distribution(db: Session = Depends(get_db)):
    """Product count by brand."""
    rows = db.query(
        Product.brand, func.count(Product.id)
    ).filter(
        Product.brand != "", Product.brand.isnot(None)
    ).group_by(Product.brand).order_by(func.count(Product.id).desc()).all()
    return [{"brand": b or "未知", "count": c} for b, c in rows]
