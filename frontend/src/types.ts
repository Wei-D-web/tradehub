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
  payment_terms: string
  rating: number
  notes: string
}

// ── Product ──
export interface Product {
  id: number
  name: string
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
