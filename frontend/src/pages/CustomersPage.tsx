import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import { useToast } from '../components/Toast'
import type { Customer, CustomerForm, CustomerContact, OrderSummary } from '../types'
import { SOURCE_OPTIONS } from '../types'
import {
  Plus, Search, Edit3, Trash2, Phone, Mail, Building, MapPin,
  X, UserPlus, Star, Eye, ChevronRight, RefreshCw, Users,
  ShoppingCart, FileText, Tag, MessageSquare, Loader2,
} from 'lucide-react'

const EMPTY_FORM: CustomerForm = {
  name: '', contact_person: '', phone: '', email: '',
  company_address: '', industry_tags: '', source: '', notes: '',
}

export default function CustomersPage() {
  const toast = useToast()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [form, setForm] = useState<CustomerForm>(EMPTY_FORM)

  // Detail panel
  const [detail, setDetail] = useState<Customer | null>(null)
  const [detailTab, setDetailTab] = useState<'info' | 'contacts' | 'orders'>('info')
  const [contacts, setContacts] = useState<CustomerContact[]>([])
  const [orders, setOrders] = useState<OrderSummary[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  // Contacts form in detail panel
  const [showContactForm, setShowContactForm] = useState(false)
  const [contactForm, setContactForm] = useState({ name: '', title: '', phone: '', email: '', wechat: '', is_primary: false })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api.customers.list(search) as Customer[]
      setCustomers(d)
    } catch {
      toast.error('加载客户列表失败')
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

  const openEdit = (c: Customer) => {
    setEditing(c)
    setForm({
      name: c.name, contact_person: c.contact_person, phone: c.phone,
      email: c.email, company_address: c.company_address,
      industry_tags: c.industry_tags, source: c.source, notes: c.notes,
    })
    setShowForm(true)
  }

  const save = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      if (editing) {
        await api.customers.update(editing.id, form as unknown as Record<string, unknown>)
        toast.success('客户信息已更新')
        // Refresh detail if open
        if (detail?.id === editing.id) {
          const updated = await api.customers.get(editing.id) as Customer
          setDetail(updated)
        }
      } else {
        await api.customers.create(form as unknown as Record<string, unknown>)
        toast.success('客户添加成功！')
      }
      setShowForm(false)
      load()
    } catch (e) {
      toast.error((e as Error).message || '保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (c: Customer) => {
    if (!confirm(`确定删除客户「${c.name}」吗？\n\n如有订单数据，客户将被保留但标记为失效。`)) return
    try {
      await api.customers.delete(c.id)
      toast.success('客户已删除')
      if (detail?.id === c.id) setDetail(null)
      load()
    } catch (e) {
      toast.error((e as Error).message || '删除失败')
    }
  }

  // ── Detail panel ──
  const openDetail = async (c: Customer) => {
    setDetail(c)
    setDetailTab('info')
    setDetailLoading(true)
    try {
      const [full, ct, od] = await Promise.all([
        api.customers.get(c.id) as Promise<Customer>,
        api.customers.contacts.list(c.id) as Promise<CustomerContact[]>,
        api.orders.list('', c.id) as Promise<OrderSummary[]>,
      ])
      setDetail(full)
      setContacts(ct)
      setOrders(od)
    } catch {
      toast.error('加载客户详情失败')
    } finally {
      setDetailLoading(false)
    }
  }

  const addContact = async () => {
    if (!detail || !contactForm.name.trim()) return
    try {
      await api.customers.contacts.add(detail.id, contactForm as Record<string, unknown>)
      toast.success('联系人已添加')
      setShowContactForm(false)
      setContactForm({ name: '', title: '', phone: '', email: '', wechat: '', is_primary: false })
      const ct = await api.customers.contacts.list(detail.id) as CustomerContact[]
      setContacts(ct)
    } catch (e) {
      toast.error((e as Error).message || '添加联系人失败')
    }
  }

  const deleteContact = async (ctId: number) => {
    if (!detail || !confirm('确定删除该联系人？')) return
    try {
      await api.customers.contacts.delete(detail.id, ctId)
      toast.success('联系人已删除')
      setContacts(prev => prev.filter(x => x.id !== ctId))
    } catch (e) {
      toast.error((e as Error).message || '删除失败')
    }
  }

  const formatDate = (s: string) => s?.slice(0, 10)

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      inquiry: 'badge-draft', quoted: 'badge-sent', ordered: 'badge-in_progress',
      shipped: 'badge-in_progress', customs: 'badge-high', delivered: 'badge-delivered',
      completed: 'badge-completed', cancelled: 'badge-cancelled',
    }
    return map[status] || 'badge-draft'
  }

  const statusLabels: Record<string, string> = {
    inquiry: '询价', quoted: '已报价', ordered: '已下单', shipped: '运输中',
    customs: '报关中', delivered: '已交付', completed: '已完成', cancelled: '已取消',
  }

  // ── Render ──
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold">客户管理</h2>
          <p className="text-xs text-slate-400 mt-0.5">{customers.length} 位客户</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>
          <Plus className="w-4 h-4" />新增客户
        </button>
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="搜索客户名称、联系人、电话..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>客户名称</th><th>联系人</th><th>电话</th><th>邮箱</th><th>行业</th><th>订单数</th><th>操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-16 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />加载中...
              </td></tr>
            ) : customers.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-16">
                <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 mb-3">{search ? '没有匹配的客户' : '还没有添加客户'}</p>
                {!search && (
                  <button className="btn btn-primary btn-sm" onClick={openNew}>
                    <Plus className="w-4 h-4" />添加第一位客户
                  </button>
                )}
              </td></tr>
            ) : (
              customers.map(c => (
                <tr key={c.id}>
                  <td>
                    <button className="font-medium text-left hover:text-blue-600 transition-colors" onClick={() => openDetail(c)}>
                      {c.name}
                    </button>
                  </td>
                  <td>{c.contact_person || '-'}</td>
                  <td className="text-sm">{c.phone || '-'}</td>
                  <td className="text-sm text-slate-500 max-w-[160px] truncate">{c.email || '-'}</td>
                  <td>{c.industry_tags ? <span className="badge badge-sent">{c.industry_tags}</span> : '-'}</td>
                  <td className="text-center">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${(c.order_count || 0) > 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>
                      {c.order_count || 0}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <button className="btn btn-ghost btn-sm" title="查看详情" onClick={() => openDetail(c)}>
                        <Eye className="w-3 h-3" />
                      </button>
                      <button className="btn btn-ghost btn-sm" title="编辑" onClick={() => openEdit(c)}>
                        <Edit3 className="w-3 h-3" />
                      </button>
                      <button className="btn btn-ghost btn-sm text-red-500" title="删除" onClick={() => remove(c)}>
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
            {/* Panel header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold">{detail.name}</h3>
                <p className="text-xs text-slate-400 mt-0.5">客户详情</p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setDetail(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-100 px-5">
              {(['info', 'contacts', 'orders'] as const).map(tab => (
                <button
                  key={tab}
                  className={`tab ${detailTab === tab ? 'active' : ''}`}
                  onClick={() => setDetailTab(tab)}
                >
                  {tab === 'info' ? '基本信息' : tab === 'contacts' ? `联系人 (${contacts.length})` : `订单 (${orders.length})`}
                </button>
              ))}
            </div>

            {/* Panel body */}
            <div className="p-5 overflow-y-auto flex-1">
              {detailLoading ? (
                <div className="text-center py-12 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />加载详情...
                </div>
              ) : detailTab === 'info' ? (
                /* ── Info Tab ── */
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <InfoItem icon={Building} label="公司名称" value={detail.name} />
                    <InfoItem icon={UserPlus} label="联系人" value={detail.contact_person} />
                    <InfoItem icon={Phone} label="电话" value={detail.phone} />
                    <InfoItem icon={Mail} label="邮箱" value={detail.email} />
                    <InfoItem icon={MapPin} label="地址" value={detail.company_address} span />
                    <InfoItem icon={Tag} label="行业" value={detail.industry_tags} />
                    <InfoItem icon={Star} label="来源" value={detail.source} />
                  </div>
                  {detail.notes && (
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />备注
                      </p>
                      <p className="text-sm text-slate-600 whitespace-pre-wrap">{detail.notes}</p>
                    </div>
                  )}
                  <div className="text-xs text-slate-400 flex gap-4">
                    <span>创建于 {formatDate(detail.created_at)}</span>
                    <span>更新于 {formatDate(detail.updated_at)}</span>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={() => { setDetail(null); openEdit(detail) }}>
                    <Edit3 className="w-3 h-3" />编辑客户
                  </button>
                </div>
              ) : detailTab === 'contacts' ? (
                /* ── Contacts Tab ── */
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-500">联系人列表</p>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowContactForm(!showContactForm)}>
                      <Plus className="w-3 h-3" />{showContactForm ? '取消' : '添加联系人'}
                    </button>
                  </div>

                  {showContactForm && (
                    <div className="bg-blue-50 rounded-lg p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <input className="input" placeholder="姓名 *" value={contactForm.name}
                          onChange={e => setContactForm({ ...contactForm, name: e.target.value })} />
                        <input className="input" placeholder="职位" value={contactForm.title}
                          onChange={e => setContactForm({ ...contactForm, title: e.target.value })} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input className="input" placeholder="电话" value={contactForm.phone}
                          onChange={e => setContactForm({ ...contactForm, phone: e.target.value })} />
                        <input className="input" placeholder="邮箱" value={contactForm.email}
                          onChange={e => setContactForm({ ...contactForm, email: e.target.value })} />
                      </div>
                      <div className="flex items-center gap-4">
                        <input className="input flex-1" placeholder="微信" value={contactForm.wechat}
                          onChange={e => setContactForm({ ...contactForm, wechat: e.target.value })} />
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input type="checkbox" checked={contactForm.is_primary}
                            onChange={e => setContactForm({ ...contactForm, is_primary: e.target.checked })} />
                          主要联系人
                        </label>
                      </div>
                      <button className="btn btn-primary btn-sm" onClick={addContact} disabled={!contactForm.name.trim()}>
                        确认添加
                      </button>
                    </div>
                  )}

                  {contacts.length === 0 ? (
                    <p className="text-center py-8 text-slate-400 text-sm">暂无联系人</p>
                  ) : (
                    contacts.map(ct => (
                      <div key={ct.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{ct.name}</span>
                            {ct.title && <span className="text-xs text-slate-400">{ct.title}</span>}
                            {ct.is_primary && <span className="badge badge-completed text-[10px]">主要</span>}
                          </div>
                          <div className="flex gap-3 mt-1 text-xs text-slate-500">
                            {ct.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{ct.phone}</span>}
                            {ct.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{ct.email}</span>}
                            {ct.wechat && <span>微信: {ct.wechat}</span>}
                          </div>
                        </div>
                        <button className="btn btn-ghost btn-sm text-red-500" onClick={() => deleteContact(ct.id)}>
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                /* ── Orders Tab ── */
                <div className="space-y-3">
                  {orders.length === 0 ? (
                    <p className="text-center py-8 text-slate-400 text-sm">暂无订单</p>
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
            <h3 className="font-bold mb-4">{editing ? '编辑客户' : '新增客户'}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">客户名称 <span className="text-red-400">*</span></label>
                <input className="input" placeholder="公司全称" value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })} autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">联系人</label>
                  <input className="input" placeholder="姓名" value={form.contact_person}
                    onChange={e => setForm({ ...form, contact_person: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">电话</label>
                  <input className="input" placeholder="手机/座机" value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">邮箱</label>
                <input className="input" placeholder="email@company.com" value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">公司地址</label>
                <input className="input" placeholder="详细地址" value={form.company_address}
                  onChange={e => setForm({ ...form, company_address: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">行业标签</label>
                  <input className="input" placeholder="如：电子元器件" value={form.industry_tags}
                    onChange={e => setForm({ ...form, industry_tags: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">客户来源</label>
                  <select className="select w-full" value={form.source}
                    onChange={e => setForm({ ...form, source: e.target.value })}>
                    <option value="">请选择</option>
                    {SOURCE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">备注</label>
                <textarea className="input" rows={3} placeholder="备注信息..."
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

/** Info field for the detail panel */
function InfoItem({ icon: Icon, label, value, span }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; span?: boolean }) {
  return (
    <div className={span ? 'col-span-2' : ''}>
      <p className="text-xs text-slate-400 flex items-center gap-1 mb-0.5">
        <Icon className="w-3 h-3" />{label}
      </p>
      <p className="text-sm text-slate-700">{value || '-'}</p>
    </div>
  )
}
