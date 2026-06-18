/**
 * TradeHub API client — thin wrapper around fetch.
 * All routes go to the Vite proxy → backend :8890.
 */

const BASE = '/api'

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const opts: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  }
  if (body && method !== 'GET') {
    opts.body = JSON.stringify(body)
  }
  const res = await fetch(`${BASE}${path}`, opts)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function get<T>(path: string): Promise<T> { return request('GET', path) }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function post<T>(path: string, body?: unknown): Promise<T> { return request('POST', path, body) }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function put<T>(path: string, body?: unknown): Promise<T> { return request('PUT', path, body) }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function del<T>(path: string): Promise<T> { return request('DELETE', path) }

// ── Auto-generated API ──

export const api = {
  // Customers
  customers: {
    list: (search = '', isActive?: boolean) =>
      get(`/customers?search=${encodeURIComponent(search)}${isActive !== undefined ? `&is_active=${isActive}` : ''}`),
    get: (id: number) => get(`/customers/${id}`),
    create: (body: Record<string, unknown>) => post('/customers', body),
    update: (id: number, body: Record<string, unknown>) => put(`/customers/${id}`, body),
    delete: (id: number) => del(`/customers/${id}`),
    contacts: {
      list: (cid: number) => get(`/customers/${cid}/contacts`),
      add: (cid: number, body: Record<string, unknown>) => post(`/customers/${cid}/contacts`, body),
      delete: (cid: number, ctid: number) => del(`/customers/${cid}/contacts/${ctid}`),
    },
  },

  // Suppliers
  suppliers: {
    list: (search = '') => get(`/suppliers?search=${encodeURIComponent(search)}`),
    get: (id: number) => get(`/suppliers/${id}`),
    create: (body: Record<string, unknown>) => post('/suppliers', body),
    update: (id: number, body: Record<string, unknown>) => put(`/suppliers/${id}`, body),
    delete: (id: number) => del(`/suppliers/${id}`),
    quotes: {
      list: (sid: number) => get(`/suppliers/${sid}/quotes`),
      add: (sid: number, body: Record<string, unknown>) => post(`/suppliers/${sid}/quotes`, body),
    },
  },

  // Products
  products: {
    list: (search = '', category = '', brand = '') =>
      get(`/products?search=${encodeURIComponent(search)}&category=${encodeURIComponent(category)}&brand=${encodeURIComponent(brand)}`),
    get: (id: number) => get(`/products/${id}`),
    create: (body: Record<string, unknown>) => post('/products', body),
    update: (id: number, body: Record<string, unknown>) => put(`/products/${id}`, body),
    delete: (id: number) => del(`/products/${id}`),
  },

  // Forwarders
  forwarders: {
    list: (search = '') => get(`/forwarders?search=${encodeURIComponent(search)}`),
    get: (id: number) => get(`/forwarders/${id}`),
    create: (body: Record<string, unknown>) => post('/forwarders', body),
    update: (id: number, body: Record<string, unknown>) => put(`/forwarders/${id}`, body),
    delete: (id: number) => del(`/forwarders/${id}`),
    quotes: {
      list: (fid: number) => get(`/forwarders/${fid}/quotes`),
      add: (fid: number, body: Record<string, unknown>) => post(`/forwarders/${fid}/quotes`, body),
    },
    compare: (origin = '', dest = '', mode = '') =>
      get(`/forwarders/compare?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}&transport_mode=${encodeURIComponent(mode)}`),
  },

  // Quotations
  quotations: {
    list: (status = '', customerId?: number) =>
      get(`/quotations?status=${status}${customerId ? `&customer_id=${customerId}` : ''}`),
    get: (id: number) => get(`/quotations/${id}`),
    create: (body: Record<string, unknown>) => post('/quotations', body),
    update: (id: number, body: Record<string, unknown>) => put(`/quotations/${id}`, body),
    delete: (id: number) => del(`/quotations/${id}`),
    send: (id: number) => post(`/quotations/${id}/send`),
    accept: (id: number) => post(`/quotations/${id}/accept`),
  },

  // Orders
  orders: {
    list: (status = '', customerId?: number, supplierId?: number) =>
      get(`/orders?status=${status}${customerId ? `&customer_id=${customerId}` : ''}${supplierId ? `&supplier_id=${supplierId}` : ''}`),
    get: (id: number) => get(`/orders/${id}`),
    create: (body: Record<string, unknown>) => post('/orders', body),
    update: (id: number, body: Record<string, unknown>) => put(`/orders/${id}`, body),
    delete: (id: number) => del(`/orders/${id}`),
    timeline: {
      add: (oid: number, eventType: string, description: string) =>
        post(`/orders/${oid}/timeline?event_type=${encodeURIComponent(eventType)}&description=${encodeURIComponent(description)}`),
    },
  },

  // Contracts
  contracts: {
    list: (orderId?: number) => get(`/contracts${orderId ? `?order_id=${orderId}` : ''}`),
    get: (id: number) => get(`/contracts/${id}`),
    create: (body: Record<string, unknown>) => post('/contracts', body),
    update: (id: number, body: Record<string, unknown>) => put(`/contracts/${id}`, body),
    delete: (id: number) => del(`/contracts/${id}`),
    sign: (id: number) => post(`/contracts/${id}/sign`),
    pdf: (id: number) => `${BASE}/contracts/${id}/pdf`,
  },

  // Logistics
  logistics: {
    list: (orderId?: number, status = '') =>
      get(`/logistics?${orderId ? `order_id=${orderId}&` : ''}status=${status}`),
    get: (id: number) => get(`/logistics/${id}`),
    create: (body: Record<string, unknown>) => post('/logistics', body),
    update: (id: number, body: Record<string, unknown>) => put(`/logistics/${id}`, body),
    delete: (id: number) => del(`/logistics/${id}`),
  },

  // Tickets
  tickets: {
    list: (status = '', priority = '', assignedTo?: number) =>
      get(`/tickets?status=${status}&priority=${priority}${assignedTo !== undefined ? `&assigned_to=${assignedTo}` : ''}`),
    get: (id: number) => get(`/tickets/${id}`),
    create: (body: Record<string, unknown>) => post('/tickets', body),
    update: (id: number, body: Record<string, unknown>) => put(`/tickets/${id}`, body),
    delete: (id: number) => del(`/tickets/${id}`),
    comments: {
      list: (tid: number) => get(`/tickets/${tid}/comments`),
      add: (tid: number, body: Record<string, unknown>) => post(`/tickets/${tid}/comments`, body),
    },
  },

  // RMA
  rma: {
    list: (status = '', orderId?: number) =>
      get(`/rma?status=${status}${orderId ? `&order_id=${orderId}` : ''}`),
    get: (id: number) => get(`/rma/${id}`),
    create: (body: Record<string, unknown>) => post('/rma', body),
    update: (id: number, body: Record<string, unknown>) => put(`/rma/${id}`, body),
    delete: (id: number) => del(`/rma/${id}`),
  },

  // Technicians
  technicians: {
    list: (isAvailable?: boolean) => get(`/technicians${isAvailable !== undefined ? `?is_available=${isAvailable}` : ''}`),
    get: (id: number) => get(`/technicians/${id}`),
    create: (body: Record<string, unknown>) => post('/technicians', body),
    update: (id: number, body: Record<string, unknown>) => put(`/technicians/${id}`, body),
    delete: (id: number) => del(`/technicians/${id}`),
    schedules: {
      list: (date = '', techId?: number) =>
        get(`/technicians/schedules?date=${date}${techId ? `&technician_id=${techId}` : ''}`),
      create: (body: Record<string, unknown>) => post('/technicians/schedules', body),
      update: (id: number, body: Record<string, unknown>) => put(`/technicians/schedules/${id}`, body),
      delete: (id: number) => del(`/technicians/schedules/${id}`),
    },
  },

  // Knowledge
  knowledge: {
    list: (search = '', category = '') =>
      get(`/knowledge?search=${encodeURIComponent(search)}&category=${encodeURIComponent(category)}`),
    get: (id: number) => get(`/knowledge/${id}`),
    create: (body: Record<string, unknown>) => post('/knowledge', body),
    update: (id: number, body: Record<string, unknown>) => put(`/knowledge/${id}`, body),
    delete: (id: number) => del(`/knowledge/${id}`),
    categories: () => get<string[]>('/knowledge/categories/list'),
  },

  // Finance
  finance: {
    invoices: {
      list: (orderId?: number, status = '') =>
        get(`/finance/invoices?${orderId ? `order_id=${orderId}&` : ''}status=${status}`),
      get: (id: number) => get(`/finance/invoices/${id}`),
      create: (body: Record<string, unknown>) => post('/finance/invoices', body),
      update: (id: number, body: Record<string, unknown>) => put(`/finance/invoices/${id}`, body),
      delete: (id: number) => del(`/finance/invoices/${id}`),
    },
    payments: {
      list: (orderId?: number) => get(`/finance/payments${orderId ? `?order_id=${orderId}` : ''}`),
      create: (body: Record<string, unknown>) => post('/finance/payments', body),
      delete: (id: number) => del(`/finance/payments/${id}`),
    },
    profit: (period = 'all') => get(`/finance/profit?period=${period}`),
  },

  // Dashboard
  dashboard: {
    kpi: () => get('/dashboard/kpi'),
    trend: (months = 6) => get(`/dashboard/trend?months=${months}`),
    orderStatus: () => get('/dashboard/order-status'),
    recent: (limit = 10) => get(`/dashboard/recent?limit=${limit}`),
    certAlerts: (days = 90) => get(`/dashboard/cert-alerts?days=${days}`),
    exhibitionSummary: () => get('/dashboard/exhibition-summary'),
    brandDistribution: () => get('/dashboard/brand-distribution'),
  },

  // Certifications
  certifications: {
    list: (search = '', certType = '', status = '') =>
      get(`/certifications?search=${encodeURIComponent(search)}&cert_type=${encodeURIComponent(certType)}&status=${encodeURIComponent(status)}`),
    get: (id: number) => get(`/certifications/${id}`),
    create: (body: Record<string, unknown>) => post('/certifications', body),
    update: (id: number, body: Record<string, unknown>) => put(`/certifications/${id}`, body),
    delete: (id: number) => del(`/certifications/${id}`),
    expiring: (days = 30) => get(`/certifications/expiring?days=${days}`),
  },

  // Exhibitions
  exhibitions: {
    list: (search = '') => get(`/exhibitions?search=${encodeURIComponent(search)}`),
    get: (id: number) => get(`/exhibitions/${id}`),
    create: (body: Record<string, unknown>) => post('/exhibitions', body),
    update: (id: number, body: Record<string, unknown>) => put(`/exhibitions/${id}`, body),
    delete: (id: number) => del(`/exhibitions/${id}`),
    leads: (eid: number) => get(`/exhibitions/${eid}/leads`),
    roi: () => get('/exhibitions/roi'),
  },

  // Leads
  leads: {
    list: (search = '', source = '', status = '', exhibitionId?: number) =>
      get(`/leads?search=${encodeURIComponent(search)}&source=${encodeURIComponent(source)}&status=${encodeURIComponent(status)}${exhibitionId !== undefined ? `&exhibition_id=${exhibitionId}` : ''}`),
    get: (id: number) => get(`/leads/${id}`),
    create: (body: Record<string, unknown>) => post('/leads', body),
    update: (id: number, body: Record<string, unknown>) => put(`/leads/${id}`, body),
    delete: (id: number) => del(`/leads/${id}`),
  },
}
