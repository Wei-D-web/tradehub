import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { Plus, Edit3, Trash2 } from 'lucide-react'

const STATUS_MAP: Record<string, string> = {
  requested: '待审批', approved: '已批准', shipped_back: '已寄回',
  received: '已收货', inspected: '已检验', refunded: '已退款', replaced: '已换货',
}

export default function RMAPage() {
  const [rmas, setRmas] = useState<Array<Record<string, unknown>>>([])
  const [orders, setOrders] = useState<Array<Record<string, unknown>>>([])
  const [statusFilter, setStatusFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null)
  const [form, setForm] = useState({ order_id: 0, ticket_id: 0, product_id: 0, reason: '', return_tracking_no: '', refund_amount: 0 })

  const load = () => api.rma.list(statusFilter).then(d => setRmas(d as Array<Record<string, unknown>>)).catch(() => {})

  useEffect(() => {
    load()
    api.orders.list().then(d => setOrders(d as Array<Record<string, unknown>>)).catch(() => {})
  }, [statusFilter])

  const save = async () => {
    if (editing) await api.rma.update(editing.id as number, form)
    else await api.rma.create(form)
    setShowForm(false); load()
  }

  const remove = async (id: number) => { if (!confirm('确定删除？')) return; await api.rma.delete(id); load() }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">RMA退货管理</h2>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setForm({ order_id: 0, ticket_id: 0, product_id: 0, reason: '', return_tracking_no: '', refund_amount: 0 }); setShowForm(true) }}>
          <Plus className="w-4 h-4" />新建RMA
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <select className="select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">全部状态</option>
          {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr><th>订单</th><th>产品</th><th>原因</th><th>退货单号</th><th>退款金额</th><th>状态</th><th>操作</th></tr></thead>
          <tbody>
            {rmas.map((r: Record<string, unknown>) => (
              <tr key={r.id as number}>
                <td className="text-sm font-mono">{r.order_no as string}</td>
                <td>{r.product_name as string || '-'}</td>
                <td className="text-sm max-w-[200px] truncate">{r.reason as string}</td>
                <td className="text-sm">{r.return_tracking_no as string || '-'}</td>
                <td className="font-bold text-red-500">¥{(r.refund_amount as number).toLocaleString()}</td>
                <td><span className={`badge badge-${r.status as string}`}>{STATUS_MAP[r.status as string]}</span></td>
                <td>
                  <div className="flex gap-1">
                    <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(r); setForm(r as typeof form); setShowForm(true) }}><Edit3 className="w-3 h-3" /></button>
                    <button className="btn btn-ghost btn-sm text-red-500" onClick={() => remove(r.id as number)}><Trash2 className="w-3 h-3" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold mb-4">{editing ? '编辑RMA' : '新建RMA'}</h3>
            <div className="space-y-3">
              <select className="select w-full" value={form.order_id} onChange={e => setForm({ ...form, order_id: Number(e.target.value) })}>
                <option value={0}>选择订单...</option>
                {orders.map(o => <option key={o.id as number} value={o.id as number}>{o.order_no as string}</option>)}
              </select>
              <input className="input" type="number" placeholder="产品ID" value={form.product_id || ''} onChange={e => setForm({ ...form, product_id: Number(e.target.value) })} />
              <input className="input" type="number" placeholder="退款金额" value={form.refund_amount || ''} onChange={e => setForm({ ...form, refund_amount: Number(e.target.value) })} />
              <input className="input" placeholder="退货单号" value={form.return_tracking_no} onChange={e => setForm({ ...form, return_tracking_no: e.target.value })} />
              <textarea className="input" rows={3} placeholder="退货原因" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <button className="btn btn-ghost" onClick={() => setShowForm(false)}>取消</button>
              <button className="btn btn-primary" onClick={save}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
