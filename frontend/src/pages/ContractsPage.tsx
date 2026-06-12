import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { Plus, Edit3, Trash2, FileCheck, Download } from 'lucide-react'

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Array<Record<string, unknown>>>([])
  const [orders, setOrders] = useState<Array<Record<string, unknown>>>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ order_id: 0, contract_no: '', type: 'sales', party_name: '', content_json: '{}', status: 'draft' })

  const load = () => api.contracts.list().then(d => setContracts(d as Array<Record<string, unknown>>)).catch(() => {})

  useEffect(() => {
    load()
    api.orders.list().then(d => setOrders(d as Array<Record<string, unknown>>)).catch(() => {})
  }, [])

  const save = async () => {
    await api.contracts.create({ ...form, content_json: JSON.parse(form.content_json || '{}') })
    setShowForm(false); load()
  }

  const sign = async (id: number) => { await api.contracts.sign(id); load() }
  const remove = async (id: number) => { if (!confirm('确定删除？')) return; await api.contracts.delete(id); load() }

  const statusLabel = (s: string) => ({ draft: '草稿', signed: '已签', cancelled: '已取消' }[s] || s)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">合同管理</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus className="w-4 h-4" />新建合同</button>
      </div>

      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr><th>合同编号</th><th>类型</th><th>签约方</th><th>关联订单</th><th>状态</th><th>签署日期</th><th>操作</th></tr>
          </thead>
          <tbody>
            {contracts.map((c: Record<string, unknown>) => (
              <tr key={c.id as number}>
                <td className="font-mono text-sm font-medium">{c.contract_no as string}</td>
                <td><span className="badge badge-sent">{c.type === 'sales' ? '销售合同' : '采购合同'}</span></td>
                <td>{c.party_name as string || '-'}</td>
                <td className="text-sm">{c.order_no as string || '-'}</td>
                <td><span className={`badge badge-${c.status as string}`}>{statusLabel(c.status as string)}</span></td>
                <td className="text-sm">{(c.signed_at as string)?.slice(0, 10) || '-'}</td>
                <td>
                  <div className="flex gap-1">
                    {(c.status as string) === 'draft' && (
                      <button className="btn btn-ghost btn-sm text-green-500" onClick={() => sign(c.id as number)}><FileCheck className="w-3 h-3" /></button>
                    )}
                    <a className="btn btn-ghost btn-sm" href={api.contracts.pdf(c.id as number)} target="_blank"><Download className="w-3 h-3" /></a>
                    <button className="btn btn-ghost btn-sm text-red-500" onClick={() => remove(c.id as number)}><Trash2 className="w-3 h-3" /></button>
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
            <h3 className="font-bold mb-4">新建合同</h3>
            <div className="space-y-3">
              <input className="input" placeholder="合同编号（留空自动生成）" value={form.contract_no} onChange={e => setForm({ ...form, contract_no: e.target.value })} />
              <div className="grid grid-cols-2 gap-2">
                <select className="select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  <option value="sales">销售合同</option>
                  <option value="purchase">采购合同</option>
                </select>
                <select className="select" value={form.order_id} onChange={e => setForm({ ...form, order_id: Number(e.target.value) })}>
                  <option value={0}>选择订单...</option>
                  {orders.map(o => <option key={o.id as number} value={o.id as number}>{o.order_no as string}</option>)}
                </select>
              </div>
              <input className="input" placeholder="签约方" value={form.party_name} onChange={e => setForm({ ...form, party_name: e.target.value })} />
              <textarea className="input font-mono text-xs" rows={5} placeholder="合同内容 (JSON)" value={form.content_json}
                onChange={e => setForm({ ...form, content_json: e.target.value })} />
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
