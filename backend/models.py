"""
TradeHub ORM models — 15 tables covering import trade full lifecycle.
SQLAlchemy declarative, SQLite backend.
"""

import datetime
from decimal import Decimal

from sqlalchemy import (
    Column, Integer, String, Text, Float, DateTime, Boolean, Date,
    ForeignKey, JSON, Enum as SAEnum,
)
from sqlalchemy.orm import relationship

from database import Base


def _now():
    return datetime.datetime.utcnow()


# ═══════════════════════════════════════════════════════
# Customer domain
# ═══════════════════════════════════════════════════════

class Customer(Base):
    __tablename__ = "customers"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(200), nullable=False)
    contact_person = Column(String(100), default="")
    phone = Column(String(30), default="")
    email = Column(String(200), default="")
    company_address = Column(Text, default="")
    industry_tags = Column(String(300), default="")  # comma-separated
    source = Column(String(100), default="")
    exhibition_id = Column(Integer, ForeignKey("exhibitions.id", ondelete="SET NULL"), nullable=True)
    notes = Column(Text, default="")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)
    price_tolerance_score = Column(Float, nullable=True)   # 0-100, computed from pricing analysis
    price_tier = Column(String(10), nullable=True)          # premium / standard / value / null

    contacts = relationship("CustomerContact", back_populates="customer", cascade="all, delete-orphan")
    quotations = relationship("Quotation", back_populates="customer")
    orders = relationship("Order", back_populates="customer")
    exhibition = relationship("Exhibition", foreign_keys=[exhibition_id])


class CustomerContact(Base):
    __tablename__ = "customer_contacts"
    id = Column(Integer, primary_key=True, autoincrement=True)
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    title = Column(String(100), default="")
    phone = Column(String(30), default="")
    email = Column(String(200), default="")
    wechat = Column(String(100), default="")
    is_primary = Column(Boolean, default=False)
    created_at = Column(DateTime, default=_now)

    customer = relationship("Customer", back_populates="contacts")


# ═══════════════════════════════════════════════════════
# Supplier domain
# ═══════════════════════════════════════════════════════

class Supplier(Base):
    __tablename__ = "suppliers"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(200), nullable=False)
    country = Column(String(100), default="")
    contact_person = Column(String(100), default="")
    phone = Column(String(30), default="")
    email = Column(String(200), default="")
    website = Column(String(300), default="")
    product_categories = Column(String(300), default="")  # comma-separated
    brands = Column(String(500), default="")              # 代理品牌，逗号分隔
    agency_start = Column(Date, nullable=True)            # 代理开始日期
    agency_end = Column(Date, nullable=True)              # 代理结束日期
    payment_terms = Column(String(200), default="")
    rating = Column(Integer, default=0)  # 1-5
    notes = Column(Text, default="")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)

    quotes = relationship("SupplierQuote", back_populates="supplier", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="supplier")


class SupplierQuote(Base):
    __tablename__ = "supplier_quotes"
    id = Column(Integer, primary_key=True, autoincrement=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    price = Column(Float, nullable=False)
    currency = Column(String(10), default="USD")
    moq = Column(Integer, default=1)  # minimum order quantity
    lead_time_days = Column(Integer, default=30)
    incoterms = Column(String(20), default="FOB")
    quoted_at = Column(DateTime, default=_now)
    valid_until = Column(Date, nullable=True)
    is_current = Column(Boolean, default=True)

    supplier = relationship("Supplier", back_populates="quotes")
    product = relationship("Product")


# ═══════════════════════════════════════════════════════
# Freight Forwarder domain
# ═══════════════════════════════════════════════════════

class FreightForwarder(Base):
    __tablename__ = "freight_forwarders"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(200), nullable=False)
    contact_person = Column(String(100), default="")
    phone = Column(String(30), default="")
    email = Column(String(200), default="")
    transport_modes = Column(String(200), default="")  # comma-separated: sea,air,rail
    rating = Column(Integer, default=0)  # 1-5
    notes = Column(Text, default="")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=_now)

    quotes = relationship("FreightQuote", back_populates="forwarder", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="forwarder")


class FreightQuote(Base):
    __tablename__ = "freight_quotes"
    id = Column(Integer, primary_key=True, autoincrement=True)
    forwarder_id = Column(Integer, ForeignKey("freight_forwarders.id", ondelete="CASCADE"), nullable=False)
    origin = Column(String(200), default="")
    destination = Column(String(200), default="")
    transport_mode = Column(String(20), default="sea")
    price = Column(Float, nullable=False)
    currency = Column(String(10), default="USD")
    transit_days = Column(Integer, default=30)
    incoterms = Column(String(20), default="FOB")
    quoted_at = Column(DateTime, default=_now)
    valid_until = Column(Date, nullable=True)
    is_selected = Column(Boolean, default=False)

    forwarder = relationship("FreightForwarder", back_populates="quotes")


# ═══════════════════════════════════════════════════════
# Product domain
# ═══════════════════════════════════════════════════════

class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(300), nullable=False)
    brand = Column(String(100), default="")          # FAR / CHEMISAFE / KERAPLAN / KARTELL / LIEBHERR / FUMEX
    origin_country = Column(String(50), default="")   # IT / DE / SE etc
    category = Column(String(100), default="")
    sku = Column(String(100), default="")
    unit = Column(String(20), default="pcs")
    hs_code = Column(String(20), default="")
    description = Column(Text, default="")
    specifications = Column(Text, default="")
    image_url = Column(String(500), default="")
    created_at = Column(DateTime, default=_now)


# ═══════════════════════════════════════════════════════
# Quotation domain
# ═══════════════════════════════════════════════════════

_QUOTATION_STATUSES = ("draft", "sent", "accepted", "rejected", "expired")


class Quotation(Base):
    __tablename__ = "quotations"
    id = Column(Integer, primary_key=True, autoincrement=True)
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(300), nullable=False)
    status = Column(String(20), default="draft")
    items = Column(JSON, default=list)  # [{product_id, name, quantity, unit_price, amount}]
    subtotal = Column(Float, default=0)
    tax = Column(Float, default=0)
    total = Column(Float, default=0)
    currency = Column(String(10), default="CNY")
    valid_until = Column(Date, nullable=True)
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)

    customer = relationship("Customer", back_populates="quotations")


# ═══════════════════════════════════════════════════════
# Order domain — the core
# ═══════════════════════════════════════════════════════

_ORDER_STATUSES = (
    "inquiry", "quoted", "ordered", "shipped",
    "customs", "delivered", "completed", "cancelled",
)


class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, autoincrement=True)
    order_no = Column(String(50), unique=True, nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="SET NULL"), nullable=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id", ondelete="SET NULL"), nullable=True)
    forwarder_id = Column(Integer, ForeignKey("freight_forwarders.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(20), default="inquiry")
    total_revenue = Column(Float, default=0)    # 卖给客户的价格
    purchase_cost = Column(Float, default=0)    # 供应商采购成本
    freight_cost = Column(Float, default=0)     # 货代运费
    customs_cost = Column(Float, default=0)     # 关税+杂费
    net_profit = Column(Float, default=0)       # 净利润
    estimated_delivery = Column(Date, nullable=True)
    actual_delivery = Column(Date, nullable=True)
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)

    customer = relationship("Customer", back_populates="orders")
    supplier = relationship("Supplier", back_populates="orders")
    forwarder = relationship("FreightForwarder", back_populates="orders")
    timeline = relationship("OrderTimeline", back_populates="order", cascade="all, delete-orphan")
    contracts = relationship("Contract", back_populates="order", cascade="all, delete-orphan")
    tickets = relationship("AfterSalesTicket", back_populates="order")
    rmas = relationship("RMAReturn", back_populates="order")
    invoices = relationship("Invoice", back_populates="order")


class OrderTimeline(Base):
    __tablename__ = "order_timeline"
    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    event_type = Column(String(50), nullable=False)
    description = Column(Text, default="")
    timestamp = Column(DateTime, default=_now)
    operator = Column(String(100), default="system")

    order = relationship("Order", back_populates="timeline")


# ═══════════════════════════════════════════════════════
# Contract domain
# ═══════════════════════════════════════════════════════

class Contract(Base):
    __tablename__ = "contracts"
    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="SET NULL"), nullable=True)
    contract_no = Column(String(100), nullable=False)
    type = Column(String(20), default="sales")  # sales / purchase
    party_name = Column(String(200), default="")
    content_json = Column(JSON, default=dict)   # structured contract data
    pdf_path = Column(String(500), default="")
    status = Column(String(20), default="draft")  # draft / signed / cancelled
    signed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=_now)

    order = relationship("Order", back_populates="contracts")


# ═══════════════════════════════════════════════════════
# After-Sales domain
# ═══════════════════════════════════════════════════════

_TICKET_PRIORITIES = ("low", "medium", "high", "urgent")
_TICKET_STATUSES = ("open", "assigned", "in_progress", "waiting_parts", "resolved", "closed")
_ISSUE_TYPES = ("repair", "replacement", "consultation", "complaint")


class AfterSalesTicket(Base):
    __tablename__ = "after_sales_tickets"
    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="SET NULL"), nullable=True)
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(300), nullable=False)
    priority = Column(String(20), default="medium")
    status = Column(String(20), default="open")
    issue_type = Column(String(30), default="repair")
    description = Column(Text, default="")
    assigned_to = Column(Integer, ForeignKey("technicians.id", ondelete="SET NULL"), nullable=True)
    resolution = Column(Text, default="")
    resolved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)

    order = relationship("Order", back_populates="tickets")
    customer = relationship("Customer")
    technician = relationship("Technician", foreign_keys=[assigned_to])
    comments = relationship("TicketComment", back_populates="ticket", cascade="all, delete-orphan")


class TicketComment(Base):
    __tablename__ = "ticket_comments"
    id = Column(Integer, primary_key=True, autoincrement=True)
    ticket_id = Column(Integer, ForeignKey("after_sales_tickets.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    author = Column(String(100), default="")
    created_at = Column(DateTime, default=_now)

    ticket = relationship("AfterSalesTicket", back_populates="comments")


_RMA_STATUSES = ("requested", "approved", "shipped_back", "received", "inspected", "refunded", "replaced")


class RMAReturn(Base):
    __tablename__ = "rma_returns"
    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="SET NULL"), nullable=True)
    ticket_id = Column(Integer, ForeignKey("after_sales_tickets.id", ondelete="SET NULL"), nullable=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    reason = Column(Text, default="")
    status = Column(String(20), default="requested")
    return_tracking_no = Column(String(100), default="")
    refund_amount = Column(Float, default=0)
    created_at = Column(DateTime, default=_now)

    order = relationship("Order", back_populates="rmas")
    ticket = relationship("AfterSalesTicket")
    product = relationship("Product")


# ═══════════════════════════════════════════════════════
# Technician domain
# ═══════════════════════════════════════════════════════

class Technician(Base):
    __tablename__ = "technicians"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    phone = Column(String(30), default="")
    email = Column(String(200), default="")
    specialties = Column(String(300), default="")
    is_available = Column(Boolean, default=True)
    current_load = Column(Integer, default=0)  # active ticket count
    created_at = Column(DateTime, default=_now)


class WorkSchedule(Base):
    __tablename__ = "work_schedule"
    id = Column(Integer, primary_key=True, autoincrement=True)
    technician_id = Column(Integer, ForeignKey("technicians.id", ondelete="CASCADE"), nullable=False)
    ticket_id = Column(Integer, ForeignKey("after_sales_tickets.id", ondelete="SET NULL"), nullable=True)
    scheduled_date = Column(Date, nullable=False)
    start_time = Column(String(10), default="09:00")
    end_time = Column(String(10), default="17:00")
    status = Column(String(20), default="scheduled")  # scheduled / in_progress / completed
    notes = Column(Text, default="")

    technician = relationship("Technician")
    ticket = relationship("AfterSalesTicket")


# ═══════════════════════════════════════════════════════
# Knowledge Base
# ═══════════════════════════════════════════════════════

class KnowledgeArticle(Base):
    __tablename__ = "knowledge_articles"
    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(300), nullable=False)
    content = Column(Text, default="")
    category = Column(String(100), default="")
    tags = Column(String(300), default="")  # comma-separated
    view_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)


# ═══════════════════════════════════════════════════════
# Finance domain
# ═══════════════════════════════════════════════════════

_INVOICE_TYPES = ("sales", "purchase")
_INVOICE_STATUSES = ("issued", "paid", "overdue", "cancelled")


class Invoice(Base):
    __tablename__ = "invoices"
    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="SET NULL"), nullable=True)
    invoice_no = Column(String(100), unique=True, nullable=False)
    type = Column(String(20), default="sales")
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="CNY")
    issue_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=True)
    status = Column(String(20), default="issued")
    paid_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=_now)

    order = relationship("Order", back_populates="invoices")


class Payment(Base):
    __tablename__ = "payments"
    id = Column(Integer, primary_key=True, autoincrement=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id", ondelete="SET NULL"), nullable=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="SET NULL"), nullable=True)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="CNY")
    method = Column(String(30), default="bank_transfer")  # bank_transfer / cash / alipay / wechat
    paid_at = Column(DateTime, default=_now)
    reference_no = Column(String(100), default="")


# ═══════════════════════════════════════════════════════
# Audit Log
# ═══════════════════════════════════════════════════════

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=_now, index=True)
    action = Column(String(30), nullable=False)       # create / delete / update_amount / sign / status_change
    target_type = Column(String(30), nullable=False)   # customer / order / invoice / contract / quotation
    target_id = Column(Integer, nullable=True)         # PK of affected record
    operator_ip = Column(String(50), default="")
    summary = Column(String(500), default="")          # human-readable description


# ═══════════════════════════════════════════════════════
# Certification domain — 认证合规跟踪
# ═══════════════════════════════════════════════════════

_CERT_TYPES = ("CCC", "计量器具型式批准", "CE", "ISO", "防爆认证", "其他")


class Certification(Base):
    __tablename__ = "certifications"
    id = Column(Integer, primary_key=True, autoincrement=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    product_name = Column(String(300), default="")
    brand = Column(String(100), default="")
    model = Column(String(200), default="")
    cert_type = Column(String(50), nullable=False)          # CCC / 计量批准 / CE / ISO / 防爆认证 / 其他
    cert_number = Column(String(200), default="")
    issued_date = Column(Date, nullable=True)
    expiry_date = Column(Date, nullable=True)
    issuing_body = Column(String(200), default="")          # 发证机构
    status = Column(String(20), default="valid")            # valid / expiring_soon / expired
    notes = Column(Text, default="")
    attachment_url = Column(String(500), default="")
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)

    product = relationship("Product")


# ═══════════════════════════════════════════════════════
# Exhibition domain — 展会管理
# ═══════════════════════════════════════════════════════

class Exhibition(Base):
    __tablename__ = "exhibitions"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(300), nullable=False)
    date_start = Column(Date, nullable=True)
    date_end = Column(Date, nullable=True)
    location = Column(String(200), default="")
    city = Column(String(100), default="")
    booth_number = Column(String(50), default="")
    cost_cny = Column(Float, default=0)                     # 参展成本
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)

    leads = relationship("Lead", back_populates="exhibition", cascade="all, delete-orphan")


# ═══════════════════════════════════════════════════════
# Lead domain — 展会线索
# ═══════════════════════════════════════════════════════

_LEAD_SOURCES = ("exhibition", "referral", "website", "cold_call", "association", "other")
_LEAD_STATUSES = ("new", "contacted", "qualified", "quoted", "won", "lost")


class Lead(Base):
    __tablename__ = "leads"
    id = Column(Integer, primary_key=True, autoincrement=True)
    exhibition_id = Column(Integer, ForeignKey("exhibitions.id", ondelete="SET NULL"), nullable=True)
    company_name = Column(String(300), nullable=False)
    contact_name = Column(String(100), default="")
    contact_phone = Column(String(50), default="")
    contact_email = Column(String(200), default="")
    position = Column(String(100), default="")
    source = Column(String(30), default="exhibition")
    status = Column(String(30), default="new")
    interest_level = Column(Integer, default=0)             # 1-5
    requirements = Column(Text, default="")
    estimated_value_cny = Column(Float, default=0)
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)

    exhibition = relationship("Exhibition", back_populates="leads")


# ═══════════════════════════════════════════════════════
# Customs Operations (截关工具)
# ═══════════════════════════════════════════════════════

class OpsJob(Base):
    __tablename__ = "ops_jobs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    job_no = Column(String(30), default="")
    customer_name = Column(String(200), default="")
    status = Column(String(20), default="draft")  # draft / generated / sent

    # ── 船期信息 (from BC) ──
    vessel_name = Column(String(100), default="")
    voyage = Column(String(50), default="")
    customs_decl_no = Column(String(50), default="")
    booking_no = Column(String(50), default="")
    pol = Column(String(50), default="")              # Port of Loading
    pod = Column(String(50), default="")              # Port of Discharge
    place_of_receipt = Column(String(100), default="")
    place_of_delivery = Column(String(100), default="")
    etd = Column(String(20), default="")              # Estimated Departure
    carrier = Column(String(100), default="")         # 船公司

    # ── 参与方 (发货人/收货人/通知人) ──
    shipper_code = Column(String(50), default="")
    shipper_name = Column(String(300), default="")
    shipper_address = Column(String(500), default="")
    shipper_country_code = Column(String(5), default="")
    shipper_phone = Column(String(50), default="")
    shipper_fax = Column(String(50), default="")
    shipper_email = Column(String(200), default="")
    shipper_aeo = Column(String(50), default="")

    consignee_code = Column(String(50), default="")
    consignee_name = Column(String(300), default="")
    consignee_address = Column(String(500), default="")
    consignee_country_code = Column(String(5), default="")
    consignee_phone = Column(String(50), default="")
    consignee_fax = Column(String(50), default="")
    consignee_email = Column(String(200), default="")
    consignee_aeo = Column(String(50), default="")
    consignee_contact_person = Column(String(100), default="")
    consignee_contact_phone = Column(String(50), default="")

    notifier_code = Column(String(50), default="")
    notifier_name = Column(String(300), default="")
    notifier_address = Column(String(500), default="")
    notifier_country_code = Column(String(5), default="")
    notifier_phone = Column(String(50), default="")
    notifier_fax = Column(String(50), default="")
    notifier_email = Column(String(200), default="")
    notifier_aeo = Column(String(50), default="")

    # ── ICS2 专用 ──
    ics2_declaration_type = Column(String(10), default="F15")  # F15 / F17
    ics2_member_state = Column(String(5), default="")          # 成员国代码
    mbl_no = Column(String(50), default="")
    hbl_no = Column(String(50), default="")
    mbl_total_weight = Column(Float, default=0)
    hbl_total_weight = Column(Float, default=0)
    imo = Column(String(50), default="")
    transit_countries = Column(String(200), default="")        # CN|DE format
    has_hbl = Column(Boolean, default=True)
    mbl_contract_no = Column(String(50), default="")
    hbl_contract_no = Column(String(50), default="")
    mbl_type = Column(String(50), default="MASTER BILL OF LADING")
    hbl_type = Column(String(50), default="HOUSE BILL OF LADING")
    payment_type = Column(String(50), default="PAYMENT IN CASH")
    transport_mode = Column(String(50), default="MARITIME TRANSPORT")
    container_mark = Column(String(20), default="集装箱")

    # ICS2 卖家信息
    seller_eori = Column(String(50), default="")
    seller_name = Column(String(300), default="")
    seller_type = Column(String(50), default="")
    seller_country_code = Column(String(5), default="")
    seller_city = Column(String(100), default="")
    seller_street = Column(String(300), default="")
    seller_street_no = Column(String(20), default="")
    seller_postal_code = Column(String(20), default="")
    seller_po_box = Column(String(50), default="")
    seller_phone = Column(String(50), default="")

    # ICS2 买家信息
    buyer_eori = Column(String(50), default="")
    buyer_name = Column(String(300), default="")
    buyer_type = Column(String(50), default="")
    buyer_country_code = Column(String(5), default="")
    buyer_city = Column(String(100), default="")
    buyer_street = Column(String(300), default="")
    buyer_street_no = Column(String(20), default="")
    buyer_postal_code = Column(String(20), default="")
    buyer_po_box = Column(String(50), default="")
    buyer_phone = Column(String(50), default="")

    # ICS2 申报方
    ics2_declarant_eori = Column(String(50), default="")
    ics2_declarant_name = Column(String(300), default="")
    ics2_declarant_country_code = Column(String(5), default="")
    ics2_declarant_city = Column(String(100), default="")
    ics2_declarant_street = Column(String(300), default="")
    ics2_declarant_street_no = Column(String(20), default="")
    ics2_declarant_postal_code = Column(String(20), default="")
    ics2_declarant_po_box = Column(String(50), default="")
    ics2_declarant_phone = Column(String(50), default="")
    ics2_declarant_email = Column(String(200), default="")

    # ── 箱货明细 (JSON) ──
    containers = Column(JSON, default=list)
    # [{container_no, seal_no, container_type, is_soc, status}]
    products = Column(JSON, default=list)
    # [{seq, description, hs_code, weight, packages, pkg_unit, marks, undg, cus_code}]

    # ── 做箱通知 ──
    loading_date = Column(String(20), default="")
    warehouse_address = Column(String(500), default="")
    warehouse_phone = Column(String(50), default="")
    receiving_company = Column(String(200), default="")
    job_no_ref = Column(String(30), default="")
    container_seal_deadline = Column(String(20), default="")
    fm_department = Column(String(100), default="")
    cc_recipient = Column(String(200), default="")
    transit_port = Column(String(50), default="")
    container_type_qty = Column(String(100), default="")

    # ── ENS 专用 ──
    ens_contact_person = Column(String(100), default="")
    ens_contact_email = Column(String(200), default="")
    ens_contact_phone = Column(String(50), default="")
    ens_contact_fax = Column(String(50), default="")
    ens_marks = Column(String(100), default="N/M")
    ens_goods_desc = Column(String(500), default="")

    # ── 元数据 ──
    source_files = Column(JSON, default=list)
    generated_files = Column(JSON, default=dict)
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)
