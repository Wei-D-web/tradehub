import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { Plus, Edit3, Trash2, Send, CheckCircle2 } from 'lucide-react'

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<Array<Record<string, unknown>>>([])
  const [customers, setCustomers] = useState<Array<Record<string, unknown>>>([])
  const [statusFilter, setStatusFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null)
  const [form, setForm] = useState({ customer_id: 0, title: '', items: [] as Array<Record<string, unknown>>, tax: 0, currency: 'CNY', valid_until: '', notes: '' })

  const load = () => api.quotations.list(statusFilter).then(d => setQuotations(d as Array<Record<string, unknown>>)).catch(() => {})
  const loadCustomers = () => api.customers.list().then(d => setCustomers(d as Array<Record<string, unknown>>)).catch(() => {})

  useEffect(() => { load(); loadCustomers() }, [statusFilter])

  const openNew = () => {
    setEditing(null)
    setForm({ customer_id: 0, title: '', items: [], tax: 0, currency: 'CNY', valid_until: '', notes: '' })
    setShowForm(true)
  }

  const save = async () => {
    const subtotal = form.items.reduce((sum, it) => sum + (it.amount as number || 0), 0)
    const body = { ...form, subtotal, total: subtotal + form.tax }
    if (editing) await api.quotations.update(editing.id as number, body)
    else await api.quotations.create(body)
    setShowForm(false); load()
  }

  const remove = async (id: number) => { if (!confirm('确定删除？')) return; await api.quotations.delete(id); load() }
  const send = async (id: number) => { await api.quotations.send(id); load() }
  const accept = async (id: number) => { await api.quotations.accept(id); load() }

  const addItem = () => {
    setForm({ ...form, items: [...form.items, { product_id: 0, name: '', quantity: 1, unit_price: 0, amount: 0, notes: '' }] })
  }

  const updateItem = (idx: number, field: string, value: unknown) => {
    const items = [...form.items]
    items[idx] = { ...items[idx], [field]: value }
    if (field === 'quantity' || field === 'unit_price') {
      items[idx].amount = (items[idx].quantity as number) * (items[idx].unit_price as number)
    }
    setForm({ ...form, items })
  }

  const removeItem = (idx: number) => {
    setForm({ ...form, items: form.items.filter((_, i) => i !== idx) })
  }

  const statusLabel = (s: string) => {
    const map: Record<string, string> = { draft: '草稿', sent: '已发送', accepted: '已接受', rejected: '已拒绝', expired: '已过期' }
    return map[s] || s
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">报价管理</h2>
        <button className="btn btn-primary" onClick={openNew}><Plus className="w-4 h-4" />新建报价单</button>
      </div>

      <div className="flex gap-2 mb-4">
        <select className="select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">全部状态</option>
          <option value="draft">草稿</option>
          <option value="sent">已发送</option>
          <option value="accepted">已接受</option>
          <option value="rejected">已拒绝</option>
        </select>
      </div>

      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr><th>标题</th><th>客户</th><th>金额</th><th>状态</th><th>日期</th><th>操作</th></tr>
          </thead>
          <tbody>
            {quotations.map((q: Record<string, unknown>) => (
              <tr key={q.id as number}>
                <td className="font-medium">{q.title as string}</td>
                <td>{q.customer_name as string || '-'}</td>
                <td className="font-bold">¥{(q.total as number).toLocaleString()}</td>
                <td><span className={`badge badge-${q.status as string}`}>{statusLabel(q.status as string)}</span></td>
                <td className="text-sm text-slate-500">{(q.created_at as string)?.slice(0, 10)}</td>
                <td>
                  <div className="flex gap-1">
                    {(q.status as string) === 'draft' && (
                      <button className="btn btn-ghost btn-sm text-blue-500" onClick={() => send(q.id as number)}><Send className="w-3 h-3" /></button>
                    )}
                    {(q.status as string) === 'sent' && (
                      <button className="btn btn-ghost btn-sm text-green-500" onClick={() => accept(q.id as number)}><CheckCircle2 className="w-3 h-3" /></button>
                    )}
                    <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(q); setForm(q as typeof form); setShowForm(true) }}><Edit3 className="w-3 h-3" /></button>
                    <button className="btn btn-ghost btn-sm text-red-500" onClick={() => remove(q.id as number)}><Trash2 className="w-3 h-3" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal max-w-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold mb-4">{editing ? '编辑报价单' : '新建报价单'}</h3>
            <div className="space-y-3">
              <input className="input" placeholder="报价标题 *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              <select className="select w-full" value={form.customer_id} onChange={e => setForm({ ...form, customer_id: Number(e.target.value) })}>
                <option value={0}>选择客户...</option>
                {customers.map((c: Record<string, unknown>) => (
                  <option key={c.id as number} value={c.id as number}>{c.name as string}</option>
                ))}
              </select>

              <div className="border rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-slate-600">报价明细</span>
                  <button className="btn btn-ghost btn-sm" onClick={addItem}>+ 添加行</button>
                </div>
                {form.items.map((it: Record<string, unknown>, idx: number) => (
                  <div key={idx} className="flex gap-2 mb-2 items-end">
                    <input className="input flex-1" placeholder="品名" value={it.name as string || ''} onChange={e => updateItem(idx, 'name', e.target.value)} />
                    <input className="input w-20" type="number" placeholder="数量" value={it.quantity as number || ''} onChange={e => updateItem(idx, 'quantity', Number(e.target.value))} />
                    <input className="input w-24" type="number" placeholder="单价" value={it.unit_price as number || ''} onChange={e => updateItem(idx, 'unit_price', Number(e.target.value))} />
                    <span className="text-sm text-slate-500 w-20 text-right">¥{(it.amount as number || 0).toLocaleString()}</span>
                    <button className="btn btn-ghost btn-sm text-red-400" onClick={() => removeItem(idx)}><Trash2 className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input className="input w-32" type="number" placeholder="税额" value={form.tax} onChange={e => setForm({ ...form, tax: Number(e.target.value) })} />
                <input className="input" type="date" placeholder="有效期至" value={form.valid_until as string} onChange={e => setForm({ ...form, valid_until: e.target.value })} />
              </div>
              <textarea className="input" rows={2} placeholder="备注" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <button className="btn btn-ghost" onClick={() => setShowForm(false)}>取消</button>
              <button className="btn btn-primary" onClick={save} disabled={!form.title}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
