import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import { useToast } from '../components/Toast'
import type { Supplier, SupplierForm, SupplierQuote, OrderSummary } from '../types'
import { PAYMENT_TERMS_OPTIONS, INCOTERMS_OPTIONS, CURRENCY_OPTIONS } from '../types'
import {
  Plus, Search, Edit3, Trash2, Star, Phone, Mail, Globe,
  MapPin, Tag, FileText, ShoppingCart, ChevronRight,
  X, Eye, RefreshCw, Loader2, DollarSign, Clock, Building2,
} from 'lucide-react'

const EMPTY_FORM: SupplierForm = {
  name: '', country: '', contact_person: '', phone: '', email: '',
  website: '', product_categories: '', payment_terms: '', rating: 0, notes: '',
}

export default function SuppliersPage() {
  const toast = useToast()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [form, setForm] = useState<SupplierForm>(EMPTY_FORM)

  // Detail panel
  const [detail, setDetail] = useState<Supplier | null>(null)
  const [detailTab, setDetailTab] = useState<'info' | 'quotes' | 'orders'>('info')
  const [quotes, setQuotes] = useState<SupplierQuote[]>([])
  const [orders, setOrders] = useState<OrderSummary[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  // Quote form
  const [showQuoteForm, setShowQuoteForm] = useState(false)
  const [quoteForm, setQuoteForm] = useState({ product_id: '', price: '', currency: 'USD', moq: '1', lead_time_days: '30', incoterms: 'FOB', valid_until: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api.suppliers.list(search) as Supplier[]
      setSuppliers(d)
    } catch {
      toast.error('加载供应商列表失败')
    } finally {
      setLoading(false)
    }
  }, [search, toast])

  useEffect(() => { load() }, [load])

  // ── CRUD ──
  const openNew = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  const openEdit = (s: Supplier) => {
    setEditing(s)
    setForm({
      name: s.name, country: s.country, contact_person: s.contact_person,
      phone: s.phone, email: s.email, website: s.website,
      product_categories: s.product_categories, payment_terms: s.payment_terms,
      rating: s.rating, notes: s.notes,
    })
    setShowForm(true)
  }

  const save = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      if (editing) {
        await api.suppliers.update(editing.id, form as unknown as Record<string, unknown>)
        toast.success('供应商信息已更新')
        if (detail?.id === editing.id) {
          const updated = await api.suppliers.get(editing.id) as Supplier
          setDetail(updated)
        }
      } else {
        await api.suppliers.create(form as unknown as Record<string, unknown>)
        toast.success('供应商添加成功！')
      }
      setShowForm(false)
      load()
    } catch (e) {
      toast.error((e as Error).message || '保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (s: Supplier) => {
    if (!confirm(`确定删除供应商「${s.name}」吗？`)) return
    try {
      await api.suppliers.delete(s.id)
      toast.success('供应商已删除')
      if (detail?.id === s.id) setDetail(null)
      load()
    } catch (e) {
      toast.error((e as Error).message || '删除失败')
    }
  }

  // ── Detail panel ──
  const openDetail = async (s: Supplier) => {
    setDetail(s)
    setDetailTab('info')
    setDetailLoading(true)
    try {
      const [full, q, od] = await Promise.all([
        api.suppliers.get(s.id) as Promise<Supplier>,
        api.suppliers.quotes.list(s.id) as Promise<SupplierQuote[]>,
        api.orders.list('', undefined, s.id) as Promise<OrderSummary[]>,
      ])
      setDetail(full)
      setQuotes(q)
      setOrders(od)
    } catch {
      toast.error('加载供应商详情失败')
    } finally {
      setDetailLoading(false)
    }
  }

  const addQuote = async () => {
    if (!detail || !quoteForm.price) return
    try {
      await api.suppliers.quotes.add(detail.id, {
        ...quoteForm,
        product_id: quoteForm.product_id ? Number(quoteForm.product_id) : null,
        price: Number(quoteForm.price),
        moq: Number(quoteForm.moq),
        lead_time_days: Number(quoteForm.lead_time_days),
        valid_until: quoteForm.valid_until || null,
      })
      toast.success('报价已添加')
      setShowQuoteForm(false)
      setQuoteForm({ product_id: '', price: '', currency: 'USD', moq: '1', lead_time_days: '30', incoterms: 'FOB', valid_until: '' })
      const q = await api.suppliers.quotes.list(detail.id) as SupplierQuote[]
      setQuotes(q)
    } catch (e) {
      toast.error((e as Error).message || '添加报价失败')
    }
  }

  const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n)
  const formatDate = (s: string) => s?.slice(0, 10)

  const statusLabels: Record<string, string> = {
    inquiry: '询价', quoted: '已报价', ordered: '已下单', shipped: '运输中',
    customs: '报关中', delivered: '已交付', completed: '已完成', cancelled: '已取消',
  }

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      inquiry: 'badge-draft', quoted: 'badge-sent', ordered: 'badge-in_progress',
      shipped: 'badge-in_progress', customs: 'badge-high', delivered: 'badge-delivered',
      completed: 'badge-completed', cancelled: 'badge-cancelled',
    }
    return map[status] || 'badge-draft'
  }

  // ── Render ──
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold">供应商管理</h2>
          <p className="text-xs text-slate-400 mt-0.5">{suppliers.length} 家供应商</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>
          <Plus className="w-4 h-4" />新增供应商
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="搜索供应商名称、联系人..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr><th>供应商</th><th>国家</th><th>联系人</th><th>产品类别</th><th>付款条件</th><th>评分</th><th>操作</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-16 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />加载中...
              </td></tr>
            ) : suppliers.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-16">
                <Building2 className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 mb-3">{search ? '没有匹配的供应商' : '还没有添加供应商'}</p>
                {!search && (
                  <button className="btn btn-primary btn-sm" onClick={openNew}>
                    <Plus className="w-4 h-4" />添加第一家供应商
                  </button>
                )}
              </td></tr>
            ) : (
              suppliers.map(s => (
                <tr key={s.id}>
                  <td>
                    <button className="font-medium text-left hover:text-blue-600 transition-colors" onClick={() => openDetail(s)}>
                      {s.name}
                    </button>
                  </td>
                  <td>{s.country || '-'}</td>
                  <td>{s.contact_person || '-'}</td>
                  <td>{s.product_categories ? <span className="badge badge-sent">{s.product_categories}</span> : '-'}</td>
                  <td className="text-sm">{s.payment_terms || '-'}</td>
                  <td className="text-yellow-500 text-sm">{stars(s.rating)}</td>
                  <td>
                    <div className="flex gap-1">
                      <button className="btn btn-ghost btn-sm" title="查看详情" onClick={() => openDetail(s)}>
                        <Eye className="w-3 h-3" />
                      </button>
                      <button className="btn btn-ghost btn-sm" title="编辑" onClick={() => openEdit(s)}>
                        <Edit3 className="w-3 h-3" />
                      </button>
                      <button className="btn btn-ghost btn-sm text-red-500" title="删除" onClick={() => remove(s)}>
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ══════════════════════════════════════════
          Detail Slide-over Panel
          ══════════════════════════════════════════ */}
      {detail && (
        <div className="slide-overlay" onClick={() => setDetail(null)}>
          <div className="slide-panel" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold">{detail.name}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  {detail.country && <span className="text-xs text-slate-400">{detail.country}</span>}
                  <span className="text-yellow-500 text-sm">{stars(detail.rating)}</span>
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setDetail(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex border-b border-slate-100 px-5">
              {(['info', 'quotes', 'orders'] as const).map(tab => (
                <button key={tab} className={`tab ${detailTab === tab ? 'active' : ''}`} onClick={() => setDetailTab(tab)}>
                  {tab === 'info' ? '基本信息' : tab === 'quotes' ? `报价记录 (${quotes.length})` : `关联订单 (${orders.length})`}
                </button>
              ))}
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              {detailLoading ? (
                <div className="text-center py-12 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />加载详情...
                </div>
              ) : detailTab === 'info' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <InfoItem icon={Building2} label="供应商名称" value={detail.name} />
                    <InfoItem icon={MapPin} label="国家" value={detail.country} />
                    <InfoItem icon={Star} label="联系人" value={detail.contact_person} />
                    <InfoItem icon={Phone} label="电话" value={detail.phone} />
                    <InfoItem icon={Mail} label="邮箱" value={detail.email} />
                    <InfoItem icon={Globe} label="网站" value={detail.website} />
                    <InfoItem icon={Tag} label="产品类别" value={detail.product_categories} />
                    <InfoItem icon={DollarSign} label="付款条件" value={detail.payment_terms} />
                  </div>
                  {detail.notes && (
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-400 mb-1">备注</p>
                      <p className="text-sm text-slate-600 whitespace-pre-wrap">{detail.notes}</p>
                    </div>
                  )}
                  <button className="btn btn-primary btn-sm" onClick={() => { setDetail(null); openEdit(detail) }}>
                    <Edit3 className="w-3 h-3" />编辑供应商
                  </button>
                </div>
              ) : detailTab === 'quotes' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-500">报价记录</p>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowQuoteForm(!showQuoteForm)}>
                      <Plus className="w-3 h-3" />{showQuoteForm ? '取消' : '录入报价'}
                    </button>
                  </div>

                  {showQuoteForm && (
                    <div className="bg-blue-50 rounded-lg p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-slate-500 block mb-0.5">价格 <span className="text-red-400">*</span></label>
                          <input className="input" type="number" step="0.01" placeholder="单价" value={quoteForm.price}
                            onChange={e => setQuoteForm({ ...quoteForm, price: e.target.value })} />
                        </div>
                        <div>
                          <label className="text-xs text-slate-500 block mb-0.5">币种</label>
                          <select className="select w-full" value={quoteForm.currency}
                            onChange={e => setQuoteForm({ ...quoteForm, currency: e.target.value })}>
                            {CURRENCY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-xs text-slate-500 block mb-0.5">MOQ</label>
                          <input className="input" type="number" placeholder="最小起订量" value={quoteForm.moq}
                            onChange={e => setQuoteForm({ ...quoteForm, moq: e.target.value })} />
                        </div>
                        <div>
                          <label className="text-xs text-slate-500 block mb-0.5">交期(天)</label>
                          <input className="input" type="number" placeholder="30" value={quoteForm.lead_time_days}
                            onChange={e => setQuoteForm({ ...quoteForm, lead_time_days: e.target.value })} />
                        </div>
                        <div>
                          <label className="text-xs text-slate-500 block mb-0.5">贸易术语</label>
                          <select className="select w-full" value={quoteForm.incoterms}
                            onChange={e => setQuoteForm({ ...quoteForm, incoterms: e.target.value })}>
                            {INCOTERMS_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 block mb-0.5">有效期至</label>
                        <input className="input" type="date" value={quoteForm.valid_until}
                          onChange={e => setQuoteForm({ ...quoteForm, valid_until: e.target.value })} />
                      </div>
                      <button className="btn btn-primary btn-sm" onClick={addQuote} disabled={!quoteForm.price}>
                        确认录入
                      </button>
                    </div>
                  )}

                  {quotes.length === 0 ? (
                    <p className="text-center py-8 text-slate-400 text-sm">暂无报价记录</p>
                  ) : (
                    quotes.map(q => (
                      <div key={q.id} className="p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-lg font-bold text-blue-700">
                            {q.currency} {q.price?.toLocaleString()}
                          </span>
                          <div className="flex gap-2">
                            {q.is_current && <span className="badge badge-completed text-[10px]">当前</span>}
                            <span className="text-xs text-slate-400">{formatDate(q.quoted_at)}</span>
                          </div>
                        </div>
                        <div className="flex gap-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{q.incoterms || '-'}</span>
                          <span className="flex items-center gap-1"><ShoppingCart className="w-3 h-3" />MOQ: {q.moq}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />交期: {q.lead_time_days}天</span>
                          {q.product_name && <span>品名: {q.product_name}</span>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.length === 0 ? (
                    <p className="text-center py-8 text-slate-400 text-sm">暂无关联订单</p>
                  ) : (
                    orders.map(o => (
                      <div key={o.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                        <div className="flex items-center gap-3">
                          <ShoppingCart className="w-4 h-4 text-slate-400" />
                          <div>
                            <p className="text-sm font-medium">{o.order_no}</p>
                            <p className="text-xs text-slate-400">{formatDate(o.created_at)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`badge ${statusBadge(o.status)}`}>{statusLabels[o.status] || o.status}</span>
                          <span className="text-sm font-medium">¥{o.total_revenue?.toLocaleString() || 0}</span>
                          <ChevronRight className="w-4 h-4 text-slate-300" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          Add/Edit Modal
          ══════════════════════════════════════════ */}
      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold mb-4">{editing ? '编辑供应商' : '新增供应商'}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">供应商名称 <span className="text-red-400">*</span></label>
                <input className="input" placeholder="公司全称" value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })} autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">国家</label>
                  <input className="input" placeholder="如：日本" value={form.country}
                    onChange={e => setForm({ ...form, country: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">联系人</label>
                  <input className="input" placeholder="姓名" value={form.contact_person}
                    onChange={e => setForm({ ...form, contact_person: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">电话</label>
                  <input className="input" placeholder="含区号" value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">邮箱</label>
                  <input className="input" placeholder="email@supplier.com" value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">网站</label>
                <input className="input" placeholder="https://..." value={form.website}
                  onChange={e => setForm({ ...form, website: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">产品类别</label>
                  <input className="input" placeholder="如：电子元器件" value={form.product_categories}
                    onChange={e => setForm({ ...form, product_categories: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">付款条件</label>
                  <select className="select w-full" value={form.payment_terms}
                    onChange={e => setForm({ ...form, payment_terms: e.target.value })}>
                    <option value="">请选择</option>
                    {PAYMENT_TERMS_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">评分</label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(i => (
                    <button key={i} className="text-2xl transition-colors" style={{ color: i <= form.rating ? '#f59e0b' : '#d1d5db' }}
                      onClick={() => setForm({ ...form, rating: i })} type="button">
                      {i <= form.rating ? '★' : '☆'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">备注</label>
                <textarea className="input" rows={2} placeholder="备注信息..."
                  value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <button className="btn btn-ghost" onClick={() => setShowForm(false)}>取消</button>
              <button className="btn btn-primary" onClick={save} disabled={!form.name.trim() || saving}>
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" />保存中...</> : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoItem({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400 flex items-center gap-1 mb-0.5">
        <Icon className="w-3 h-3" />{label}
      </p>
      <p className="text-sm text-slate-700">{value || '-'}</p>
    </div>
  )
}
