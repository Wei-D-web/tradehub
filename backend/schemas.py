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
    quotes: list[SupplierQuoteOut] = []

    class Config:
        from_attributes = True

    @field_validator('country', 'contact_person', 'phone', 'email', 'website',
                     'product_categories', 'brands', 'payment_terms', 'notes',
                     mode='before')
    @classmethod
    def _none_to_empty(cls, v: object) -> str:
        return v if v is not None else ""


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
