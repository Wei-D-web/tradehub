import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { Plus, Edit3, Trash2, Clock } from 'lucide-react'

const STATUS_MAP: Record<string, string> = {
  inquiry: '询价中', quoted: '已报价', ordered: '已下单', shipped: '已发货',
  customs: '清关中', delivered: '已交付', completed: '已完成', cancelled: '已取消',
}

const NEXT_STATUS: Record<string, string[]> = {
  inquiry: ['quoted', 'cancelled'],
  quoted: ['ordered', 'cancelled'],
  ordered: ['shipped', 'cancelled'],
  shipped: ['customs', 'cancelled'],
  customs: ['delivered', 'cancelled'],
  delivered: ['completed'],
  completed: [],
  cancelled: ['inquiry'],
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Array<Record<string, unknown>>>([])
  const [customers, setCustomers] = useState<Array<Record<string, unknown>>>([])
  const [suppliers, setSuppliers] = useState<Array<Record<string, unknown>>>([])
  const [forwarders, setForwarders] = useState<Array<Record<string, unknown>>>([])
  const [statusFilter, setStatusFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showTimeline, setShowTimeline] = useState<Record<string, unknown> | null>(null)
  const [form, setForm] = useState({ customer_id: 0, title: '', supplier_id: 0, forwarder_id: 0, total_revenue: 0, purchase_cost: 0, freight_cost: 0, customs_cost: 0, estimated_delivery: '', notes: '' })

  const load = () => api.orders.list(statusFilter).then(d => setOrders(d as Array<Record<string, unknown>>)).catch(() => {})

  useEffect(() => {
    load()
    api.customers.list().then(d => setCustomers(d as Array<Record<string, unknown>>)).catch(() => {})
    api.suppliers.list().then(d => setSuppliers(d as Array<Record<string, unknown>>)).catch(() => {})
    api.forwarders.list().then(d => setForwarders(d as Array<Record<string, unknown>>)).catch(() => {})
  }, [statusFilter])

  const save = async () => {
    await api.orders.create(form)
    setShowForm(false); load()
  }

  const changeStatus = async (id: number, newStatus: string) => {
    await api.orders.update(id, { status: newStatus })
    load()
  }

  const remove = async (id: number) => {
    if (!confirm('确定删除？')) return
    await api.orders.delete(id); load()
  }

  const profit = (o: Record<string, unknown>) =>
    (o.total_revenue as number) - (o.purchase_cost as number) - (o.freight_cost as number) - (o.customs_cost as number)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">订单中心</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus className="w-4 h-4" />新建订单</button>
      </div>

      <div className="flex gap-2 mb-4">
        <select className="select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">全部状态</option>
          {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr><th>订单号</th><th>客户</th><th>供应商</th><th>货代</th><th>收入</th><th>成本</th><th>利润</th><th>状态</th><th>操作</th></tr>
          </thead>
          <tbody>
            {orders.map((o: Record<string, unknown>) => (
              <tr key={o.id as number}>
                <td className="font-mono font-medium text-sm">{o.order_no as string}</td>
                <td>{o.customer_name as string || '-'}</td>
                <td>{o.supplier_name as string || '-'}</td>
                <td>{o.forwarder_name as string || '-'}</td>
                <td className="text-green-600">¥{(o.total_revenue as number).toLocaleString()}</td>
                <td className="text-red-500">¥{((o.purchase_cost as number) + (o.freight_cost as number) + (o.customs_cost as number)).toLocaleString()}</td>
                <td className={`font-bold ${profit(o) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  ¥{profit(o).toLocaleString()}
                </td>
                <td><span className={`badge badge-${o.status as string}`}>{STATUS_MAP[o.status as string]}</span></td>
                <td>
                  <div className="flex gap-1 flex-wrap">
                    {(NEXT_STATUS[o.status as string] || []).map(s => (
                      <button key={s} className="btn btn-ghost btn-sm" onClick={() => changeStatus(o.id as number, s)}>
                        → {STATUS_MAP[s]}
                      </button>
                    ))}
                    <button className="btn btn-ghost btn-sm" onClick={() => setShowTimeline(o)}><Clock className="w-3 h-3" /></button>
                    <button className="btn btn-ghost btn-sm text-red-500" onClick={() => remove(o.id as number)}><Trash2 className="w-3 h-3" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* New Order Modal */}
      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal max-w-xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold mb-4">新建订单</h3>
            <div className="space-y-3">
              <input className="input" placeholder="订单描述 *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              <select className="select w-full" value={form.customer_id} onChange={e => setForm({ ...form, customer_id: Number(e.target.value) })}>
                <option value={0}>选择客户...</option>
                {customers.map(c => <option key={c.id as number} value={c.id as number}>{c.name as string}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <select className="select" value={form.supplier_id} onChange={e => setForm({ ...form, supplier_id: Number(e.target.value) })}>
                  <option value={0}>选择供应商...</option>
                  {suppliers.map(s => <option key={s.id as number} value={s.id as number}>{s.name as string}</option>)}
                </select>
                <select className="select" value={form.forwarder_id} onChange={e => setForm({ ...form, forwarder_id: Number(e.target.value) })}>
                  <option value={0}>选择货代...</option>
                  {forwarders.map(f => <option key={f.id as number} value={f.id as number}>{f.name as string}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input className="input" type="number" placeholder="收入" value={form.total_revenue || ''} onChange={e => setForm({ ...form, total_revenue: Number(e.target.value) })} />
                <input className="input" type="number" placeholder="采购成本" value={form.purchase_cost || ''} onChange={e => setForm({ ...form, purchase_cost: Number(e.target.value) })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input className="input" type="number" placeholder="运费" value={form.freight_cost || ''} onChange={e => setForm({ ...form, freight_cost: Number(e.target.value) })} />
                <input className="input" type="number" placeholder="关税杂费" value={form.customs_cost || ''} onChange={e => setForm({ ...form, customs_cost: Number(e.target.value) })} />
              </div>
              <input className="input" type="date" placeholder="预计交付" value={form.estimated_delivery as string} onChange={e => setForm({ ...form, estimated_delivery: e.target.value })} />
              <textarea className="input" rows={2} placeholder="备注" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <button className="btn btn-ghost" onClick={() => setShowForm(false)}>取消</button>
              <button className="btn btn-primary" onClick={save} disabled={!form.title || !form.customer_id}>创建订单</button>
            </div>
          </div>
        </div>
      )}

      {/* Timeline Modal */}
      {showTimeline && (
        <div className="modal-backdrop" onClick={() => setShowTimeline(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold mb-4">订单时间线 — {(showTimeline as Record<string, unknown>).order_no as string}</h3>
            <div className="space-y-2">
              {((showTimeline as Record<string, unknown>).timeline as Array<Record<string, unknown>>)?.map((t: Record<string, unknown>, i: number) => (
                <div key={i} className="flex gap-3 text-sm border-l-2 border-blue-200 pl-3 py-1">
                  <span className="text-xs text-slate-400 w-36">{(t.timestamp as string)?.slice(0, 16)}</span>
                  <span className="badge badge-sent">{t.event_type as string}</span>
                  <span className="text-slate-600">{t.description as string}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <button className="btn btn-ghost" onClick={() => setShowTimeline(null)}>关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
