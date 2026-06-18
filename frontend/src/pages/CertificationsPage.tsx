import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import { useToast } from '../components/Toast'
import type { Certification, CertificationForm } from '../types'
import { CERT_TYPES } from '../types'
import { Plus, Search, Edit3, Trash2, Shield, RefreshCw, Loader2, AlertTriangle, CheckCircle, Clock } from 'lucide-react'

const EMPTY_FORM: CertificationForm = {
  product_id: null, product_name: '', brand: '', model: '',
  cert_type: 'CCC', cert_number: '', issued_date: '', expiry_date: '',
  issuing_body: '', notes: '', attachment_url: '',
}

function statusBadge(status: string, daysLeft?: number) {
  if (status === 'expired') return <span className="badge" style={{background: '#fef2f2', color: '#ef4444'}}><AlertTriangle className="w-3 h-3 inline mr-1" />已过期</span>
  if (status === 'expiring_soon') return <span className="badge" style={{background: '#fffbeb', color: '#d97706'}}><Clock className="w-3 h-3 inline mr-1" />{daysLeft ?? '?'}天后到期</span>
  return <span className="badge" style={{background: '#f0fdf4', color: '#16a34a'}}><CheckCircle className="w-3 h-3 inline mr-1" />有效</span>
}

export default function CertificationsPage() {
  const toast = useToast()
  const [certs, setCerts] = useState<Certification[]>([])
  const [search, setSearch] = useState('')
  const [certType, setCertType] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Certification | null>(null)
  const [form, setForm] = useState<CertificationForm>(EMPTY_FORM)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api.certifications.list(search, certType) as Certification[]
      setCerts(d)
    } catch {
      toast.error('加载证书列表失败')
    } finally {
      setLoading(false)
    }
  }, [search, certType, toast])

  useEffect(() => { load() }, [load])

  const openNew = () => { setEditing(null); setForm(EMPTY_FORM); setShowForm(true) }
  const openEdit = (c: Certification) => {
    setEditing(c)
    setForm({
      product_id: c.product_id, product_name: c.product_name, brand: c.brand, model: c.model,
      cert_type: c.cert_type, cert_number: c.cert_number,
      issued_date: c.issued_date || '', expiry_date: c.expiry_date || '',
      issuing_body: c.issuing_body, notes: c.notes, attachment_url: c.attachment_url,
    })
    setShowForm(true)
  }

  const save = async () => {
    if (!form.product_name.trim()) return
    setSaving(true)
    try {
      if (editing) {
        await api.certifications.update(editing.id, form as unknown as Record<string, unknown>)
        toast.success('证书已更新')
      } else {
        await api.certifications.create(form as unknown as Record<string, unknown>)
        toast.success('证书添加成功！')
      }
      setShowForm(false)
      load()
    } catch (e) {
      toast.error((e as Error).message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (c: Certification) => {
    if (!confirm(`确定删除证书「${c.product_name} - ${c.cert_type}」吗？`)) return
    try {
      await api.certifications.delete(c.id)
      toast.success('已删除')
      load()
    } catch (e) {
      toast.error((e as Error).message || '删除失败')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold">认证证书</h2>
          <p className="text-xs text-slate-400 mt-0.5">{certs.length} 份证书</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>
          <Plus className="w-4 h-4" />添加证书
        </button>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="搜索产品/证书编号/发证机构..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="select" value={certType} onChange={e => setCertType(e.target.value)}>
          <option value="">全部类型</option>
          {CERT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr><th>产品/设备</th><th>品牌</th><th>认证类型</th><th>证书编号</th><th>发证机构</th><th>到期日期</th><th>状态</th><th>操作</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-16 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />加载中...
              </td></tr>
            ) : certs.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-16">
                <Shield className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 mb-3">{search || certType ? '没有匹配的证书' : '还没有证书记录'}</p>
                {!search && !certType && (
                  <button className="btn btn-primary btn-sm" onClick={openNew}>
                    <Plus className="w-4 h-4" />添加第一份证书
                  </button>
                )}
              </td></tr>
            ) : certs.map(c => {
              const daysLeft = c.expiry_date ? Math.ceil((new Date(c.expiry_date).getTime() - Date.now()) / 86400000) : undefined
              return (
                <tr key={c.id} className={c.status === 'expired' ? 'bg-red-50/30' : ''}>
                  <td className="font-medium">{c.product_name}{c.model ? ` (${c.model})` : ''}</td>
                  <td>{c.brand || '-'}</td>
                  <td><span className="badge" style={{background: '#eef2ff', color: '#6366f1'}}>{c.cert_type}</span></td>
                  <td className="text-sm font-mono">{c.cert_number || '-'}</td>
                  <td className="text-sm text-slate-500">{c.issuing_body || '-'}</td>
                  <td className="text-sm">{c.expiry_date || '-'}</td>
                  <td>{statusBadge(c.status, daysLeft)}</td>
                  <td>
                    <div className="flex gap-1">
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)}><Edit3 className="w-3 h-3" /></button>
                      <button className="btn btn-ghost btn-sm text-red-500" onClick={() => remove(c)}><Trash2 className="w-3 h-3" /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal max-w-lg" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold mb-4">{editing ? '编辑证书' : '添加证书'}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">产品/设备名称 <span className="text-red-400">*</span></label>
                <input className="input" placeholder="如 FAR 三口实验龙头" value={form.product_name}
                  onChange={e => setForm({ ...form, product_name: e.target.value })} autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">品牌</label>
                  <input className="input" placeholder="FAR / CHEMISAFE" value={form.brand}
                    onChange={e => setForm({ ...form, brand: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">型号</label>
                  <input className="input" placeholder="型号" value={form.model}
                    onChange={e => setForm({ ...form, model: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">认证类型 <span className="text-red-400">*</span></label>
                  <select className="select w-full" value={form.cert_type}
                    onChange={e => setForm({ ...form, cert_type: e.target.value })}>
                    {CERT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">证书编号</label>
                  <input className="input" placeholder="证书编号" value={form.cert_number}
                    onChange={e => setForm({ ...form, cert_number: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">发证日期</label>
                  <input type="date" className="input" value={form.issued_date}
                    onChange={e => setForm({ ...form, issued_date: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">到期日期</label>
                  <input type="date" className="input" value={form.expiry_date}
                    onChange={e => setForm({ ...form, expiry_date: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">发证机构</label>
                <input className="input" placeholder="如中国质量认证中心" value={form.issuing_body}
                  onChange={e => setForm({ ...form, issuing_body: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">备注</label>
                <textarea className="input" rows={2} placeholder="补充说明..."
                  value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <button className="btn btn-ghost" onClick={() => setShowForm(false)}>取消</button>
              <button className="btn btn-primary" onClick={save} disabled={!form.product_name.trim() || saving}>
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" />保存中...</> : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
