import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { Plus, Edit3, Trash2, Calendar } from 'lucide-react'

export default function TechniciansPage() {
  const [technicians, setTechnicians] = useState<Array<Record<string, unknown>>>([])
  const [schedules, setSchedules] = useState<Array<Record<string, unknown>>>([])
  const [showForm, setShowForm] = useState(false)
  const [showSchedule, setShowSchedule] = useState(false)
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null)
  const [form, setForm] = useState({ name: '', phone: '', email: '', specialties: '' })
  const [scheduleForm, setScheduleForm] = useState({ technician_id: 0, ticket_id: 0, scheduled_date: '', start_time: '09:00', end_time: '17:00', notes: '' })

  const load = () => api.technicians.list().then(d => setTechnicians(d as Array<Record<string, unknown>>)).catch(() => {})
  const loadSchedules = () => api.technicians.schedules.list().then(d => setSchedules(d as Array<Record<string, unknown>>)).catch(() => {})

  useEffect(() => { load(); loadSchedules() }, [])

  const save = async () => {
    if (editing) await api.technicians.update(editing.id as number, form)
    else await api.technicians.create(form)
    setShowForm(false); load()
  }

  const remove = async (id: number) => { if (!confirm('确定删除？')) return; await api.technicians.delete(id); load() }
  const removeSchedule = async (id: number) => { await api.technicians.schedules.delete(id); loadSchedules() }
  const addSchedule = async () => {
    await api.technicians.schedules.create(scheduleForm)
    setShowSchedule(false); loadSchedules()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">技术员管理</h2>
        <div className="flex gap-2">
          <button className="btn btn-ghost" onClick={() => setShowSchedule(true)}><Calendar className="w-4 h-4" />排班</button>
          <button className="btn btn-primary" onClick={() => { setEditing(null); setForm({ name: '', phone: '', email: '', specialties: '' }); setShowForm(true) }}>
            <Plus className="w-4 h-4" />新增
          </button>
        </div>
      </div>

      <div className="card overflow-x-auto mb-6">
        <table className="table">
          <thead><tr><th>姓名</th><th>电话</th><th>专长</th><th>状态</th><th>当前负载</th><th>操作</th></tr></thead>
          <tbody>
            {technicians.map((t: Record<string, unknown>) => (
              <tr key={t.id as number}>
                <td className="font-medium">{t.name as string}</td>
                <td className="text-sm">{t.phone as string}</td>
                <td><span className="badge badge-sent">{t.specialties as string || '-'}</span></td>
                <td><span className={`badge ${t.is_available ? 'badge-completed' : 'badge-cancelled'}`}>
                  {t.is_available ? '空闲' : '忙碌'}
                </span></td>
                <td>{t.current_load as number}</td>
                <td>
                  <div className="flex gap-1">
                    <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(t); setForm(t as typeof form); setShowForm(true) }}><Edit3 className="w-3 h-3" /></button>
                    <button className="btn btn-ghost btn-sm text-red-500" onClick={() => remove(t.id as number)}><Trash2 className="w-3 h-3" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Schedules */}
      <h3 className="font-semibold mb-2">排班记录</h3>
      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr><th>技术员</th><th>日期</th><th>时间</th><th>状态</th><th>备注</th><th>操作</th></tr></thead>
          <tbody>
            {schedules.map((s: Record<string, unknown>) => (
              <tr key={s.id as number}>
                <td>{(s as Record<string, unknown>).technician_name as string || '-'}</td>
                <td>{s.scheduled_date as string}</td>
                <td>{s.start_time as string} - {s.end_time as string}</td>
                <td><span className="badge badge-sent">{s.status as string}</span></td>
                <td className="text-sm">{s.notes as string}</td>
                <td><button className="btn btn-ghost btn-sm text-red-500" onClick={() => removeSchedule(s.id as number)}><Trash2 className="w-3 h-3" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tech Form Modal */}
      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold mb-4">{editing ? '编辑技术员' : '新增技术员'}</h3>
            <div className="space-y-3">
              <input className="input" placeholder="姓名 *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              <div className="grid grid-cols-2 gap-2">
                <input className="input" placeholder="电话" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                <input className="input" placeholder="邮箱" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <input className="input" placeholder="专长 (逗号分隔)" value={form.specialties} onChange={e => setForm({ ...form, specialties: e.target.value })} />
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <button className="btn btn-ghost" onClick={() => setShowForm(false)}>取消</button>
              <button className="btn btn-primary" onClick={save} disabled={!form.name}>保存</button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Form Modal */}
      {showSchedule && (
        <div className="modal-backdrop" onClick={() => setShowSchedule(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold mb-4">添加排班</h3>
            <div className="space-y-3">
              <select className="select w-full" value={scheduleForm.technician_id} onChange={e => setScheduleForm({ ...scheduleForm, technician_id: Number(e.target.value) })}>
                <option value={0}>选择技术员...</option>
                {technicians.map((t: Record<string, unknown>) => <option key={t.id as number} value={t.id as number}>{t.name as string}</option>)}
              </select>
              <input className="input" type="date" value={scheduleForm.scheduled_date} onChange={e => setScheduleForm({ ...scheduleForm, scheduled_date: e.target.value })} />
              <div className="grid grid-cols-2 gap-2">
                <input className="input" type="time" value={scheduleForm.start_time} onChange={e => setScheduleForm({ ...scheduleForm, start_time: e.target.value })} />
                <input className="input" type="time" value={scheduleForm.end_time} onChange={e => setScheduleForm({ ...scheduleForm, end_time: e.target.value })} />
              </div>
              <input className="input" placeholder="备注" value={scheduleForm.notes} onChange={e => setScheduleForm({ ...scheduleForm, notes: e.target.value })} />
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <button className="btn btn-ghost" onClick={() => setShowSchedule(false)}>取消</button>
              <button className="btn btn-primary" onClick={addSchedule} disabled={!scheduleForm.technician_id}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
