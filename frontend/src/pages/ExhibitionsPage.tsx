import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import { useToast } from '../components/Toast'
import type { Exhibition, ExhibitionForm } from '../types'
import { Plus, Search, Edit3, Trash2, Presentation, RefreshCw, Loader2, TrendingUp, Users, Target, DollarSign } from 'lucide-react'

const EMPTY_FORM: ExhibitionForm = {
  name: '', date_start: '', date_end: '', location: '', city: '', booth_number: '', cost_cny: 0, notes: '',
}

export default function ExhibitionsPage() {
  const toast = useToast()
  const [expos, setExpos] = useState<Exhibition[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Exhibition | null>(null)
  const [form, setForm] = useState<ExhibitionForm>(EMPTY_FORM)
  const [roi, setRoi] = useState<Record<string, unknown>>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [d, r] = await Promise.all([
        api.exhibitions.list(search) as Promise<Exhibition[]>,
        api.exhibitions.roi().catch(() => ({})),
      ])
      setExpos(d)
      setRoi(r as Record<string, unknown>)
    } catch {
      toast.error('加载展会列表失败')
    } finally {
      setLoading(false)
    }
  }, [search, toast])

  useEffect(() => { load() }, [load])

  const openNew = () => { setEditing(null); setForm(EMPTY_FORM); setShowForm(true) }
  const openEdit = (e: Exhibition) => {
    setEditing(e)
    setForm({
      name: e.name, date_start: e.date_start || '', date_end: e.date_end || '',
      location: e.location, city: e.city, booth_number: e.booth_number,
      cost_cny: e.cost_cny, notes: e.notes,
    })
    setShowForm(true)
  }

  const save = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      if (editing) {
        await api.exhibitions.update(editing.id, form as unknown as Record<string, unknown>)
        toast.success('展会已更新')
      } else {
        await api.exhibitions.create(form as unknown as Record<string, unknown>)
        toast.success('展会添加成功！')
      }
      setShowForm(false)
      load()
    } catch (e) {
      toast.error((e as Error).message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (e: Exhibition) => {
    if (!confirm(`确定删除展会「${e.name}」吗？相关线索将保留。`)) return
    try {
      await api.exhibitions.delete(e.id)
      toast.success('已删除')
      load()
    } catch (err) {
      toast.error((err as Error).message || '删除失败')
    }
  }

  const roiCards: Array<{ label: string; value: string | number; icon: typeof Presentation; color: string }> = [
    { label: '参展总数', value: (roi.total_exhibitions as number) || 0, icon: Presentation, color: '#6366f1' },
    { label: '总投入', value: `¥${((roi.total_cost as number) || 0).toLocaleString()}`, icon: DollarSign, color: '#f59e0b' },
    { label: '展会线索', value: (roi.exhibition_leads as number) || 0, icon: Users, color: '#3b82f6' },
    { label: '转化率', value: (roi.conversion_rate as string) || '0%', icon: Target, color: '#10b981' },
    { label: '赢单金额', value: `¥${((roi.won_value_cny as number) || 0).toLocaleString()}`, icon: TrendingUp, color: '#22c55e' },
    { label: '线索成本', value: `¥${(roi.cost_per_lead_cny as number) || 0}/条`, icon: DollarSign, color: '#ec4899' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold">展会管理</h2>
          <p className="text-xs text-slate-400 mt-0.5">{expos.length} 场展会</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>
          <Plus className="w-4 h-4" />新增展会
        </button>
      </div>

      {/* ROI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        {roiCards.map(c => {
          const Icon = c.icon
          return (
            <div key={c.label} className="card p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className="w-3 h-3" style={{ color: c.color }} />
                <span className="text-[11px] text-slate-400">{c.label}</span>
              </div>
              <div className="text-sm font-bold" style={{ color: c.color }}>{c.value}</div>
            </div>
          )
        })}
      </div>

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="搜索展会名称/地点..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr><th>展会名称</th><th>日期</th><th>城市</th><th>地点</th><th>展位号</th><th>成本</th><th>线索数</th><th>赢单数</th><th>操作</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="text-center py-16 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />加载中...
              </td></tr>
            ) : expos.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-16">
                <Presentation className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 mb-3">{search ? '没有匹配的展会' : '还没有展会记录'}</p>
                {!search && (
                  <button className="btn btn-primary btn-sm" onClick={openNew}>
                    <Plus className="w-4 h-4" />记录第一场展会
                  </button>
                )}
              </td></tr>
            ) : expos.map(e => (
              <tr key={e.id}>
                <td className="font-medium">{e.name}</td>
                <td className="text-sm">{e.date_start || '?'} ~ {e.date_end || '?'}</td>
                <td>{e.city || '-'}</td>
                <td className="text-sm text-slate-500 max-w-[150px] truncate">{e.location || '-'}</td>
                <td className="text-sm font-mono">{e.booth_number || '-'}</td>
                <td className="text-sm">{e.cost_cny > 0 ? `¥${e.cost_cny.toLocaleString()}` : '-'}</td>
                <td><span className="badge" style={{background: '#eff6ff', color: '#3b82f6'}}>{e.lead_count}</span></td>
                <td><span className="badge" style={{background: '#f0fdf4', color: '#16a34a'}}>{e.won_count}</span></td>
                <td>
                  <div className="flex gap-1">
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(e)}><Edit3 className="w-3 h-3" /></button>
                    <button className="btn btn-ghost btn-sm text-red-500" onClick={() => remove(e)}><Trash2 className="w-3 h-3" /></button>
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
            <h3 className="font-bold mb-4">{editing ? '编辑展会' : '新增展会'}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">展会名称 <span className="text-red-400">*</span></label>
                <input className="input" placeholder="如 Analytica China 2026" value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })} autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">开始日期</label>
                  <input type="date" className="input" value={form.date_start}
                    onChange={e => setForm({ ...form, date_start: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">结束日期</label>
                  <input type="date" className="input" value={form.date_end}
                    onChange={e => setForm({ ...form, date_end: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">城市</label>
                  <input className="input" placeholder="上海" value={form.city}
                    onChange={e => setForm({ ...form, city: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">展位号</label>
                  <input className="input" placeholder="N1.1234" value={form.booth_number}
                    onChange={e => setForm({ ...form, booth_number: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">地点/场馆</label>
                <input className="input" placeholder="上海新国际博览中心" value={form.location}
                  onChange={e => setForm({ ...form, location: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">参展成本 (CNY)</label>
                <input type="number" className="input" placeholder="含展位费+搭建+差旅" value={form.cost_cny || ''}
                  onChange={e => setForm({ ...form, cost_cny: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">备注</label>
                <textarea className="input" rows={2} placeholder="展会总结、亮点等..."
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
