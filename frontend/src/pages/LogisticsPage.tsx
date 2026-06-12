import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { Plus, Edit3, Trash2, Ship } from 'lucide-react'

const STATUS_MAP: Record<string, string> = { pending: '待发运', in_transit: '运输中', customs: '清关中', delivered: '已送达' }
const MODE_MAP: Record<string, string> = { sea: '🚢 海运', air: '✈️ 空运', rail: '🚂 铁路' }

export default function LogisticsPage() {
  const [shipments, setShipments] = useState<Array<Record<string, unknown>>>([])
  const [orders, setOrders] = useState<Array<Record<string, unknown>>>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null)
  const [form, setForm] = useState({ order_id: 0, transport_mode: 'sea', carrier: '', tracking_no: '', origin: '', destination: '', estimated_departure: '', estimated_arrival: '', status: 'pending', notes: '' })

  const load = () => api.logistics.list().then(d => setShipments(d as Array<Record<string, unknown>>)).catch(() => {})

  useEffect(() => {
    load()
    api.orders.list().then(d => setOrders(d as Array<Record<string, unknown>>)).catch(() => {})
  }, [])

  const openNew = () => {
    setEditing(null)
    setForm({ order_id: 0, transport_mode: 'sea', carrier: '', tracking_no: '', origin: '', destination: '', estimated_departure: '', estimated_arrival: '', status: 'pending', notes: '' })
    setShowForm(true)
  }

  const openEdit = (s: Record<string, unknown>) => { setEditing(s); setForm(s as typeof form); setShowForm(true) }

  const save = async () => {
    if (editing) await api.logistics.update(editing.id as number, form)
    else await api.logistics.create(form)
    setShowForm(false); load()
  }

  const remove = async (id: number) => { if (!confirm('确定删除？')) return; await api.logistics.delete(id); load() }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">物流追踪</h2>
        <button className="btn btn-primary" onClick={openNew}><Plus className="w-4 h-4" />新增物流</button>
      </div>

      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr><th>订单号</th><th>运输方式</th><th>承运商</th><th>运单号</th><th>起运→目的</th><th>状态</th><th>预计到达</th><th>操作</th></tr>
          </thead>
          <tbody>
            {shipments.map((s: Record<string, unknown>) => (
              <tr key={s.id as number}>
                <td className="font-mono text-sm">{s.order_no as string}</td>
                <td>{MODE_MAP[s.transport_mode as string] || (s.transport_mode as string)}</td>
                <td>{s.carrier as string || '-'}</td>
                <td className="font-mono text-xs">{s.tracking_no as string || '-'}</td>
                <td className="text-sm">{(s.origin as string) || '-'} → {(s.destination as string) || '-'}</td>
                <td><span className={`badge badge-${s.status as string}`}>{STATUS_MAP[s.status as string]}</span></td>
                <td className="text-sm">{(s.estimated_arrival as string) || '-'}</td>
                <td>
                  <div className="flex gap-1">
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(s)}><Edit3 className="w-3 h-3" /></button>
                    <button className="btn btn-ghost btn-sm text-red-500" onClick={() => remove(s.id as number)}><Trash2 className="w-3 h-3" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal max-w-xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold mb-4">{editing ? '编辑物流' : '新增物流'}</h3>
            <div className="space-y-3">
              <select className="select w-full" value={form.order_id} onChange={e => setForm({ ...form, order_id: Number(e.target.value) })}>
                <option value={0}>选择订单...</option>
                {orders.map(o => <option key={o.id as number} value={o.id as number}>{o.order_no as string} — {o.customer_name as string}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <select className="select" value={form.transport_mode} onChange={e => setForm({ ...form, transport_mode: e.target.value })}>
                  <option value="sea">海运</option><option value="air">空运</option><option value="rail">铁路</option>
                </select>
                <select className="select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input className="input" placeholder="承运商" value={form.carrier} onChange={e => setForm({ ...form, carrier: e.target.value })} />
                <input className="input" placeholder="运单号" value={form.tracking_no} onChange={e => setForm({ ...form, tracking_no: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input className="input" placeholder="起运地" value={form.origin} onChange={e => setForm({ ...form, origin: e.target.value })} />
                <input className="input" placeholder="目的地" value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input className="input" type="date" placeholder="预计发运" value={form.estimated_departure as string} onChange={e => setForm({ ...form, estimated_departure: e.target.value })} />
                <input className="input" type="date" placeholder="预计到达" value={form.estimated_arrival as string} onChange={e => setForm({ ...form, estimated_arrival: e.target.value })} />
              </div>
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
