import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { Plus, Edit3, Trash2, MessageCircle, CheckCircle2 } from 'lucide-react'

const PRIORITY_MAP: Record<string, string> = { low: '低', medium: '中', high: '高', urgent: '紧急' }
const STATUS_MAP: Record<string, string> = { open: '待处理', assigned: '已分配', in_progress: '处理中', waiting_parts: '等配件', resolved: '已解决', closed: '已关闭' }
const TYPE_MAP: Record<string, string> = { repair: '维修', replacement: '换货', consultation: '咨询', complaint: '投诉' }

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Array<Record<string, unknown>>>([])
  const [orders, setOrders] = useState<Array<Record<string, unknown>>>([])
  const [technicians, setTechnicians] = useState<Array<Record<string, unknown>>>([])
  const [statusFilter, setStatusFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showDetail, setShowDetail] = useState<Record<string, unknown> | null>(null)
  const [comments, setComments] = useState<Array<Record<string, unknown>>>([])
  const [newComment, setNewComment] = useState('')
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null)
  const [form, setForm] = useState({ order_id: 0, customer_id: 0, title: '', priority: 'medium', issue_type: 'repair', description: '', assigned_to: 0 })

  const load = () => api.tickets.list(statusFilter).then(d => setTickets(d as Array<Record<string, unknown>>)).catch(() => {})

  useEffect(() => {
    load()
    api.orders.list().then(d => setOrders(d as Array<Record<string, unknown>>)).catch(() => {})
    api.technicians.list().then(d => setTechnicians(d as Array<Record<string, unknown>>)).catch(() => {})
  }, [statusFilter])

  const save = async () => {
    if (editing) await api.tickets.update(editing.id as number, form)
    else await api.tickets.create(form)
    setShowForm(false); load()
  }

  const remove = async (id: number) => { if (!confirm('确定删除？')) return; await api.tickets.delete(id); load() }

  const resolve = async (id: number) => { await api.tickets.update(id, { status: 'resolved' }); load() }

  const openDetail = async (t: Record<string, unknown>) => {
    setShowDetail(t)
    const c = await api.tickets.comments.list(t.id as number)
    setComments(c as Array<Record<string, unknown>>)
  }

  const addComment = async () => {
    if (!newComment.trim() || !showDetail) return
    await api.tickets.comments.add(showDetail.id as number, { content: newComment, author: '我' })
    setNewComment('')
    const c = await api.tickets.comments.list(showDetail.id as number)
    setComments(c as Array<Record<string, unknown>>)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">售后工单</h2>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setForm({ order_id: 0, customer_id: 0, title: '', priority: 'medium', issue_type: 'repair', description: '', assigned_to: 0 }); setShowForm(true) }}>
          <Plus className="w-4 h-4" />新建工单
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
          <thead><tr><th>标题</th><th>客户</th><th>类型</th><th>优先级</th><th>状态</th><th>技术员</th><th>操作</th></tr></thead>
          <tbody>
            {tickets.map((t: Record<string, unknown>) => (
              <tr key={t.id as number}>
                <td className="font-medium cursor-pointer hover:text-blue-600" onClick={() => openDetail(t)}>{t.title as string}</td>
                <td>{t.customer_name as string || '-'}</td>
                <td>{TYPE_MAP[t.issue_type as string] || (t.issue_type as string)}</td>
                <td><span className={`badge badge-${t.priority as string}`}>{PRIORITY_MAP[t.priority as string]}</span></td>
                <td><span className={`badge badge-${t.status as string}`}>{STATUS_MAP[t.status as string]}</span></td>
                <td>{t.technician_name as string || '-'}</td>
                <td>
                  <div className="flex gap-1">
                    {(t.status as string) !== 'resolved' && (t.status as string) !== 'closed' && (
                      <button className="btn btn-ghost btn-sm text-green-500" onClick={() => resolve(t.id as number)}><CheckCircle2 className="w-3 h-3" /></button>
                    )}
                    <button className="btn btn-ghost btn-sm" onClick={() => setShowDetail(t)}><MessageCircle className="w-3 h-3" /></button>
                    <button className="btn btn-ghost btn-sm text-red-500" onClick={() => remove(t.id as number)}><Trash2 className="w-3 h-3" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {showDetail && (
        <div className="modal-backdrop" onClick={() => setShowDetail(null)}>
          <div className="modal max-w-lg" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold mb-2">{showDetail.title as string}</h3>
            <div className="flex gap-2 mb-4">
              <span className={`badge badge-${showDetail.priority as string}`}>{PRIORITY_MAP[showDetail.priority as string]}</span>
              <span className={`badge badge-${showDetail.status as string}`}>{STATUS_MAP[showDetail.status as string]}</span>
            </div>
            <p className="text-sm text-slate-600 mb-4">{showDetail.description as string}</p>
            {showDetail.resolution && <p className="text-sm text-green-600 mb-4">解决方案: {showDetail.resolution as string}</p>}

            <h4 className="font-semibold text-sm mb-2">评论</h4>
            <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
              {comments.map((c: Record<string, unknown>, i) => (
                <div key={i} className="bg-slate-50 rounded-lg p-2 text-sm">
                  <span className="font-medium">{c.author as string}</span>
                  <span className="text-slate-400 text-xs ml-2">{(c.created_at as string)?.slice(0, 16)}</span>
                  <p className="mt-1">{c.content as string}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input className="input flex-1" placeholder="添加评论..." value={newComment}
                onChange={e => setNewComment(e.target.value)} onKeyDown={e => e.key === 'Enter' && addComment()} />
              <button className="btn btn-primary btn-sm" onClick={addComment}>发送</button>
            </div>
            <div className="mt-4 flex justify-end">
              <button className="btn btn-ghost" onClick={() => setShowDetail(null)}>关闭</button>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal max-w-xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold mb-4">{editing ? '编辑工单' : '新建工单'}</h3>
            <div className="space-y-3">
              <input className="input" placeholder="标题 *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              <div className="grid grid-cols-2 gap-2">
                <select className="select" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                  <option value="low">低</option><option value="medium">中</option><option value="high">高</option><option value="urgent">紧急</option>
                </select>
                <select className="select" value={form.issue_type} onChange={e => setForm({ ...form, issue_type: e.target.value })}>
                  <option value="repair">维修</option><option value="replacement">换货</option><option value="consultation">咨询</option><option value="complaint">投诉</option>
                </select>
              </div>
              <select className="select w-full" value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: Number(e.target.value) })}>
                <option value={0}>指派技术员...</option>
                {technicians.map((t: Record<string, unknown>) => <option key={t.id as number} value={t.id as number}>{t.name as string}</option>)}
              </select>
              <textarea className="input" rows={3} placeholder="问题描述" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
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
