import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import { useToast } from '../components/Toast'
import type { Lead, LeadForm, Exhibition } from '../types'
import { LEAD_SOURCES, LEAD_SOURCE_LABELS, LEAD_STATUSES, LEAD_STATUS_LABELS } from '../types'
import { Plus, Search, Edit3, Trash2, Users, RefreshCw, Loader2, Star } from 'lucide-react'

const EMPTY_FORM: LeadForm = {
  exhibition_id: null, company_name: '', contact_name: '', contact_phone: '',
  contact_email: '', position: '', source: 'exhibition', status: 'new',
  interest_level: 3, requirements: '', estimated_value_cny: 0, notes: '',
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  new: { bg: '#f8fafc', color: '#64748b' },
  contacted: { bg: '#eff6ff', color: '#3b82f6' },
  qualified: { bg: '#fefce8', color: '#ca8a04' },
  quoted: { bg: '#fdf2f8', color: '#db2777' },
  won: { bg: '#f0fdf4', color: '#16a34a' },
  lost: { bg: '#fef2f2', color: '#ef4444' },
}

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.new
  return <span className="badge" style={{ background: c.bg, color: c.color }}>{LEAD_STATUS_LABELS[status] || status}</span>
}

export default function LeadsPage() {
  const toast = useToast()
  const [leads, setLeads] = useState<Lead[]>([])
  const [search, setSearch] = useState('')
  const [source, setSource] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Lead | null>(null)
  const [form, setForm] = useState<LeadForm>(EMPTY_FORM)
  const [expos, setExpos] = useState<Exhibition[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api.leads.list(search, source, status) as Lead[]
      setLeads(d)
    } catch {
      toast.error('加载线索列表失败')
    } finally {
      setLoading(false)
    }
  }, [search, source, status, toast])

  useEffect(() => { load() }, [load])

  // Load exhibitions for the dropdown
  useEffect(() => {
    api.exhibitions.list().then(d => setExpos(d as Exhibition[])).catch(() => {})
  }, [showForm])

  const openNew = async () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }
  const openEdit = (l: Lead) => {
    setEditing(l)
    setForm({
      exhibition_id: l.exhibition_id, company_name: l.company_name,
      contact_name: l.contact_name, contact_phone: l.contact_phone,
      contact_email: l.contact_email, position: l.position,
      source: l.source, status: l.status,
      interest_level: l.interest_level, requirements: l.requirements,
      estimated_value_cny: l.estimated_value_cny, notes: l.notes,
    })
    setShowForm(true)
  }

  const save = async () => {
    if (!form.company_name.trim()) return
    setSaving(true)
    try {
      if (editing) {
        await api.leads.update(editing.id, form as unknown as Record<string, unknown>)
        toast.success('线索已更新')
      } else {
        await api.leads.create(form as unknown as Record<string, unknown>)
        toast.success('线索添加成功！')
      }
      setShowForm(false)
      load()
    } catch (e) {
      toast.error((e as Error).message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (l: Lead) => {
    if (!confirm(`确定删除线索「${l.company_name}」吗？`)) return
    try {
      await api.leads.delete(l.id)
      toast.success('已删除')
      load()
    } catch (e) {
      toast.error((e as Error).message || '删除失败')
    }
  }

  const interestStars = (level: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star key={i} className={`w-3 h-3 inline ${i < level ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
    ))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold">线索管理</h2>
          <p className="text-xs text-slate-400 mt-0.5">{leads.length} 条线索</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>
          <Plus className="w-4 h-4" />新增线索
        </button>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="搜索公司/联系人/需求..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="select" value={source} onChange={e => setSource(e.target.value)}>
          <option value="">全部来源</option>
          {LEAD_SOURCES.map(s => <option key={s} value={s}>{LEAD_SOURCE_LABELS[s]}</option>)}
        </select>
        <select className="select" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">全部状态</option>
          {LEAD_STATUSES.map(s => <option key={s} value={s}>{LEAD_STATUS_LABELS[s]}</option>)}
        </select>
        <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr><th>公司名称</th><th>联系人</th><th>来源</th><th>展会</th><th>状态</th><th>兴趣度</th><th>预估金额</th><th>操作</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-16 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />加载中...
              </td></tr>
            ) : leads.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-16">
                <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 mb-3">{search || source || status ? '没有匹配的线索' : '还没有线索记录'}</p>
                {!search && !source && !status && (
                  <button className="btn btn-primary btn-sm" onClick={openNew}>
                    <Plus className="w-4 h-4" />添加第一条线索
                  </button>
                )}
              </td></tr>
            ) : leads.map(l => (
              <tr key={l.id}>
                <td className="font-medium">{l.company_name}</td>
                <td className="text-sm">
                  {l.contact_name || '-'}
                  {l.position ? <span className="text-xs text-slate-400 ml-1">({l.position})</span> : ''}
                </td>
                <td><span className="badge" style={{background: '#f8fafc', color: '#475569'}}>{LEAD_SOURCE_LABELS[l.source] || l.source}</span></td>
                <td className="text-sm text-slate-500">{l.exhibition_name || '-'}</td>
                <td><StatusBadge status={l.status} /></td>
                <td><div className="flex">{interestStars(l.interest_level)}</div></td>
                <td className="text-sm font-medium">{l.estimated_value_cny > 0 ? `¥${l.estimated_value_cny.toLocaleString()}` : '-'}</td>
                <td>
                  <div className="flex gap-1">
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(l)}><Edit3 className="w-3 h-3" /></button>
                    <button className="btn btn-ghost btn-sm text-red-500" onClick={() => remove(l)}><Trash2 className="w-3 h-3" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal max-w-lg" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold mb-4">{editing ? '编辑线索' : '新增线索'}</h3>
            <div className="space-y-3 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">公司名称 <span className="text-red-400">*</span></label>
                <input className="input" placeholder="客户公司全称" value={form.company_name}
                  onChange={e => setForm({ ...form, company_name: e.target.value })} autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">联系人</label>
                  <input className="input" placeholder="姓名" value={form.contact_name}
                    onChange={e => setForm({ ...form, contact_name: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">职位</label>
                  <input className="input" placeholder="采购经理 / 实验室主任" value={form.position}
                    onChange={e => setForm({ ...form, position: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">电话</label>
                  <input className="input" placeholder="手机号" value={form.contact_phone}
                    onChange={e => setForm({ ...form, contact_phone: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">邮箱</label>
                  <input className="input" placeholder="邮箱" value={form.contact_email}
                    onChange={e => setForm({ ...form, contact_email: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">来源</label>
                  <select className="select w-full" value={form.source}
                    onChange={e => setForm({ ...form, source: e.target.value })}>
                    {LEAD_SOURCES.map(s => <option key={s} value={s}>{LEAD_SOURCE_LABELS[s]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">关联展会</label>
                  <select className="select w-full" value={form.exhibition_id || ''}
                    onChange={e => setForm({ ...form, exhibition_id: e.target.value ? parseInt(e.target.value) : null })}>
                    <option value="">无</option>
                    {expos.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">状态</label>
                  <select className="select w-full" value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value })}>
                    {LEAD_STATUSES.map(s => <option key={s} value={s}>{LEAD_STATUS_LABELS[s]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">兴趣度 (1-5)</label>
                  <div className="flex gap-0.5 mt-1">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button key={n} className="p-0.5" onClick={() => setForm({ ...form, interest_level: n })}>
                        <Star className={`w-4 h-4 ${n <= form.interest_level ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">预估金额 (CNY)</label>
                <input type="number" className="input" placeholder="预估成交金额" value={form.estimated_value_cny || ''}
                  onChange={e => setForm({ ...form, estimated_value_cny: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">需求描述</label>
                <textarea className="input" rows={2} placeholder="客户具体需求、预算、决策周期等..."
                  value={form.requirements} onChange={e => setForm({ ...form, requirements: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">备注</label>
                <textarea className="input" rows={2} placeholder="跟进记录、注意事项..."
                  value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <button className="btn btn-ghost" onClick={() => setShowForm(false)}>取消</button>
              <button className="btn btn-primary" onClick={save} disabled={!form.company_name.trim() || saving}>
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" />保存中...</> : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
