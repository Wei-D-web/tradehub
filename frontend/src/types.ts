/**
 * TradeHub shared TypeScript types.
 * Matches backend models.py / schemas.py.
 */

// ── Customer ──
export interface CustomerContact {
  id: number
  customer_id: number
  name: string
  title: string
  phone: string
  email: string
  wechat: string
  is_primary: boolean
  created_at: string
}

export interface Customer {
  id: number
  name: string
  contact_person: string
  phone: string
  email: string
  company_address: string
  industry_tags: string
  source: string
  exhibition_id: number | null
  exhibition_name: string
  notes: string
  is_active: boolean
  created_at: string
  updated_at: string
  order_count?: number
  contacts?: CustomerContact[]
}

export interface CustomerForm {
  name: string
  contact_person: string
  phone: string
  email: string
  company_address: string
  industry_tags: string
  source: string
  notes: string
}

// ── Supplier ──
export interface SupplierQuote {
  id: number
  supplier_id: number
  product_id: number | null
  price: number
  currency: string
  moq: number
  lead_time_days: number
  incoterms: string
  quoted_at: string
  valid_until: string | null
  is_current: boolean
  product_name?: string
}

export interface Supplier {
  id: number
  name: string
  country: string
  contact_person: string
  phone: string
  email: string
  website: string
  product_categories: string
  brands: string
  agency_start: string | null
  agency_end: string | null
  payment_terms: string
  rating: number
  notes: string
  is_active: boolean
  created_at: string
  updated_at?: string
}

export interface SupplierForm {
  name: string
  country: string
  contact_person: string
  phone: string
  email: string
  website: string
  product_categories: string
  brands: string
  agency_start: string
  agency_end: string
  payment_terms: string
  rating: number
  notes: string
}

// ── Product ──
export interface Product {
  id: number
  name: string
  brand: string
  origin_country: string
  category: string
  sku: string
  unit: string
  hs_code: string
  description: string
  specifications: string
  image_url: string
  created_at: string
}

export interface ProductForm {
  name: string
  brand: string
  origin_country: string
  category: string
  sku: string
  unit: string
  hs_code: string
  description: string
  specifications: string
}

// ── Forwarder ──
export interface FreightQuote {
  id: number
  forwarder_id: number
  origin: string
  destination: string
  transport_mode: string
  price: number
  currency: string
  transit_days: number
  incoterms: string
  quoted_at: string
  valid_until: string | null
  is_selected: boolean
}

export interface Forwarder {
  id: number
  name: string
  contact_person: string
  phone: string
  email: string
  transport_modes: string
  rating: number
  notes: string
  is_active: boolean
  created_at: string
}

export interface ForwarderForm {
  name: string
  contact_person: string
  phone: string
  email: string
  transport_modes: string
  rating: number
  notes: string
}

// ── Order (for detail views) ──
export interface OrderSummary {
  id: number
  order_no: string
  status: string
  total_revenue: number
  net_profit: number
  estimated_delivery: string | null
  created_at: string
  customer_name?: string
  supplier_name?: string
}

// ── Common ──
export const SOURCE_OPTIONS = ['展会', '老客户推荐', '网络推广', '电话营销', '行业协会', '其他']
export const PAYMENT_TERMS_OPTIONS = ['T/T 30%预付', 'T/T 50%预付', 'T/T 100%预付', 'L/C 30天', 'L/C 60天', 'L/C 90天', 'D/P', 'D/A', '月结30天', '月结60天']
export const INCOTERMS_OPTIONS = ['FOB', 'CIF', 'CFR', 'EXW', 'CIP', 'DAP', 'DDP']
export const CURRENCY_OPTIONS = ['CNY', 'USD', 'EUR', 'JPY', 'KRW', 'HKD']
export const TRANSPORT_MODES = ['sea', 'air', 'rail', 'truck']

// ── Certification ──
export const CERT_TYPES = ['CCC', '计量器具型式批准', 'CE', 'ISO', '防爆认证', '其他']
export const CERT_STATUS_OPTIONS = ['valid', 'expiring_soon', 'expired']

export interface Certification {
  id: number
  product_id: number | null
  product_name: string
  brand: string
  model: string
  cert_type: string
  cert_number: string
  issued_date: string | null
  expiry_date: string | null
  issuing_body: string
  status: string
  notes: string
  attachment_url: string
  created_at: string
  updated_at: string
}

export interface CertificationForm {
  product_id: number | null
  product_name: string
  brand: string
  model: string
  cert_type: string
  cert_number: string
  issued_date: string
  expiry_date: string
  issuing_body: string
  notes: string
  attachment_url: string
}

export interface CertAlerts {
  total: number
  expired: number
  expiring_30: number
  expiring_60: number
  expiring_90: number
  recent_items: Array<{
    id: number
    product_name: string
    brand: string
    cert_type: string
    cert_number: string
    expiry_date: string
    days_left: number
    status: string
  }>
}

// ── Exhibition ──
export interface Exhibition {
  id: number
  name: string
  date_start: string | null
  date_end: string | null
  location: string
  city: string
  booth_number: string
  cost_cny: number
  notes: string
  lead_count: number
  won_count: number
  created_at: string
  updated_at: string
}

export interface ExhibitionForm {
  name: string
  date_start: string
  date_end: string
  location: string
  city: string
  booth_number: string
  cost_cny: number
  notes: string
}

export interface ExhibitionROI {
  total_exhibitions: number
  total_cost: number
  total_leads: number
  exhibition_leads: number
  won_leads: number
  quoted_leads: number
  conversion_rate: string
  won_value_cny: number
  cost_per_lead_cny: number
}

// ── Lead ──
export const LEAD_SOURCES = ['exhibition', 'referral', 'website', 'cold_call', 'association', 'other']
export const LEAD_SOURCE_LABELS: Record<string, string> = {
  exhibition: '展会', referral: '老客户推荐', website: '网站',
  cold_call: '电话开发', association: '行业协会', other: '其他',
}
export const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'quoted', 'won', 'lost']
export const LEAD_STATUS_LABELS: Record<string, string> = {
  new: '新线索', contacted: '已联系', qualified: '已确认', quoted: '已报价', won: '赢单', lost: '输单',
}

export interface Lead {
  id: number
  exhibition_id: number | null
  exhibition_name: string
  company_name: string
  contact_name: string
  contact_phone: string
  contact_email: string
  position: string
  source: string
  status: string
  interest_level: number
  requirements: string
  estimated_value_cny: number
  notes: string
  created_at: string
  updated_at: string
}

export interface LeadForm {
  exhibition_id: number | null
  company_name: string
  contact_name: string
  contact_phone: string
  contact_email: string
  position: string
  source: string
  status: string
  interest_level: number
  requirements: string
  estimated_value_cny: number
  notes: string
}

// ── Brand ──
export interface BrandCount {
  brand: string
  count: number
}
