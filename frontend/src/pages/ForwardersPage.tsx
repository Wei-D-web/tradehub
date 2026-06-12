import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import { useToast } from '../components/Toast'
import type { Forwarder, ForwarderForm } from '../types'
import { TRANSPORT_MODES, INCOTERMS_OPTIONS } from '../types'
import { Plus, Search, Edit3, Trash2, Star, Truck, GitCompare, RefreshCw, Loader2, X } from 'lucide-react'

const EMPTY_FORM: ForwarderForm = {
  name: '', contact_person: '', phone: '', email: '', transport_modes: '', rating: 0, notes: '',
}

const MODE_LABELS: Record<string, string> = { sea: '海运', air: '空运', rail: '铁路', truck: '卡车' }

export default function ForwardersPage() {
  const toast = useToast()
  const [forwarders, setForwarders] = useState<Forwarder[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Forwarder | null>(null)
  const [form, setForm] = useState<ForwarderForm>(EMPTY_FORM)

  // Compare
  const [showCompare, setShowCompare] = useState(false)
  const [compareForm, setCompareForm] = useState({ origin: '', destination: '', transport_mode: '' })
  const [compareResults, setCompareResults] = useState<Array<Record<string, unknown>>>([])
  const [comparing, setComparing] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api.forwarders.list(search) as Forwarder[]
      setForwarders(d)
    } catch {
      toast.error('加载货代列表失败')
    } finally {
      setLoading(false)
    }
  }, [search, toast])

  useEffect(() => { load() }, [load])

  const openNew = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  const openEdit = (f: Forwarder) => {
    setEditing(f)
    setForm({
      name: f.name, contact_person: f.contact_person, phone: f.phone,
      email: f.email, transport_modes: f.transport_modes,
      rating: f.rating, notes: f.notes,
    })
    setShowForm(true)
  }

  const save = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      if (editing) {
        await api.forwarders.update(editing.id, form as unknown as Record<string, unknown>)
        toast.success('货代信息已更新')
      } else {
        await api.forwarders.create(form as unknown as Record<string, unknown>)
        toast.success('货代添加成功！')
      }
      setShowForm(false)
      load()
    } catch (e) {
      toast.error((e as Error).message || '保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (f: Forwarder) => {
    if (!confirm(`确定删除货代「${f.name}」吗？`)) return
    try {
      await api.forwarders.delete(f.id)
      toast.success('货代已删除')
      load()
    } catch (e) {
      toast.error((e as Error).message || '删除失败')
    }
  }

  const doCompare = async () => {
    if (!compareForm.origin || !compareForm.destination) {
      toast.warning('请输入起运地和目的地')
      return
    }
    setComparing(true)
    try {
      const r = await api.forwarders.compare(compareForm.origin, compareForm.destination, compareForm.transport_mode)
      setCompareResults(r as Array<Record<string, unknown>>)
      if ((r as Array<unknown>).length === 0) {
        toast.warning('暂无匹配的货代报价')
      }
    } catch (e) {
      toast.error((e as Error).message || '比价查询失败')
    } finally {
      setComparing(false)
    }
  }

  const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold">货代管理</h2>
          <p className="text-xs text-slate-400 mt-0.5">{forwarders.length} 家货代</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost" onClick={() => setShowCompare(true)}>
            <GitCompare className="w-4 h-4" />询价比价
          </button>
          <button className="btn btn-primary" onClick={openNew}>
            <Plus className="w-4 h-4" />新增货代
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="搜索货代名称、联系人..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr><th>货代名称</th><th>联系人</th><th>电话</th><th>运输方式</th><th>评分</th><th>操作</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-16 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />加载中...
              </td></tr>
            ) : forwarders.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-16">
                <Truck className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 mb-3">{search ? '没有匹配的货代' : '还没有添加货代'}</p>
                {!search && (
                  <button className="btn btn-primary btn-sm" onClick={openNew}>
                    <Plus className="w-4 h-4" />添加第一家货代
                  </button>
                )}
              </td></tr>
            ) : (
              forwarders.map(f => (
                <tr key={f.id}>
                  <td className="font-medium">{f.name}</td>
                  <td>{f.contact_person || '-'}</td>
                  <td className="text-sm">{f.phone || '-'}</td>
                  <td>
                    <div className="flex gap-1 flex-wrap">
                      {f.transport_modes ? f.transport_modes.split(',').map(m => (
                        <span key={m} className="badge badge-sent text-[10px]">{MODE_LABELS[m.trim()] || m}</span>
                      )) : '-'}
                    </div>
                  </td>
                  <td className="text-yellow-500 text-sm">{stars(f.rating)}</td>
                  <td>
                    <div className="flex gap-1">
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(f)}><Edit3 className="w-3 h-3" /></button>
                      <button className="btn btn-ghost btn-sm text-red-500" onClick={() => remove(f)}><Trash2 className="w-3 h-3" /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ══════════════════════════════════════════
          Compare Modal
          ══════════════════════════════════════════ */}
      {showCompare && (
        <div className="modal-backdrop" onClick={() => setShowCompare(false)}>
          <div className="modal max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">货代比价</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowCompare(false)}><X className="w-4 h-4" /></button>
            </div>
            <div className="flex gap-2 mb-4">
              <input className="input" placeholder="起运地 *" value={compareForm.origin}
                onChange={e => setCompareForm({ ...compareForm, origin: e.target.value })} />
              <input className="input" placeholder="目的地 *" value={compareForm.destination}
                onChange={e => setCompareForm({ ...compareForm, destination: e.target.value })} />
              <select className="select" value={compareForm.transport_mode}
                onChange={e => setCompareForm({ ...compareForm, transport_mode: e.target.value })}>
                <option value="">全部方式</option>
                {TRANSPORT_MODES.map(m => <option key={m} value={m}>{MODE_LABELS[m]}</option>)}
              </select>
            </div>
            <button className="btn btn-primary btn-sm mb-4" onClick={doCompare} disabled={comparing}>
              {comparing ? <><Loader2 className="w-4 h-4 animate-spin" />查询中...</> : '搜索比价'}
            </button>

            {compareResults.length > 0 && (
              <table className="table">
                <thead><tr><th>货代</th><th>起运</th><th>目的</th><th>方式</th><th>价格</th><th>时效</th></tr></thead>
                <tbody>
                  {compareResults.map((r: Record<string, unknown>, i) => (
                    <tr key={i}>
                      <td className="font-medium">{r.forwarder_name as string || '-'}</td>
                      <td>{r.origin as string}</td>
                      <td>{r.destination as string}</td>
                      <td>{MODE_LABELS[r.transport_mode as string] || (r.transport_mode as string)}</td>
                      <td className="font-bold text-blue-700">¥{(r.price as number)?.toLocaleString()} {r.currency as string}</td>
                      <td>{r.transit_days as number}天</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          Add/Edit Modal
          ══════════════════════════════════════════ */}
      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold mb-4">{editing ? '编辑货代' : '新增货代'}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">货代名称 <span className="text-red-400">*</span></label>
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
                <input className="input" placeholder="email@forwarder.com" value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">运输方式</label>
                <div className="flex gap-2 flex-wrap mt-1">
                  {TRANSPORT_MODES.map(m => {
                    const selected = form.transport_modes.split(',').map(s => s.trim()).includes(m)
                    return (
                      <button
                        key={m}
                        type="button"
                        className={`badge cursor-pointer transition-colors ${selected ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}
                        onClick={() => {
                          const current = form.transport_modes.split(',').map(s => s.trim()).filter(Boolean)
                          const next = selected ? current.filter(x => x !== m) : [...current, m]
                          setForm({ ...form, transport_modes: next.join(',') })
                        }}
                      >
                        {MODE_LABELS[m]}
                      </button>
                    )
                  })}
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
