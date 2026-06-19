"""Customer Pricing Intelligence router — auto-learns customer price tolerance levels."""

from collections import defaultdict

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session, joinedload

from database import get_db
from models import Customer, Quotation, Order, Product

router = APIRouter(prefix="/api/pricing", tags=["pricing"])


# ── Core algorithm ──────────────────────────────────────

def _compute_insights(
    db: Session,
    tier_filter: str = "",
    industry: str = "",
    search: str = "",
):
    """
    Compute price tolerance insights for all customers with data.
    Returns list[dict] suitable for JSON serialization.
    """
    # Step 1 — All accepted quotations
    quotes = (
        db.query(Quotation)
        .filter(Quotation.status == "accepted")
        .options(joinedload(Quotation.customer))
        .all()
    )

    # Step 2 — Build product → list[unit_price] map
    product_prices: dict[int, list[float]] = defaultdict(list)
    for q in quotes:
        for it in (q.items or []):
            pid = it.get("product_id") if isinstance(it, dict) else None
            up = it.get("unit_price", 0) if isinstance(it, dict) else 0
            if pid and isinstance(up, (int, float)) and up > 0:
                product_prices[pid].append(float(up))

    # Step 3 — Market average (skip products with only 1 price entry)
    market_avg: dict[int, float] = {}
    for pid, prices in product_prices.items():
        if len(prices) >= 2:
            market_avg[pid] = sum(prices) / len(prices)

    # Step 4 — Group quotations by customer
    cust_quotes: dict[int, list] = defaultdict(list)
    for q in quotes:
        if q.customer_id:
            cust_quotes[q.customer_id].append(q)

    # Step 5 — Build customer query (with optional filters)
    cq = db.query(Customer)
    if search:
        kw = f"%{search}%"
        cq = cq.filter(Customer.name.ilike(kw))
    if industry:
        cq = cq.filter(Customer.industry_tags.ilike(f"%{industry}%"))
    customers = cq.order_by(Customer.name).all()

    # Step 6 — Per-customer computation
    results = []
    for c in customers:
        qlist = cust_quotes.get(c.id, [])
        ratios = []
        samples = 0

        for q_ in qlist:
            for it in (q_.items or []):
                if not isinstance(it, dict):
                    continue
                pid = it.get("product_id")
                up = it.get("unit_price", 0)
                mavg = market_avg.get(pid) if pid else None
                if pid and mavg and mavg > 0 and isinstance(up, (int, float)) and up > 0:
                    ratios.append(float(up) / mavg)
                    samples += 1

        price_ratio = sum(ratios) / len(ratios) if ratios else 1.0

        # Profit margin from completed orders
        completed_orders = (
            db.query(Order)
            .filter(
                Order.customer_id == c.id,
                Order.status == "completed",
                Order.total_revenue > 0,
            )
            .all()
        )
        margins = [o.net_profit / o.total_revenue for o in completed_orders]
        avg_margin = sum(margins) / len(margins) if margins else 0.0

        # Score and tier
        if samples == 0:
            score = None
            tier = "unknown"
        else:
            # ratio component: maps 0.5x–2.0x → 0–60 points
            ratio_comp = max(0.0, min(60.0, (price_ratio - 0.5) * 60.0))
            # margin component: 0–40% margin → 0–40 points
            margin_comp = min(40.0, max(0.0, avg_margin * 100.0))
            score = round(ratio_comp + margin_comp, 1)

            if price_ratio > 1.15:
                tier = "premium"
            elif price_ratio < 0.85:
                tier = "value"
            else:
                tier = "standard"

        # Apply tier filter
        if tier_filter and tier != tier_filter:
            continue

        results.append({
            "customer_id": c.id,
            "customer_name": c.name,
            "industry_tags": c.industry_tags or "",
            "price_tolerance_score": score,
            "price_tier": tier,
            "price_ratio": round(price_ratio, 4),
            "sample_size": samples,
            "avg_margin": round(avg_margin, 4),
            "total_quotes": len(qlist),
            "total_orders": len(completed_orders),
        })

    return results


# ── Endpoints ────────────────────────────────────────────

@router.get("/insights")
def list_insights(
    tier: str = "",
    industry: str = "",
    search: str = "",
    db: Session = Depends(get_db),
):
    """Full pricing analysis for all customers with data."""
    try:
        results = _compute_insights(db, tier_filter=tier, industry=industry, search=search)
        if not results:
            return JSONResponse(content=[])
        return JSONResponse(content=results)
    except Exception as e:
        import traceback
        return JSONResponse(
            status_code=500,
            content={"error": f"{type(e).__name__}: {e}\n{traceback.format_exc()}"},
        )


@router.get("/summary")
def pricing_summary(db: Session = Depends(get_db)):
    """
    Lightweight mapping: customer_id → {tier, score}.
    Used by CustomersPage for quick tier badges.
    """
    try:
        results = _compute_insights(db)
        mapping: dict = {}
        for r in results:
            mapping[str(r["customer_id"])] = {
                "tier": r["price_tier"],
                "score": r["price_tolerance_score"],
            }
        return JSONResponse(content=mapping)
    except Exception as e:
        import traceback
        return JSONResponse(
            status_code=500,
            content={"error": f"{type(e).__name__}: {e}\n{traceback.format_exc()}"},
        )


@router.get("/customer/{cid}")
def customer_detail(cid: int, db: Session = Depends(get_db)):
    """Deep dive: single customer pricing analysis with per-product comparison."""
    try:
        c = db.query(Customer).get(cid)
        if not c:
            return JSONResponse(status_code=404, content={"error": "客户不存在"})

        # Get accepted quotations for this customer
        quotes = (
            db.query(Quotation)
            .filter(
                Quotation.customer_id == cid,
                Quotation.status == "accepted",
            )
            .all()
        )

        # Build market averages (same logic as _compute_insights)
        all_quotes = (
            db.query(Quotation)
            .filter(Quotation.status == "accepted")
            .all()
        )
        product_prices: dict[int, list[float]] = defaultdict(list)
        for q in all_quotes:
            for it in (q.items or []):
                pid = it.get("product_id") if isinstance(it, dict) else None
                up = it.get("unit_price", 0) if isinstance(it, dict) else 0
                if pid and isinstance(up, (int, float)) and up > 0:
                    product_prices[pid].append(float(up))

        market_avg: dict[int, float] = {}
        for pid, prices in product_prices.items():
            if len(prices) >= 2:
                market_avg[pid] = sum(prices) / len(prices)

        # Product comparisons for this customer
        comparisons = []
        ratios = []
        for q in quotes:
            for it in (q.items or []):
                if not isinstance(it, dict):
                    continue
                pid = it.get("product_id")
                up = it.get("unit_price", 0)
                mavg = market_avg.get(pid) if pid else None
                if pid and mavg and mavg > 0 and isinstance(up, (int, float)) and up > 0:
                    ratio = float(up) / mavg
                    ratios.append(ratio)
                    comparisons.append({
                        "product_id": pid,
                        "product_name": it.get("name", ""),
                        "customer_price": float(up),
                        "market_avg_price": round(mavg, 2),
                        "ratio": round(ratio, 4),
                        "quantity": it.get("quantity", 1),
                        "quotation_id": q.id,
                        "quotation_title": q.title,
                        "quotation_date": q.created_at.isoformat() if q.created_at else None,
                    })

        price_ratio = sum(ratios) / len(ratios) if ratios else 1.0
        samples = len(ratios)

        # Profit margin
        completed_orders = (
            db.query(Order)
            .filter(
                Order.customer_id == cid,
                Order.status == "completed",
                Order.total_revenue > 0,
            )
            .all()
        )
        margins = [o.net_profit / o.total_revenue for o in completed_orders]
        avg_margin = sum(margins) / len(margins) if margins else 0.0

        if samples == 0:
            score = None
            tier = "unknown"
        else:
            ratio_comp = max(0.0, min(60.0, (price_ratio - 0.5) * 60.0))
            margin_comp = min(40.0, max(0.0, avg_margin * 100.0))
            score = round(ratio_comp + margin_comp, 1)
            if price_ratio > 1.15:
                tier = "premium"
            elif price_ratio < 0.85:
                tier = "value"
            else:
                tier = "standard"

        result = {
            "customer_id": c.id,
            "customer_name": c.name,
            "industry_tags": c.industry_tags or "",
            "price_tolerance_score": score,
            "price_tier": tier,
            "price_ratio": round(price_ratio, 4),
            "sample_size": samples,
            "avg_margin": round(avg_margin, 4),
            "total_quotes": len(quotes),
            "total_orders": len(completed_orders),
            "product_comparisons": comparisons,
        }
        return JSONResponse(content=result)
    except Exception as e:
        import traceback
        return JSONResponse(
            status_code=500,
            content={"error": f"{type(e).__name__}: {e}\n{traceback.format_exc()}"},
        )
