"""
TradeHub Pydantic schemas — request/response validation.
"""

from datetime import date, datetime
from typing import Any, Optional
from pydantic import BaseModel, Field, field_validator, model_validator


# ── Generic ────────────────────────────────────────────

class MsgResponse(BaseModel):
    ok: bool = True
    message: str = ""


class ErrorResponse(BaseModel):
    ok: bool = False
    detail: str = ""


# ── Customer ────────────────────────────────────────────

class CustomerContactCreate(BaseModel):
    name: str
    title: str = ""
    phone: str = ""
    email: str = ""
    wechat: str = ""
    is_primary: bool = False


class CustomerContactOut(CustomerContactCreate):
    id: int
    customer_id: int
    created_at: datetime

    class Config:
        from_attributes = True

    @field_validator('title', 'phone', 'email', 'wechat', mode='before')
    @classmethod
    def _none_to_empty(cls, v: object) -> str:
        return v if v is not None else ""


class CustomerCreate(BaseModel):
    name: str
    contact_person: str = ""
    phone: str = ""
    email: str = ""
    company_address: str = ""
    industry_tags: str = ""
    source: str = ""
    exhibition_id: Optional[int] = None
    notes: str = ""


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    company_address: Optional[str] = None
    industry_tags: Optional[str] = None
    source: Optional[str] = None
    exhibition_id: Optional[int] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class CustomerOut(BaseModel):
    id: int
    name: str
    contact_person: str
    phone: str
    email: str
    company_address: str
    industry_tags: str
    source: str
    exhibition_id: Optional[int] = None
    exhibition_name: str = ""
    notes: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    contacts: list[CustomerContactOut] = []
    order_count: int = 0

    class Config:
        from_attributes = True

    @field_validator('contact_person', 'phone', 'email', 'company_address',
                     'industry_tags', 'source', 'notes', mode='before')
    @classmethod
    def _none_to_empty(cls, v: object) -> str:
        """Coerce NULL database values to empty string."""
        return v if v is not None else ""


# ── Supplier ────────────────────────────────────────────

class SupplierCreate(BaseModel):
    name: str
    country: str = ""
    contact_person: str = ""
    phone: str = ""
    email: str = ""
    website: str = ""
    product_categories: str = ""
    brands: str = ""
    agency_start: Optional[date] = None
    agency_end: Optional[date] = None
    payment_terms: str = ""
    rating: int = 0
    notes: str = ""


class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    country: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    product_categories: Optional[str] = None
    brands: Optional[str] = None
    agency_start: Optional[date] = None
    agency_end: Optional[date] = None
    payment_terms: Optional[str] = None
    rating: Optional[int] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class SupplierQuoteCreate(BaseModel):
    product_id: Optional[int] = None
    price: float
    currency: str = "USD"
    moq: int = 1
    lead_time_days: int = 30
    incoterms: str = "FOB"
    valid_until: Optional[date] = None


class SupplierQuoteOut(SupplierQuoteCreate):
    id: int
    supplier_id: int
    quoted_at: datetime
    is_current: bool
    product_name: str = ""

    class Config:
        from_attributes = True
    @field_validator('product_name', mode='before')
    @classmethod
    def _none_to_empty(cls, v: object) -> str:
        return v if v is not None else ""


class SupplierOut(BaseModel):
    id: int
    name: str
    country: str
    contact_person: str
    phone: str
    email: str
    website: str
    product_categories: str
    brands: str
    agency_start: Optional[date] = None
    agency_end: Optional[date] = None
    payment_terms: str
    rating: int
    notes: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    quotes: list[SupplierQuoteOut] = []

    class Config:
        from_attributes = True

    @field_validator('country', 'contact_person', 'phone', 'email', 'website',
                     'product_categories', 'brands', 'payment_terms', 'notes',
                     mode='before')
    @classmethod
    def _none_to_empty(cls, v: object) -> str:
        return v if v is not None else ""

    @field_validator('updated_at', mode='before')
    @classmethod
    def _none_to_created_at(cls, v: object, info) -> datetime:
        """Coerce NULL updated_at to created_at (for rows before migration)."""
        if v is None:
            return info.data.get('created_at', datetime(2026, 1, 1))
        return v


# ── Product ────────────────────────────────────────────

class ProductCreate(BaseModel):
    name: str
    brand: str = ""
    origin_country: str = ""
    category: str = ""
    sku: str = ""
    unit: str = "pcs"
    hs_code: str = ""
    description: str = ""
    specifications: str = ""


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    brand: Optional[str] = None
    origin_country: Optional[str] = None
    category: Optional[str] = None
    sku: Optional[str] = None
    unit: Optional[str] = None
    hs_code: Optional[str] = None
    description: Optional[str] = None
    specifications: Optional[str] = None


class ProductOut(BaseModel):
    id: int
    name: str
    brand: str
    origin_country: str
    category: str
    sku: str
    unit: str
    hs_code: str
    description: str
    specifications: str
    image_url: str
    created_at: datetime

    class Config:
        from_attributes = True

    @field_validator('brand', 'origin_country', 'category', 'sku', 'unit',
                     'hs_code', 'description', 'specifications', 'image_url',
                     mode='before')
    @classmethod
    def _none_to_empty(cls, v: object) -> str:
        return v if v is not None else ""


# ── Freight Forwarder ──────────────────────────────────

class ForwarderCreate(BaseModel):
    name: str
    contact_person: str = ""
    phone: str = ""
    email: str = ""
    transport_modes: str = ""
    rating: int = 0
    notes: str = ""


class ForwarderUpdate(BaseModel):
    name: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    transport_modes: Optional[str] = None
    rating: Optional[int] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class FreightQuoteCreate(BaseModel):
    origin: str = ""
    destination: str = ""
    transport_mode: str = "sea"
    price: float
    currency: str = "USD"
    transit_days: int = 30
    incoterms: str = "FOB"
    valid_until: Optional[date] = None


class FreightQuoteOut(FreightQuoteCreate):
    id: int
    forwarder_id: int
    quoted_at: datetime
    is_selected: bool

    class Config:
        from_attributes = True
    @field_validator('origin', 'destination', 'incoterms', mode='before')
    @classmethod
    def _none_to_empty(cls, v: object) -> str:
        return v if v is not None else ""


class ForwarderOut(BaseModel):
    id: int
    name: str
    contact_person: str
    phone: str
    email: str
    transport_modes: str
    rating: int
    notes: str
    is_active: bool
    created_at: datetime
    quotes: list[FreightQuoteOut] = []

    class Config:
        from_attributes = True
    @field_validator('contact_person', 'phone', 'email', 'transport_modes', 'notes', mode='before')
    @classmethod
    def _none_to_empty(cls, v: object) -> str:
        return v if v is not None else ""


# ── Quotation ──────────────────────────────────────────

class QuotationItemCreate(BaseModel):
    product_id: Optional[int] = None
    name: str = ""
    quantity: int = 1
    unit_price: float = 0
    amount: float = 0
    notes: str = ""


class QuotationCreate(BaseModel):
    customer_id: int
    title: str
    items: list[QuotationItemCreate] = []
    tax: float = 0
    currency: str = "CNY"
    valid_until: Optional[date] = None
    notes: str = ""


class QuotationUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None
    items: Optional[list[QuotationItemCreate]] = None
    tax: Optional[float] = None
    valid_until: Optional[date] = None
    notes: Optional[str] = None


class QuotationOut(BaseModel):
    id: int
    customer_id: Optional[int]
    customer_name: str = ""
    title: str
    status: str
    items: list[dict] = []
    subtotal: float
    tax: float
    total: float
    currency: str
    valid_until: Optional[date]
    notes: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
    @field_validator('customer_name', 'notes', mode='before')
    @classmethod
    def _none_to_empty(cls, v: object) -> str:
        return v if v is not None else ""


# ── Order ──────────────────────────────────────────────

class OrderCreate(BaseModel):
    customer_id: int
    title: str = ""  # short description
    supplier_id: Optional[int] = None
    forwarder_id: Optional[int] = None
    total_revenue: float = 0
    purchase_cost: float = 0
    freight_cost: float = 0
    customs_cost: float = 0
    estimated_delivery: Optional[date] = None
    notes: str = ""


class OrderUpdate(BaseModel):
    status: Optional[str] = None
    supplier_id: Optional[int] = None
    forwarder_id: Optional[int] = None
    total_revenue: Optional[float] = None
    purchase_cost: Optional[float] = None
    freight_cost: Optional[float] = None
    customs_cost: Optional[float] = None
    estimated_delivery: Optional[date] = None
    actual_delivery: Optional[date] = None
    notes: Optional[str] = None


class OrderTimelineOut(BaseModel):
    id: int
    event_type: str
    description: str
    timestamp: datetime
    operator: str

    class Config:
        from_attributes = True
    @field_validator('description', 'operator', mode='before')
    @classmethod
    def _none_to_empty(cls, v: object) -> str:
        return v if v is not None else ""


class OrderOut(BaseModel):
    id: int
    order_no: str
    customer_id: Optional[int]
    customer_name: str = ""
    supplier_id: Optional[int]
    supplier_name: str = ""
    forwarder_id: Optional[int]
    forwarder_name: str = ""
    status: str
    total_revenue: float
    purchase_cost: float
    freight_cost: float
    customs_cost: float
    net_profit: float
    estimated_delivery: Optional[date]
    actual_delivery: Optional[date]
    notes: str
    created_at: datetime
    updated_at: datetime
    timeline: list[OrderTimelineOut] = []

    class Config:
        from_attributes = True
    @field_validator('customer_name', 'supplier_name', 'forwarder_name', 'notes', mode='before')
    @classmethod
    def _none_to_empty(cls, v: object) -> str:
        return v if v is not None else ""


# ── Contract ───────────────────────────────────────────

class ContractCreate(BaseModel):
    order_id: int
    contract_no: str = ""
    type: str = "sales"
    party_name: str = ""
    content_json: dict = {}
    status: str = "draft"


class ContractUpdate(BaseModel):
    status: Optional[str] = None
    content_json: Optional[dict] = None


class ContractOut(BaseModel):
    id: int
    order_id: Optional[int]
    contract_no: str
    type: str
    party_name: str
    content_json: dict
    status: str
    signed_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True
    @field_validator('type', 'party_name', mode='before')
    @classmethod
    def _none_to_empty(cls, v: object) -> str:
        return v if v is not None else ""


# ── Logistics ───────────────────────────────────────────

class ShipmentCreate(BaseModel):
    order_id: int
    transport_mode: str = "sea"
    carrier: str = ""
    tracking_no: str = ""
    origin: str = ""
    destination: str = ""
    estimated_departure: Optional[date] = None
    estimated_arrival: Optional[date] = None
    actual_departure: Optional[date] = None
    actual_arrival: Optional[date] = None
    status: str = "pending"
    notes: str = ""


class ShipmentUpdate(BaseModel):
    transport_mode: Optional[str] = None
    carrier: Optional[str] = None
    tracking_no: Optional[str] = None
    status: Optional[str] = None
    estimated_arrival: Optional[date] = None
    actual_departure: Optional[date] = None
    actual_arrival: Optional[date] = None
    notes: Optional[str] = None


class ShipmentOut(BaseModel):
    id: int
    order_id: int
    order_no: str = ""
    transport_mode: str
    carrier: str
    tracking_no: str
    origin: str
    destination: str
    estimated_departure: Optional[date]
    estimated_arrival: Optional[date]
    actual_departure: Optional[date]
    actual_arrival: Optional[date]
    status: str
    notes: str
    created_at: datetime

    class Config:
        from_attributes = True
    @field_validator('order_no', 'carrier', 'tracking_no', 'origin', 'destination', 'notes', mode='before')
    @classmethod
    def _none_to_empty(cls, v: object) -> str:
        return v if v is not None else ""


# ── After-Sales Ticket ─────────────────────────────────

class TicketCreate(BaseModel):
    order_id: Optional[int] = None
    customer_id: Optional[int] = None
    title: str
    priority: str = "medium"
    issue_type: str = "repair"
    description: str = ""
    assigned_to: Optional[int] = None


class TicketUpdate(BaseModel):
    priority: Optional[str] = None
    status: Optional[str] = None
    issue_type: Optional[str] = None
    description: Optional[str] = None
    assigned_to: Optional[int] = None
    resolution: Optional[str] = None


class TicketCommentCreate(BaseModel):
    content: str
    author: str = ""


class TicketCommentOut(TicketCommentCreate):
    id: int
    ticket_id: int
    created_at: datetime

    class Config:
        from_attributes = True
    @field_validator('author', mode='before')
    @classmethod
    def _none_to_empty(cls, v: object) -> str:
        return v if v is not None else ""


class TicketOut(BaseModel):
    id: int
    order_id: Optional[int]
    order_no: str = ""
    customer_id: Optional[int]
    customer_name: str = ""
    title: str
    priority: str
    status: str
    issue_type: str
    description: str
    assigned_to: Optional[int]
    technician_name: str = ""
    resolution: str
    resolved_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    comments: list[TicketCommentOut] = []

    class Config:
        from_attributes = True
    @field_validator('order_no', 'customer_name', 'technician_name', 'description', 'resolution', mode='before')
    @classmethod
    def _none_to_empty(cls, v: object) -> str:
        return v if v is not None else ""


# ── RMA ────────────────────────────────────────────────

class RMACreate(BaseModel):
    order_id: int
    ticket_id: Optional[int] = None
    product_id: Optional[int] = None
    reason: str = ""
    return_tracking_no: str = ""
    refund_amount: float = 0


class RMAUpdate(BaseModel):
    status: Optional[str] = None
    return_tracking_no: Optional[str] = None
    refund_amount: Optional[float] = None


class RMAOut(BaseModel):
    id: int
    order_id: Optional[int]
    order_no: str = ""
    ticket_id: Optional[int]
    product_id: Optional[int]
    product_name: str = ""
    reason: str
    status: str
    return_tracking_no: str
    refund_amount: float
    created_at: datetime

    class Config:
        from_attributes = True
    @field_validator('order_no', 'product_name', 'reason', 'return_tracking_no', mode='before')
    @classmethod
    def _none_to_empty(cls, v: object) -> str:
        return v if v is not None else ""


# ── Technician ─────────────────────────────────────────

class TechnicianCreate(BaseModel):
    name: str
    phone: str = ""
    email: str = ""
    specialties: str = ""


class TechnicianUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    specialties: Optional[str] = None
    is_available: Optional[bool] = None


class ScheduleCreate(BaseModel):
    technician_id: int
    ticket_id: Optional[int] = None
    scheduled_date: date
    start_time: str = "09:00"
    end_time: str = "17:00"
    notes: str = ""


class ScheduleUpdate(BaseModel):
    technician_id: Optional[int] = None
    ticket_id: Optional[int] = None
    scheduled_date: Optional[date] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class ScheduleOut(ScheduleCreate):
    id: int
    status: str

    class Config:
        from_attributes = True
    @field_validator('notes', mode='before')
    @classmethod
    def _none_to_empty(cls, v: object) -> str:
        return v if v is not None else ""


class TechnicianOut(BaseModel):
    id: int
    name: str
    phone: str
    email: str
    specialties: str
    is_available: bool
    current_load: int
    created_at: datetime

    class Config:
        from_attributes = True
    @field_validator('phone', 'email', 'specialties', mode='before')
    @classmethod
    def _none_to_empty(cls, v: object) -> str:
        return v if v is not None else ""


# ── Knowledge ───────────────────────────────────────────

class KnowledgeCreate(BaseModel):
    title: str
    content: str = ""
    category: str = ""
    tags: str = ""


class KnowledgeUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[str] = None


class KnowledgeOut(BaseModel):
    id: int
    title: str
    content: str
    category: str
    tags: str
    view_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
    @field_validator('content', 'category', 'tags', mode='before')
    @classmethod
    def _none_to_empty(cls, v: object) -> str:
        return v if v is not None else ""


# ── Finance ────────────────────────────────────────────

class InvoiceCreate(BaseModel):
    order_id: int
    type: str = "sales"
    amount: float
    currency: str = "CNY"
    issue_date: date
    due_date: Optional[date] = None
    status: str = "issued"


class InvoiceUpdate(BaseModel):
    status: Optional[str] = None
    due_date: Optional[date] = None


class PaymentCreate(BaseModel):
    invoice_id: int
    order_id: int
    amount: float
    currency: str = "CNY"
    method: str = "bank_transfer"
    reference_no: str = ""


class InvoiceOut(BaseModel):
    id: int
    order_id: Optional[int]
    order_no: str = ""
    invoice_no: str
    type: str
    amount: float
    currency: str
    issue_date: date
    due_date: Optional[date]
    status: str
    paid_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True
    @field_validator('order_no', mode='before')
    @classmethod
    def _none_to_empty(cls, v: object) -> str:
        return v if v is not None else ""


class PaymentOut(BaseModel):
    id: int
    invoice_id: Optional[int]
    order_id: Optional[int]
    amount: float
    currency: str
    method: str
    paid_at: datetime
    reference_no: str

    class Config:
        from_attributes = True
    @field_validator('reference_no', mode='before')
    @classmethod
    def _none_to_empty(cls, v: object) -> str:
        return v if v is not None else ""


class ProfitSummary(BaseModel):
    total_revenue: float = 0
    total_cost: float = 0
    total_profit: float = 0
    order_count: int = 0
    period: str = ""  # e.g. "2026-06" or "2026-Q2" or "all"


# ── Certification ──────────────────────────────────────

class CertificationCreate(BaseModel):
    product_id: Optional[int] = None
    product_name: str = ""
    brand: str = ""
    model: str = ""
    cert_type: str = "CCC"
    cert_number: str = ""
    issued_date: Optional[date] = None
    expiry_date: Optional[date] = None
    issuing_body: str = ""
    notes: str = ""
    attachment_url: str = ""


class CertificationUpdate(BaseModel):
    product_id: Optional[int] = None
    product_name: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    cert_type: Optional[str] = None
    cert_number: Optional[str] = None
    issued_date: Optional[date] = None
    expiry_date: Optional[date] = None
    issuing_body: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    attachment_url: Optional[str] = None


class CertificationOut(BaseModel):
    id: int
    product_id: Optional[int]
    product_name: str
    brand: str
    model: str
    cert_type: str
    cert_number: str
    issued_date: Optional[date]
    expiry_date: Optional[date]
    issuing_body: str
    status: str
    notes: str
    attachment_url: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
    @field_validator('product_name', 'brand', 'model', 'cert_number', 'issuing_body', 'notes', 'attachment_url', mode='before')
    @classmethod
    def _none_to_empty(cls, v: object) -> str:
        return v if v is not None else ""


# ── Exhibition ─────────────────────────────────────────

class ExhibitionCreate(BaseModel):
    name: str
    date_start: Optional[date] = None
    date_end: Optional[date] = None
    location: str = ""
    city: str = ""
    booth_number: str = ""
    cost_cny: float = 0
    notes: str = ""


class ExhibitionUpdate(BaseModel):
    name: Optional[str] = None
    date_start: Optional[date] = None
    date_end: Optional[date] = None
    location: Optional[str] = None
    city: Optional[str] = None
    booth_number: Optional[str] = None
    cost_cny: Optional[float] = None
    notes: Optional[str] = None


class ExhibitionOut(BaseModel):
    id: int
    name: str
    date_start: Optional[date]
    date_end: Optional[date]
    location: str
    city: str
    booth_number: str
    cost_cny: float
    notes: str
    lead_count: int = 0
    won_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
    @field_validator('location', 'city', 'booth_number', 'notes', mode='before')
    @classmethod
    def _none_to_empty(cls, v: object) -> str:
        return v if v is not None else ""


# ── Lead ───────────────────────────────────────────────

class LeadCreate(BaseModel):
    exhibition_id: Optional[int] = None
    company_name: str
    contact_name: str = ""
    contact_phone: str = ""
    contact_email: str = ""
    position: str = ""
    source: str = "exhibition"
    status: str = "new"
    interest_level: int = 0
    requirements: str = ""
    estimated_value_cny: float = 0
    notes: str = ""


class LeadUpdate(BaseModel):
    exhibition_id: Optional[int] = None
    company_name: Optional[str] = None
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    position: Optional[str] = None
    source: Optional[str] = None
    status: Optional[str] = None
    interest_level: Optional[int] = None
    requirements: Optional[str] = None
    estimated_value_cny: Optional[float] = None
    notes: Optional[str] = None


class LeadOut(BaseModel):
    id: int
    exhibition_id: Optional[int]
    exhibition_name: str = ""
    company_name: str
    contact_name: str
    contact_phone: str
    contact_email: str
    position: str
    source: str
    status: str
    interest_level: int
    requirements: str
    estimated_value_cny: float
    notes: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
    @field_validator('exhibition_name', 'contact_name', 'contact_phone', 'contact_email', 'position', 'requirements', 'notes', mode='before')
    @classmethod
    def _none_to_empty(cls, v: object) -> str:
        return v if v is not None else ""


# ── Customs Operations (截关工具) ────────────────────────

class ContainerItem(BaseModel):
    container_no: str = ""
    seal_no: str = ""
    container_type: str = ""
    is_soc: str = ""     # "Carrier supplied" / "Shipper supplied"
    status: str = ""     # "EMPTY" / "NOT EMPTY"


class ProductItem(BaseModel):
    seq: int = 1
    description: str = ""
    hs_code: str = ""
    weight: float = 0
    packages: int = 0
    pkg_unit: str = ""      # 包装代码 e.g. "BUNDLE", "CARTON"
    marks: str = "N/M"
    undg: str = ""          # UN dangerous goods code
    cus_code: str = ""      # Customs code


class OpsJobCreate(BaseModel):
    customer_name: str = ""

    # 船期
    vessel_name: str = ""
    voyage: str = ""
    customs_decl_no: str = ""
    booking_no: str = ""
    pol: str = ""
    pod: str = ""
    place_of_receipt: str = ""
    place_of_delivery: str = ""
    etd: str = ""
    carrier: str = ""

    # 发货人
    shipper_code: str = ""
    shipper_name: str = ""
    shipper_address: str = ""
    shipper_country_code: str = ""
    shipper_phone: str = ""
    shipper_fax: str = ""
    shipper_email: str = ""
    shipper_aeo: str = ""

    # 收货人
    consignee_code: str = ""
    consignee_name: str = ""
    consignee_address: str = ""
    consignee_country_code: str = ""
    consignee_phone: str = ""
    consignee_fax: str = ""
    consignee_email: str = ""
    consignee_aeo: str = ""
    consignee_contact_person: str = ""
    consignee_contact_phone: str = ""

    # 通知人
    notifier_code: str = ""
    notifier_name: str = ""
    notifier_address: str = ""
    notifier_country_code: str = ""
    notifier_phone: str = ""
    notifier_fax: str = ""
    notifier_email: str = ""
    notifier_aeo: str = ""

    # ICS2
    ics2_declaration_type: str = "F15"
    ics2_member_state: str = ""
    mbl_no: str = ""
    hbl_no: str = ""
    mbl_total_weight: float = 0
    hbl_total_weight: float = 0
    imo: str = ""
    transit_countries: str = ""
    has_hbl: bool = True
    mbl_contract_no: str = ""
    hbl_contract_no: str = ""
    mbl_type: str = "MASTER BILL OF LADING"
    hbl_type: str = "HOUSE BILL OF LADING"
    payment_type: str = "PAYMENT IN CASH"
    transport_mode: str = "MARITIME TRANSPORT"
    container_mark: str = "集装箱"

    seller_eori: str = ""
    seller_name: str = ""
    seller_type: str = ""
    seller_country_code: str = ""
    seller_city: str = ""
    seller_street: str = ""
    seller_street_no: str = ""
    seller_postal_code: str = ""
    seller_po_box: str = ""
    seller_phone: str = ""

    buyer_eori: str = ""
    buyer_name: str = ""
    buyer_type: str = ""
    buyer_country_code: str = ""
    buyer_city: str = ""
    buyer_street: str = ""
    buyer_street_no: str = ""
    buyer_postal_code: str = ""
    buyer_po_box: str = ""
    buyer_phone: str = ""

    ics2_declarant_eori: str = ""
    ics2_declarant_name: str = ""
    ics2_declarant_country_code: str = ""
    ics2_declarant_city: str = ""
    ics2_declarant_street: str = ""
    ics2_declarant_street_no: str = ""
    ics2_declarant_postal_code: str = ""
    ics2_declarant_po_box: str = ""
    ics2_declarant_phone: str = ""
    ics2_declarant_email: str = ""

    # 箱货
    containers: list[ContainerItem] = []
    products: list[ProductItem] = []

    # 做箱通知
    loading_date: str = ""
    warehouse_address: str = ""
    warehouse_phone: str = ""
    receiving_company: str = ""
    job_no_ref: str = ""
    container_seal_deadline: str = ""
    fm_department: str = ""
    cc_recipient: str = ""
    transit_port: str = ""
    container_type_qty: str = ""

    # ENS
    ens_contact_person: str = ""
    ens_contact_email: str = ""
    ens_contact_phone: str = ""
    ens_contact_fax: str = ""
    ens_marks: str = "N/M"
    ens_goods_desc: str = ""


class OpsJobUpdate(BaseModel):
    customer_name: Optional[str] = None
    status: Optional[str] = None

    vessel_name: Optional[str] = None
    voyage: Optional[str] = None
    customs_decl_no: Optional[str] = None
    booking_no: Optional[str] = None
    pol: Optional[str] = None
    pod: Optional[str] = None
    place_of_receipt: Optional[str] = None
    place_of_delivery: Optional[str] = None
    etd: Optional[str] = None
    carrier: Optional[str] = None

    shipper_code: Optional[str] = None
    shipper_name: Optional[str] = None
    shipper_address: Optional[str] = None
    shipper_country_code: Optional[str] = None
    shipper_phone: Optional[str] = None
    shipper_fax: Optional[str] = None
    shipper_email: Optional[str] = None
    shipper_aeo: Optional[str] = None

    consignee_code: Optional[str] = None
    consignee_name: Optional[str] = None
    consignee_address: Optional[str] = None
    consignee_country_code: Optional[str] = None
    consignee_phone: Optional[str] = None
    consignee_fax: Optional[str] = None
    consignee_email: Optional[str] = None
    consignee_aeo: Optional[str] = None
    consignee_contact_person: Optional[str] = None
    consignee_contact_phone: Optional[str] = None

    notifier_code: Optional[str] = None
    notifier_name: Optional[str] = None
    notifier_address: Optional[str] = None
    notifier_country_code: Optional[str] = None
    notifier_phone: Optional[str] = None
    notifier_fax: Optional[str] = None
    notifier_email: Optional[str] = None
    notifier_aeo: Optional[str] = None

    ics2_declaration_type: Optional[str] = None
    ics2_member_state: Optional[str] = None
    mbl_no: Optional[str] = None
    hbl_no: Optional[str] = None
    mbl_total_weight: Optional[float] = None
    hbl_total_weight: Optional[float] = None
    imo: Optional[str] = None
    transit_countries: Optional[str] = None
    has_hbl: Optional[bool] = None
    mbl_contract_no: Optional[str] = None
    hbl_contract_no: Optional[str] = None
    mbl_type: Optional[str] = None
    hbl_type: Optional[str] = None
    payment_type: Optional[str] = None
    transport_mode: Optional[str] = None
    container_mark: Optional[str] = None

    seller_eori: Optional[str] = None
    seller_name: Optional[str] = None
    seller_type: Optional[str] = None
    seller_country_code: Optional[str] = None
    seller_city: Optional[str] = None
    seller_street: Optional[str] = None
    seller_street_no: Optional[str] = None
    seller_postal_code: Optional[str] = None
    seller_po_box: Optional[str] = None
    seller_phone: Optional[str] = None

    buyer_eori: Optional[str] = None
    buyer_name: Optional[str] = None
    buyer_type: Optional[str] = None
    buyer_country_code: Optional[str] = None
    buyer_city: Optional[str] = None
    buyer_street: Optional[str] = None
    buyer_street_no: Optional[str] = None
    buyer_postal_code: Optional[str] = None
    buyer_po_box: Optional[str] = None
    buyer_phone: Optional[str] = None

    ics2_declarant_eori: Optional[str] = None
    ics2_declarant_name: Optional[str] = None
    ics2_declarant_country_code: Optional[str] = None
    ics2_declarant_city: Optional[str] = None
    ics2_declarant_street: Optional[str] = None
    ics2_declarant_street_no: Optional[str] = None
    ics2_declarant_postal_code: Optional[str] = None
    ics2_declarant_po_box: Optional[str] = None
    ics2_declarant_phone: Optional[str] = None
    ics2_declarant_email: Optional[str] = None

    containers: Optional[list[ContainerItem]] = None
    products: Optional[list[ProductItem]] = None

    loading_date: Optional[str] = None
    warehouse_address: Optional[str] = None
    warehouse_phone: Optional[str] = None
    receiving_company: Optional[str] = None
    job_no_ref: Optional[str] = None
    container_seal_deadline: Optional[str] = None
    fm_department: Optional[str] = None
    cc_recipient: Optional[str] = None
    transit_port: Optional[str] = None
    container_type_qty: Optional[str] = None

    ens_contact_person: Optional[str] = None
    ens_contact_email: Optional[str] = None
    ens_contact_phone: Optional[str] = None
    ens_contact_fax: Optional[str] = None
    ens_marks: Optional[str] = None
    ens_goods_desc: Optional[str] = None


class OpsJobOut(BaseModel):
    id: int
    job_no: str
    customer_name: str
    status: str

    vessel_name: str
    voyage: str
    customs_decl_no: str
    booking_no: str
    pol: str
    pod: str
    place_of_receipt: str
    place_of_delivery: str
    etd: str
    carrier: str

    shipper_code: str
    shipper_name: str
    shipper_address: str
    shipper_country_code: str
    shipper_phone: str
    shipper_fax: str
    shipper_email: str
    shipper_aeo: str

    consignee_code: str
    consignee_name: str
    consignee_address: str
    consignee_country_code: str
    consignee_phone: str
    consignee_fax: str
    consignee_email: str
    consignee_aeo: str
    consignee_contact_person: str
    consignee_contact_phone: str

    notifier_code: str
    notifier_name: str
    notifier_address: str
    notifier_country_code: str
    notifier_phone: str
    notifier_fax: str
    notifier_email: str
    notifier_aeo: str

    ics2_declaration_type: str
    ics2_member_state: str
    mbl_no: str
    hbl_no: str
    mbl_total_weight: float
    hbl_total_weight: float
    imo: str
    transit_countries: str
    has_hbl: bool
    mbl_contract_no: str
    hbl_contract_no: str
    mbl_type: str
    hbl_type: str
    payment_type: str
    transport_mode: str
    container_mark: str

    seller_eori: str
    seller_name: str
    seller_type: str
    seller_country_code: str
    seller_city: str
    seller_street: str
    seller_street_no: str
    seller_postal_code: str
    seller_po_box: str
    seller_phone: str

    buyer_eori: str
    buyer_name: str
    buyer_type: str
    buyer_country_code: str
    buyer_city: str
    buyer_street: str
    buyer_street_no: str
    buyer_postal_code: str
    buyer_po_box: str
    buyer_phone: str

    ics2_declarant_eori: str
    ics2_declarant_name: str
    ics2_declarant_country_code: str
    ics2_declarant_city: str
    ics2_declarant_street: str
    ics2_declarant_street_no: str
    ics2_declarant_postal_code: str
    ics2_declarant_po_box: str
    ics2_declarant_phone: str
    ics2_declarant_email: str

    containers: list[ContainerItem]
    products: list[ProductItem]

    loading_date: str
    warehouse_address: str
    warehouse_phone: str
    receiving_company: str
    job_no_ref: str
    container_seal_deadline: str
    fm_department: str
    cc_recipient: str
    transit_port: str
    container_type_qty: str

    ens_contact_person: str
    ens_contact_email: str
    ens_contact_phone: str
    ens_contact_fax: str
    ens_marks: str
    ens_goods_desc: str

    source_files: list = []
    generated_files: dict = {}
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

    @field_validator(
        'job_no', 'customer_name', 'vessel_name', 'voyage',
        'customs_decl_no', 'booking_no', 'pol', 'pod',
        'place_of_receipt', 'place_of_delivery', 'etd', 'carrier',
        'shipper_code', 'shipper_name', 'shipper_address',
        'shipper_country_code', 'shipper_phone', 'shipper_fax',
        'shipper_email', 'shipper_aeo', 'consignee_code',
        'consignee_name', 'consignee_address', 'consignee_country_code',
        'consignee_phone', 'consignee_fax', 'consignee_email',
        'consignee_aeo', 'consignee_contact_person', 'consignee_contact_phone',
        'notifier_code', 'notifier_name', 'notifier_address',
        'notifier_country_code', 'notifier_phone', 'notifier_fax',
        'notifier_email', 'notifier_aeo', 'ics2_declaration_type',
        'ics2_member_state', 'mbl_no', 'hbl_no', 'imo', 'transit_countries',
        'mbl_contract_no', 'hbl_contract_no', 'mbl_type', 'hbl_type',
        'payment_type', 'transport_mode', 'container_mark',
        'seller_eori', 'seller_name', 'seller_type', 'seller_country_code',
        'seller_city', 'seller_street', 'seller_street_no',
        'seller_postal_code', 'seller_po_box', 'seller_phone',
        'buyer_eori', 'buyer_name', 'buyer_type', 'buyer_country_code',
        'buyer_city', 'buyer_street', 'buyer_street_no',
        'buyer_postal_code', 'buyer_po_box', 'buyer_phone',
        'ics2_declarant_eori', 'ics2_declarant_name',
        'ics2_declarant_country_code', 'ics2_declarant_city',
        'ics2_declarant_street', 'ics2_declarant_street_no',
        'ics2_declarant_postal_code', 'ics2_declarant_po_box',
        'ics2_declarant_phone', 'ics2_declarant_email',
        'loading_date', 'warehouse_address', 'warehouse_phone',
        'receiving_company', 'job_no_ref', 'container_seal_deadline',
        'fm_department', 'cc_recipient', 'transit_port', 'container_type_qty',
        'ens_contact_person', 'ens_contact_email', 'ens_contact_phone',
        'ens_contact_fax', 'ens_marks', 'ens_goods_desc',
        mode='before',
    )
    @classmethod
    def _none_to_empty(cls, v: object) -> str:
        return v if v is not None else ""


class GenerateRequest(BaseModel):
    job_id: int
    tables: list[str] = ["ens", "ics2", "manifest", "loading_notice"]
