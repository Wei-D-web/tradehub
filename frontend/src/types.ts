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
  updated_at: string
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

// ── Pricing Intelligence ──

export interface PricingInsight {
  customer_id: number
  customer_name: string
  industry_tags: string
  price_tolerance_score: number | null
  price_tier: string   // "premium" | "standard" | "value" | "unknown"
  price_ratio: number
  sample_size: number
  avg_margin: number
  total_quotes: number
  total_orders: number
}

export interface ProductComparison {
  product_id: number
  product_name: string
  customer_price: number
  market_avg_price: number
  ratio: number
  quantity: number
  quotation_id: number
  quotation_title: string
  quotation_date: string | null
}

export interface CustomerPricingDetail extends PricingInsight {
  product_comparisons: ProductComparison[]
}

export interface PricingTierSummary {
  [customer_id: string]: {
    tier: string
    score: number | null
  }
}

export const TIER_CONFIG: Record<string, { label: string; badgeClass: string; dotClass: string }> = {
  premium:  { label: '高溢价', badgeClass: 'bg-green-100 text-green-700 border border-green-200', dotClass: 'bg-green-500' },
  standard: { label: '中等',   badgeClass: 'bg-yellow-100 text-yellow-700 border border-yellow-200', dotClass: 'bg-yellow-500' },
  value:    { label: '低溢价', badgeClass: 'bg-orange-100 text-orange-700 border border-orange-200', dotClass: 'bg-orange-500' },
  unknown:  { label: '未分析', badgeClass: 'bg-slate-100 text-slate-400 border border-slate-200', dotClass: 'bg-slate-300' },
}

// ── Customs Operations (截关工具) ──

export interface ContainerItem {
  container_no: string
  seal_no: string
  container_type: string
  is_soc: string
  status: string
}

export interface ProductItem {
  seq: number
  description: string
  hs_code: string
  weight: number
  packages: number
  pkg_unit: string
  marks: string
  undg: string
  cus_code: string
}

export interface OpsJob {
  id: number
  job_no: string
  customer_name: string
  status: string

  vessel_name: string
  voyage: string
  customs_decl_no: string
  booking_no: string
  pol: string
  pod: string
  place_of_receipt: string
  place_of_delivery: string
  etd: string
  carrier: string

  shipper_code: string
  shipper_name: string
  shipper_address: string
  shipper_country_code: string
  shipper_phone: string
  shipper_fax: string
  shipper_email: string
  shipper_aeo: string

  consignee_code: string
  consignee_name: string
  consignee_address: string
  consignee_country_code: string
  consignee_phone: string
  consignee_fax: string
  consignee_email: string
  consignee_aeo: string
  consignee_contact_person: string
  consignee_contact_phone: string

  notifier_code: string
  notifier_name: string
  notifier_address: string
  notifier_country_code: string
  notifier_phone: string
  notifier_fax: string
  notifier_email: string
  notifier_aeo: string

  ics2_declaration_type: string
  ics2_member_state: string
  mbl_no: string
  hbl_no: string
  mbl_total_weight: number
  hbl_total_weight: number
  imo: string
  transit_countries: string
  has_hbl: boolean
  mbl_contract_no: string
  hbl_contract_no: string
  mbl_type: string
  hbl_type: string
  payment_type: string
  transport_mode: string
  container_mark: string

  seller_eori: string
  seller_name: string
  seller_type: string
  seller_country_code: string
  seller_city: string
  seller_street: string
  seller_street_no: string
  seller_postal_code: string
  seller_po_box: string
  seller_phone: string

  buyer_eori: string
  buyer_name: string
  buyer_type: string
  buyer_country_code: string
  buyer_city: string
  buyer_street: string
  buyer_street_no: string
  buyer_postal_code: string
  buyer_po_box: string
  buyer_phone: string

  ics2_declarant_eori: string
  ics2_declarant_name: string
  ics2_declarant_country_code: string
  ics2_declarant_city: string
  ics2_declarant_street: string
  ics2_declarant_street_no: string
  ics2_declarant_postal_code: string
  ics2_declarant_po_box: string
  ics2_declarant_phone: string
  ics2_declarant_email: string

  containers: ContainerItem[]
  products: ProductItem[]

  loading_date: string
  warehouse_address: string
  warehouse_phone: string
  receiving_company: string
  job_no_ref: string
  container_seal_deadline: string
  fm_department: string
  cc_recipient: string
  transit_port: string
  container_type_qty: string

  ens_contact_person: string
  ens_contact_email: string
  ens_contact_phone: string
  ens_contact_fax: string
  ens_marks: string
  ens_goods_desc: string

  source_files: Array<{filename: string; size: number; path: string}>
  generated_files: Record<string, string>
  created_at: string
  updated_at: string | null
}

export interface OpsJobForm {
  customer_name: string

  vessel_name: string
  voyage: string
  customs_decl_no: string
  booking_no: string
  pol: string
  pod: string
  place_of_receipt: string
  place_of_delivery: string
  etd: string
  carrier: string

  shipper_code: string
  shipper_name: string
  shipper_address: string
  shipper_country_code: string
  shipper_phone: string
  shipper_fax: string
  shipper_email: string
  shipper_aeo: string

  consignee_code: string
  consignee_name: string
  consignee_address: string
  consignee_country_code: string
  consignee_phone: string
  consignee_fax: string
  consignee_email: string
  consignee_aeo: string
  consignee_contact_person: string
  consignee_contact_phone: string

  notifier_code: string
  notifier_name: string
  notifier_address: string
  notifier_country_code: string
  notifier_phone: string
  notifier_fax: string
  notifier_email: string
  notifier_aeo: string

  ics2_declaration_type: string
  ics2_member_state: string
  mbl_no: string
  hbl_no: string
  mbl_total_weight: number
  hbl_total_weight: number
  imo: string
  transit_countries: string
  has_hbl: boolean
  mbl_contract_no: string
  hbl_contract_no: string
  mbl_type: string
  hbl_type: string
  payment_type: string
  transport_mode: string
  container_mark: string

  seller_eori: string
  seller_name: string
  seller_type: string
  seller_country_code: string
  seller_city: string
  seller_street: string
  seller_street_no: string
  seller_postal_code: string
  seller_po_box: string
  seller_phone: string

  buyer_eori: string
  buyer_name: string
  buyer_type: string
  buyer_country_code: string
  buyer_city: string
  buyer_street: string
  buyer_street_no: string
  buyer_postal_code: string
  buyer_po_box: string
  buyer_phone: string

  ics2_declarant_eori: string
  ics2_declarant_name: string
  ics2_declarant_country_code: string
  ics2_declarant_city: string
  ics2_declarant_street: string
  ics2_declarant_street_no: string
  ics2_declarant_postal_code: string
  ics2_declarant_po_box: string
  ics2_declarant_phone: string
  ics2_declarant_email: string

  containers: ContainerItem[]
  products: ProductItem[]

  loading_date: string
  warehouse_address: string
  warehouse_phone: string
  receiving_company: string
  job_no_ref: string
  container_seal_deadline: string
  fm_department: string
  cc_recipient: string
  transit_port: string
  container_type_qty: string

  ens_contact_person: string
  ens_contact_email: string
  ens_contact_phone: string
  ens_contact_fax: string
  ens_marks: string
  ens_goods_desc: string
}

export const TABLE_LABELS: Record<string, string> = {
  ens: 'ENS/VGM申报表',
  ics2: 'ICS2舱单数据表',
  multi_product: '多品名表',
  manifest: '舱单表',
  loading_notice: '做箱通知',
}

export const JOB_STATUS_LABELS: Record<string, string> = {
  draft: '草稿',
  generated: '已生成',
  sent: '已发送',
}
