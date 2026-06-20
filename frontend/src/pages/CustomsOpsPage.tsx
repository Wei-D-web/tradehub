import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../lib/api'
import { useToast } from '../components/Toast'
import type { OpsJob, OpsJobForm, ContainerItem, ProductItem } from '../types'
import { TABLE_LABELS, JOB_STATUS_LABELS } from '../types'
import {
  Plus, Edit3, Trash2, Upload, FileText, Download, Ship,
  Package, Users, AlertTriangle, CheckCircle, X, Loader2,
  ArrowLeft, ArrowRight, FileOutput, ClipboardList,
} from 'lucide-react'

const EMPTY_CONTAINER: ContainerItem = {
  container_no: '', seal_no: '', container_type: '', is_soc: 'Carrier supplied', status: 'NOT EMPTY',
}

const EMPTY_PRODUCT: ProductItem = {
  seq: 1, description: '', hs_code: '', weight: 0, packages: 0,
  pkg_unit: 'BUNDLE', marks: 'N/M', undg: '', cus_code: '',
}

const EMPTY_FORM: OpsJobForm = {
  customer_name: '',
  vessel_name: '', voyage: '', customs_decl_no: '', booking_no: '',
  pol: '', pod: '', place_of_receipt: '', place_of_delivery: '',
  etd: '', carrier: '',
  shipper_code: '', shipper_name: '', shipper_address: '',
  shipper_country_code: '', shipper_phone: '', shipper_fax: '',
  shipper_email: '', shipper_aeo: '',
  consignee_code: '', consignee_name: '', consignee_address: '',
  consignee_country_code: '', consignee_phone: '', consignee_fax: '',
  consignee_email: '', consignee_aeo: '', consignee_contact_person: '', consignee_contact_phone: '',
  notifier_code: '', notifier_name: '', notifier_address: '',
  notifier_country_code: '', notifier_phone: '', notifier_fax: '',
  notifier_email: '', notifier_aeo: '',
  ics2_declaration_type: 'F15', ics2_member_state: '', mbl_no: '', hbl_no: '',
  mbl_total_weight: 0, hbl_total_weight: 0, imo: '', transit_countries: '',
  has_hbl: true, mbl_contract_no: '', hbl_contract_no: '',
  mbl_type: 'MASTER BILL OF LADING', hbl_type: 'HOUSE BILL OF LADING',
  payment_type: 'PAYMENT IN CASH', transport_mode: 'MARITIME TRANSPORT', container_mark: '集装箱',
  seller_eori: '', seller_name: '', seller_type: '', seller_country_code: '',
  seller_city: '', seller_street: '', seller_street_no: '', seller_postal_code: '', seller_po_box: '', seller_phone: '',
  buyer_eori: '', buyer_name: '', buyer_type: '', buyer_country_code: '',
  buyer_city: '', buyer_street: '', buyer_street_no: '', buyer_postal_code: '', buyer_po_box: '', buyer_phone: '',
  ics2_declarant_eori: '', ics2_declarant_name: '', ics2_declarant_country_code: '',
  ics2_declarant_city: '', ics2_declarant_street: '', ics2_declarant_street_no: '',
  ics2_declarant_postal_code: '', ics2_declarant_po_box: '', ics2_declarant_phone: '', ics2_declarant_email: '',
  containers: [], products: [],
  loading_date: '', warehouse_address: '', warehouse_phone: '', receiving_company: '',
  job_no_ref: '', container_seal_deadline: '', fm_department: '', cc_recipient: '',
  transit_port: '', container_type_qty: '',
  ens_contact_person: '', ens_contact_email: '', ens_contact_phone: '', ens_contact_fax: '',
  ens_marks: 'N/M', ens_goods_desc: '',
}

type Step = 'list' | 'fill' | 'download'

export default function CustomsOpsPage() {
  const toast = useToast()
  const [step, setStep] = useState<Step>('list')
  const [jobs, setJobs] = useState<OpsJob[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<OpsJob | null>(null)
  const [form, setForm] = useState<OpsJobForm>({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [genLoading, setGenLoading] = useState(false)
  const [genResult, setGenResult] = useState<Record<string, string | null>>({})
  const [genZip, setGenZip] = useState('')
  const [formTab, setFormTab] = useState('vessel')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadJobs = useCallback(() => {
    api.customsOps.list()
      .then(d => setJobs(d as OpsJob[]))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadJobs() }, [loadJobs])

  // ── Job list handlers ──
  const openNew = () => {
    setEditing(null)
    setForm({ ...EMPTY_FORM, ics2_declaration_type: 'F15', has_hbl: true })
    setStep('fill')
  }

  const openEdit = async (job: OpsJob) => {
    const full = await api.customsOps.get(job.id) as OpsJob
    setEditing(full)
    setForm({ ...full } as OpsJobForm)
    setStep('fill')
  }

  const save = async () => {
    if (!form.customer_name.trim()) { toast.error('请填写客户名称'); return }
    setSaving(true)
    try {
      if (editing) {
        await api.customsOps.update(editing.id, form as Record<string, unknown>)
      } else {
        await api.customsOps.create(form as Record<string, unknown>)
      }
      await loadJobs()
      setStep('list')
    } catch (e) { toast.error((e as Error).message) }
    finally { setSaving(false) }
  }

  const remove = async (id: number) => {
    if (!confirm('确定删除该任务？')) return
    await api.customsOps.delete(id)
    loadJobs()
  }

  // ── File upload ──
  const handleUpload = async (jobId: number, files: FileList) => {
    const fd = new FormData()
    Array.from(files).forEach(f => fd.append('files', f))
    try {
      await api.customsOps.upload(jobId, fd)
      toast.success('文件上传成功')
    } catch (e) { toast.error((e as Error).message) }
  }

  // ── Generate ──
  const generate = async () => {
    if (!editing) { toast.error('请先保存任务'); return }
    setGenLoading(true)
    try {
      const tables = ['ens', 'ics2', 'manifest', 'loading_notice']
      const res = await api.customsOps.generate(editing.id, tables) as { ok: boolean; tables: Record<string, string | null>; zip: string }
      setGenResult(res.tables)
      setGenZip(res.zip)
      setStep('download')
      toast.success('表格生成成功')
    } catch (e) { toast.error((e as Error).message) }
    finally { setGenLoading(false) }
  }

  // ── Render: Job List ──
  if (step === 'list') {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold">截关工具</h2>
            <p className="text-sm text-slate-400 mt-0.5">生成 ENS / ICS2 / 舱单 / 多品名 / 做箱通知</p>
          </div>
          <button className="btn btn-primary" onClick={openNew}>
            <Plus className="w-4 h-4" />新建截关任务
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
        ) : jobs.length === 0 ? (
          <div className="card py-16 text-center">
            <ClipboardList className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400">暂无截关任务</p>
            <button className="btn btn-primary mt-4" onClick={openNew}>创建第一个任务</button>
          </div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>任务编号</th><th>客户</th><th>船名/航次</th><th>ETD</th>
                  <th>提单号</th><th>状态</th><th>更新时间</th><th>操作</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map(j => (
                  <tr key={j.id}>
                    <td className="font-mono text-xs">{j.job_no}</td>
                    <td className="font-medium">{j.customer_name}</td>
                    <td className="text-sm">{j.vessel_name} / {j.voyage}</td>
                    <td className="text-sm">{j.etd}</td>
                    <td className="font-mono text-xs">{j.mbl_no || '-'}</td>
                    <td><span className={`badge badge-${j.status === 'generated' ? 'completed' : 'draft'}`}>{JOB_STATUS_LABELS[j.status] || j.status}</span></td>
                    <td className="text-xs text-slate-400">{j.updated_at?.slice(0, 16) || j.created_at?.slice(0, 16)}</td>
                    <td>
                      <div className="flex gap-1">
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(j)}><Edit3 className="w-3 h-3" /></button>
                        <button className="btn btn-ghost btn-sm text-red-500" onClick={() => remove(j.id)}><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  // ── Render: Fill Form ──
  if (step === 'fill') {
    const tabs = [
      { key: 'vessel', label: '船期信息', icon: Ship },
      { key: 'parties', label: '参与方', icon: Users },
      { key: 'cargo', label: '箱货明细', icon: Package },
      { key: 'ics2', label: 'ICS2', icon: FileText },
      { key: 'loading', label: '做箱通知', icon: Upload },
      { key: 'ens', label: 'ENS', icon: FileOutput },
    ]

    const upd = (k: keyof OpsJobForm, v: unknown) => setForm(f => ({ ...f, [k]: v }))

    return (
      <div>
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <button className="btn btn-ghost btn-sm" onClick={() => setStep('list')}>
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h2 className="text-xl font-bold">{editing ? '编辑截关任务' : '新建截关任务'}</h2>
          {editing && <span className="font-mono text-xs text-slate-400 ml-2">{editing.job_no}</span>}
        </div>

        {/* Tab bar */}
        <div className="flex gap-0 border-b border-slate-200 mb-4 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.key}
              className={`tab whitespace-nowrap ${formTab === t.key ? 'active' : ''}`}
              onClick={() => setFormTab(t.key)}
            >
              <t.icon className="w-3.5 h-3.5 inline mr-1" />{t.label}
            </button>
          ))}
        </div>

        {/* Tab: Vessel Info */}
        {formTab === 'vessel' && (
          <div className="card p-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs text-slate-400">客户名称 *</label>
                <input className="input w-full" value={form.customer_name} onChange={e => upd('customer_name', e.target.value)} placeholder="必填" /></div>
              <div><label className="text-xs text-slate-400">船公司</label>
                <input className="input w-full" value={form.carrier} onChange={e => upd('carrier', e.target.value)} placeholder="如 MSK, CMA, COSCO" /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs text-slate-400">船名</label>
                <input className="input w-full" value={form.vessel_name} onChange={e => upd('vessel_name', e.target.value)} /></div>
              <div><label className="text-xs text-slate-400">航次</label>
                <input className="input w-full" value={form.voyage} onChange={e => upd('voyage', e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs text-slate-400">关单号</label>
                <input className="input w-full" value={form.customs_decl_no} onChange={e => upd('customs_decl_no', e.target.value)} /></div>
              <div><label className="text-xs text-slate-400">订舱号 (Booking No.)</label>
                <input className="input w-full" value={form.booking_no} onChange={e => upd('booking_no', e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs text-slate-400">装货港 (POL)</label>
                <input className="input w-full" value={form.pol} onChange={e => upd('pol', e.target.value)} placeholder="如 CNSHA" /></div>
              <div><label className="text-xs text-slate-400">卸货港 (POD)</label>
                <input className="input w-full" value={form.pod} onChange={e => upd('pod', e.target.value)} placeholder="如 DEHAM" /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs text-slate-400">收货地</label>
                <input className="input w-full" value={form.place_of_receipt} onChange={e => upd('place_of_receipt', e.target.value)} /></div>
              <div><label className="text-xs text-slate-400">交货地</label>
                <input className="input w-full" value={form.place_of_delivery} onChange={e => upd('place_of_delivery', e.target.value)} /></div>
            </div>
            <div><label className="text-xs text-slate-400">ETD</label>
              <input className="input w-full" value={form.etd} onChange={e => upd('etd', e.target.value)} placeholder="如 2026-07-15" /></div>
          </div>
        )}

        {/* Tab: Parties */}
        {formTab === 'parties' && (
          <div className="space-y-3">
            {(['shipper', 'consignee', 'notifier'] as const).map(role => (
              <details key={role} className="card p-4" open={role === 'shipper'}>
                <summary className="font-medium text-sm cursor-pointer select-none">
                  {role === 'shipper' ? '🚢 发货人 (Shipper)' : role === 'consignee' ? '📦 收货人 (Consignee)' : '🔔 通知人 (Notifier)'}
                </summary>
                <div className="mt-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-xs text-slate-400">代码</label>
                      <input className="input w-full" value={(form as Record<string, unknown>)[`${role}_code`] as string} onChange={e => upd(`${role}_code` as keyof OpsJobForm, e.target.value)} /></div>
                    <div><label className="text-xs text-slate-400">国家代码</label>
                      <input className="input w-full" value={(form as Record<string, unknown>)[`${role}_country_code`] as string} onChange={e => upd(`${role}_country_code` as keyof OpsJobForm, e.target.value)} placeholder="如 CN, DE" /></div>
                  </div>
                  <div><label className="text-xs text-slate-400">名称</label>
                    <input className="input w-full" value={(form as Record<string, unknown>)[`${role}_name`] as string} onChange={e => upd(`${role}_name` as keyof OpsJobForm, e.target.value)} /></div>
                  <div><label className="text-xs text-slate-400">地址</label>
                    <input className="input w-full" value={(form as Record<string, unknown>)[`${role}_address`] as string} onChange={e => upd(`${role}_address` as keyof OpsJobForm, e.target.value)} /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-xs text-slate-400">电话</label>
                      <input className="input w-full" value={(form as Record<string, unknown>)[`${role}_phone`] as string} onChange={e => upd(`${role}_phone` as keyof OpsJobForm, e.target.value)} /></div>
                    <div><label className="text-xs text-slate-400">传真</label>
                      <input className="input w-full" value={(form as Record<string, unknown>)[`${role}_fax`] as string} onChange={e => upd(`${role}_fax` as keyof OpsJobForm, e.target.value)} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-xs text-slate-400">邮箱</label>
                      <input className="input w-full" value={(form as Record<string, unknown>)[`${role}_email`] as string} onChange={e => upd(`${role}_email` as keyof OpsJobForm, e.target.value)} /></div>
                    <div><label className="text-xs text-slate-400">AEO企业编码</label>
                      <input className="input w-full" value={(form as Record<string, unknown>)[`${role}_aeo`] as string} onChange={e => upd(`${role}_aeo` as keyof OpsJobForm, e.target.value)} /></div>
                  </div>
                  {role === 'consignee' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className="text-xs text-slate-400">具体联系人</label>
                        <input className="input w-full" value={form.consignee_contact_person} onChange={e => upd('consignee_contact_person', e.target.value)} /></div>
                      <div><label className="text-xs text-slate-400">联系人电话</label>
                        <input className="input w-full" value={form.consignee_contact_phone} onChange={e => upd('consignee_contact_phone', e.target.value)} /></div>
                    </div>
                  )}
                </div>
              </details>
            ))}
          </div>
        )}

        {/* Tab: Cargo */}
        {formTab === 'cargo' && (
          <div className="space-y-4">
            {/* Containers */}
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-sm">集装箱</h4>
                <button className="btn btn-ghost btn-sm" onClick={() => upd('containers', [...form.containers, { ...EMPTY_CONTAINER }])}>
                  <Plus className="w-3 h-3" />添加
                </button>
              </div>
              {form.containers.length === 0 && <p className="text-xs text-slate-400 py-3">暂无集装箱，点击添加</p>}
              {form.containers.map((c, i) => (
                <div key={i} className="grid grid-cols-6 gap-1 mb-2 items-end">
                  <div><label className="text-[10px] text-slate-400">箱号</label>
                    <input className="input w-full text-xs" value={c.container_no} onChange={e => {
                      const arr = [...form.containers]; arr[i] = { ...arr[i], container_no: e.target.value }; upd('containers', arr)
                    }} /></div>
                  <div><label className="text-[10px] text-slate-400">封号</label>
                    <input className="input w-full text-xs" value={c.seal_no} onChange={e => {
                      const arr = [...form.containers]; arr[i] = { ...arr[i], seal_no: e.target.value }; upd('containers', arr)
                    }} /></div>
                  <div><label className="text-[10px] text-slate-400">箱型</label>
                    <input className="input w-full text-xs" value={c.container_type} onChange={e => {
                      const arr = [...form.containers]; arr[i] = { ...arr[i], container_type: e.target.value }; upd('containers', arr)
                    }} placeholder="20GP" /></div>
                  <div>
                    <label className="text-[10px] text-slate-400">SOC</label>
                    <select className="select w-full text-xs" value={c.is_soc} onChange={e => {
                      const arr = [...form.containers]; arr[i] = { ...arr[i], is_soc: e.target.value }; upd('containers', arr)
                    }}>
                      <option value="Carrier supplied">Carrier</option>
                      <option value="Shipper supplied">Shipper</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">状态</label>
                    <select className="select w-full text-xs" value={c.status} onChange={e => {
                      const arr = [...form.containers]; arr[i] = { ...arr[i], status: e.target.value }; upd('containers', arr)
                    }}>
                      <option value="NOT EMPTY">NOT EMPTY</option>
                      <option value="EMPTY">EMPTY</option>
                    </select>
                  </div>
                  <button className="btn btn-ghost btn-sm text-red-400 self-end" onClick={() => {
                    upd('containers', form.containers.filter((_, idx) => idx !== i))
                  }}><Trash2 className="w-3 h-3" /></button>
                </div>
              ))}
            </div>

            {/* Products */}
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-sm">品名明细</h4>
                <button className="btn btn-ghost btn-sm" onClick={() => upd('products', [...form.products, { ...EMPTY_PRODUCT, seq: form.products.length + 1 }])}>
                  <Plus className="w-3 h-3" />添加品名
                </button>
              </div>
              {form.products.length === 0 && <p className="text-xs text-slate-400 py-3">暂无品名，点击添加</p>}
              {form.products.map((p, i) => (
                <div key={i} className="grid grid-cols-6 gap-1 mb-2 items-end">
                  <div><label className="text-[10px] text-slate-400">品名</label>
                    <input className="input w-full text-xs" value={p.description} onChange={e => {
                      const arr = [...form.products]; arr[i] = { ...arr[i], description: e.target.value }; upd('products', arr)
                    }} /></div>
                  <div><label className="text-[10px] text-slate-400">HS编码</label>
                    <input className="input w-full text-xs" value={p.hs_code} onChange={e => {
                      const arr = [...form.products]; arr[i] = { ...arr[i], hs_code: e.target.value }; upd('products', arr)
                    }} /></div>
                  <div><label className="text-[10px] text-slate-400">毛重(KGS)</label>
                    <input className="input w-full text-xs" type="number" value={p.weight || ''} onChange={e => {
                      const arr = [...form.products]; arr[i] = { ...arr[i], weight: Number(e.target.value) }; upd('products', arr)
                    }} /></div>
                  <div><label className="text-[10px] text-slate-400">件数</label>
                    <input className="input w-full text-xs" type="number" value={p.packages || ''} onChange={e => {
                      const arr = [...form.products]; arr[i] = { ...arr[i], packages: Number(e.target.value) }; upd('products', arr)
                    }} /></div>
                  <div><label className="text-[10px] text-slate-400">包装</label>
                    <input className="input w-full text-xs" value={p.pkg_unit} onChange={e => {
                      const arr = [...form.products]; arr[i] = { ...arr[i], pkg_unit: e.target.value }; upd('products', arr)
                    }} placeholder="BUNDLE" /></div>
                  <button className="btn btn-ghost btn-sm text-red-400 self-end" onClick={() => {
                    upd('products', form.products.filter((_, idx) => idx !== i))
                  }}><Trash2 className="w-3 h-3" /></button>
                  <div className="col-span-6 grid grid-cols-3 gap-1">
                    <div><label className="text-[10px] text-slate-400">唛头</label>
                      <input className="input w-full text-xs" value={p.marks} onChange={e => {
                        const arr = [...form.products]; arr[i] = { ...arr[i], marks: e.target.value }; upd('products', arr)
                      }} /></div>
                    <div><label className="text-[10px] text-slate-400">UNDG</label>
                      <input className="input w-full text-xs" value={p.undg} onChange={e => {
                        const arr = [...form.products]; arr[i] = { ...arr[i], undg: e.target.value }; upd('products', arr)
                      }} /></div>
                    <div><label className="text-[10px] text-slate-400">CusCode</label>
                      <input className="input w-full text-xs" value={p.cus_code} onChange={e => {
                        const arr = [...form.products]; arr[i] = { ...arr[i], cus_code: e.target.value }; upd('products', arr)
                      }} /></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab: ICS2 */}
        {formTab === 'ics2' && (
          <div className="card p-4 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div><label className="text-xs text-slate-400">申报类型</label>
                <select className="select w-full" value={form.ics2_declaration_type} onChange={e => upd('ics2_declaration_type', e.target.value)}>
                  <option value="F15">F15 (有HBL)</option>
                  <option value="F17">F17 (无HBL)</option>
                </select></div>
              <div><label className="text-xs text-slate-400">成员国</label>
                <input className="input w-full" value={form.ics2_member_state} onChange={e => upd('ics2_member_state', e.target.value)} placeholder="如 DE" /></div>
              <div><label className="text-xs text-slate-400">运输方式</label>
                <select className="select w-full" value={form.transport_mode} onChange={e => upd('transport_mode', e.target.value)}>
                  <option value="MARITIME TRANSPORT">海运</option>
                  <option value="RAIL TRANSPORT">铁路</option>
                  <option value="ROAD TRANSPORT">公路</option>
                  <option value="AIR TRANSPORT">空运</option>
                </select></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs text-slate-400">MBL提单号</label>
                <input className="input w-full" value={form.mbl_no} onChange={e => upd('mbl_no', e.target.value)} /></div>
              <div><label className="text-xs text-slate-400">HBL提单号</label>
                <input className="input w-full" value={form.hbl_no} onChange={e => upd('hbl_no', e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><label className="text-xs text-slate-400">MBL总重量</label>
                <input className="input w-full" type="number" value={form.mbl_total_weight || ''} onChange={e => upd('mbl_total_weight', Number(e.target.value))} /></div>
              <div><label className="text-xs text-slate-400">HBL总重量</label>
                <input className="input w-full" type="number" value={form.hbl_total_weight || ''} onChange={e => upd('hbl_total_weight', Number(e.target.value))} /></div>
              <div><label className="text-xs text-slate-400">IMO / 航次</label>
                <input className="input w-full" value={form.imo} onChange={e => upd('imo', e.target.value)} placeholder="IMO编号" /></div>
            </div>
            <div><label className="text-xs text-slate-400">途径国 (用 | 隔开)</label>
              <input className="input w-full" value={form.transit_countries} onChange={e => upd('transit_countries', e.target.value)} placeholder="如 CN|DE" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs text-slate-400">MBL提单类型</label>
                <input className="input w-full" value={form.mbl_type} onChange={e => upd('mbl_type', e.target.value)} /></div>
              <div><label className="text-xs text-slate-400">付款类型</label>
                <select className="select w-full" value={form.payment_type} onChange={e => upd('payment_type', e.target.value)}>
                  <option value="PAYMENT IN CASH">PAYMENT IN CASH</option>
                  <option value="PAYMENT BY CREDIT CARD">PAYMENT BY CREDIT CARD</option>
                  <option value="ELECTRONIC FUNDS TRANSFER">ELECTRONIC FUNDS TRANSFER</option>
                </select></div>
            </div>

            {/* ICS2 Declarant */}
            <details className="border rounded-lg p-3">
              <summary className="text-sm font-medium cursor-pointer">ICS2 申报方</summary>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <div><label className="text-[10px] text-slate-400">EORI</label>
                  <input className="input w-full text-xs" value={form.ics2_declarant_eori} onChange={e => upd('ics2_declarant_eori', e.target.value)} /></div>
                <div><label className="text-[10px] text-slate-400">名称</label>
                  <input className="input w-full text-xs" value={form.ics2_declarant_name} onChange={e => upd('ics2_declarant_name', e.target.value)} /></div>
                <div><label className="text-[10px] text-slate-400">国家</label>
                  <input className="input w-full text-xs" value={form.ics2_declarant_country_code} onChange={e => upd('ics2_declarant_country_code', e.target.value)} /></div>
                <div><label className="text-[10px] text-slate-400">城市</label>
                  <input className="input w-full text-xs" value={form.ics2_declarant_city} onChange={e => upd('ics2_declarant_city', e.target.value)} /></div>
                <div><label className="text-[10px] text-slate-400">街道</label>
                  <input className="input w-full text-xs" value={form.ics2_declarant_street} onChange={e => upd('ics2_declarant_street', e.target.value)} /></div>
                <div><label className="text-[10px] text-slate-400">门牌号</label>
                  <input className="input w-full text-xs" value={form.ics2_declarant_street_no} onChange={e => upd('ics2_declarant_street_no', e.target.value)} /></div>
                <div><label className="text-[10px] text-slate-400">邮编</label>
                  <input className="input w-full text-xs" value={form.ics2_declarant_postal_code} onChange={e => upd('ics2_declarant_postal_code', e.target.value)} /></div>
                <div><label className="text-[10px] text-slate-400">电话</label>
                  <input className="input w-full text-xs" value={form.ics2_declarant_phone} onChange={e => upd('ics2_declarant_phone', e.target.value)} /></div>
                <div><label className="text-[10px] text-slate-400">邮箱</label>
                  <input className="input w-full text-xs" value={form.ics2_declarant_email} onChange={e => upd('ics2_declarant_email', e.target.value)} /></div>
              </div>
            </details>
          </div>
        )}

        {/* Tab: Loading Notice */}
        {formTab === 'loading' && (
          <div className="card p-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs text-slate-400">致 (TO)</label>
                <input className="input w-full" value={form.receiving_company} onChange={e => upd('receiving_company', e.target.value)} placeholder="收货公司" /></div>
              <div><label className="text-xs text-slate-400">自 (FM)</label>
                <input className="input w-full" value={form.fm_department} onChange={e => upd('fm_department', e.target.value)} placeholder="部门/人员" /></div>
            </div>
            <div><label className="text-xs text-slate-400">抄送 (CC)</label>
              <input className="input w-full" value={form.cc_recipient} onChange={e => upd('cc_recipient', e.target.value)} /></div>
            <div><label className="text-xs text-slate-400">装箱日期</label>
              <input className="input w-full" value={form.loading_date} onChange={e => upd('loading_date', e.target.value)} placeholder="请填入A12单元格的日期" /></div>
            <div><label className="text-xs text-slate-400">装箱地址</label>
              <input className="input w-full" value={form.warehouse_address} onChange={e => upd('warehouse_address', e.target.value)} /></div>
            <div><label className="text-xs text-slate-400">联系电话</label>
              <input className="input w-full" value={form.warehouse_phone} onChange={e => upd('warehouse_phone', e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs text-slate-400">中转港</label>
                <input className="input w-full" value={form.transit_port} onChange={e => upd('transit_port', e.target.value)} /></div>
              <div><label className="text-xs text-slate-400">箱型/箱量</label>
                <input className="input w-full" value={form.container_type_qty} onChange={e => upd('container_type_qty', e.target.value)} placeholder="如 1×40HQ" /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs text-slate-400">JOB NO</label>
                <input className="input w-full" value={form.job_no_ref} onChange={e => upd('job_no_ref', e.target.value)} /></div>
              <div><label className="text-xs text-slate-400">箱封号截止</label>
                <input className="input w-full" value={form.container_seal_deadline} onChange={e => upd('container_seal_deadline', e.target.value)} /></div>
            </div>
          </div>
        )}

        {/* Tab: ENS */}
        {formTab === 'ens' && (
          <div className="card p-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs text-slate-400">单证联系人</label>
                <input className="input w-full" value={form.ens_contact_person} onChange={e => upd('ens_contact_person', e.target.value)} /></div>
              <div><label className="text-xs text-slate-400">Email</label>
                <input className="input w-full" value={form.ens_contact_email} onChange={e => upd('ens_contact_email', e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs text-slate-400">电话</label>
                <input className="input w-full" value={form.ens_contact_phone} onChange={e => upd('ens_contact_phone', e.target.value)} /></div>
              <div><label className="text-xs text-slate-400">传真</label>
                <input className="input w-full" value={form.ens_contact_fax} onChange={e => upd('ens_contact_fax', e.target.value)} /></div>
            </div>
            <div><label className="text-xs text-slate-400">唛头 (Marks)</label>
              <input className="input w-full" value={form.ens_marks} onChange={e => upd('ens_marks', e.target.value)} placeholder="N/M" /></div>
            <div><label className="text-xs text-slate-400">品名备注 (Description of Goods)</label>
              <textarea className="input w-full" rows={3} value={form.ens_goods_desc} onChange={e => upd('ens_goods_desc', e.target.value)}
                placeholder="品名 + HS备注 + S/Q" /></div>
          </div>
        )}

        {/* Bottom actions */}
        <div className="flex gap-2 mt-4 justify-between">
          <div className="flex gap-2">
            {editing && (
              <>
                {/* Upload button */}
                <button className="btn btn-ghost" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-4 h-4" />上传文件
                </button>
                <input ref={fileInputRef} type="file" multiple className="hidden"
                  accept=".pdf,.xlsx,.xls,.docx,.doc,.jpg,.jpeg,.png"
                  onChange={e => e.target.files && handleUpload(editing.id, e.target.files)} />
              </>
            )}
          </div>
          <div className="flex gap-2">
            <button className="btn btn-ghost" onClick={() => { setStep('list'); setEditing(null) }}>取消</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : '保存'}
            </button>
            {editing && (
              <button className="btn btn-primary" style={{ background: '#059669' }} onClick={generate} disabled={genLoading}>
                {genLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Download className="w-4 h-4" />生成表格</>}
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Render: Download ──
  if (step === 'download') {
    return (
      <div>
        <div className="flex items-center gap-3 mb-4">
          <button className="btn btn-ghost btn-sm" onClick={() => setStep('list')}>
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h2 className="text-xl font-bold">表格生成完成</h2>
        </div>

        <div className="card p-6 text-center mb-4">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold mb-2">截关表格已生成</h3>
          <p className="text-sm text-slate-400 mb-6">请下载后人工核对，确认无误后发送给订舱公司</p>

          <div className="grid grid-cols-2 gap-3 max-w-md mx-auto text-left">
            {Object.entries(TABLE_LABELS).map(([key, label]) => {
              const filename = genResult[key]
              if (!filename) return null
              return (
                <a key={key} href={editing ? api.customsOps.download(editing.id, filename) : '#'}
                  className="btn btn-ghost justify-start" download>
                  <Download className="w-4 h-4 text-blue-500" />{label}
                </a>
              )
            })}
          </div>

          <div className="mt-6">
            <a href={editing ? api.customsOps.downloadZip(editing.id) : '#'}
              className="btn btn-primary" download>
              <Download className="w-4 h-4" />一键下载全部 (ZIP)
            </a>
          </div>
        </div>

        <div className="flex gap-2 justify-center">
          <button className="btn btn-ghost" onClick={() => setStep('fill')}>
            <ArrowLeft className="w-4 h-4" />返回编辑
          </button>
          <button className="btn btn-primary" onClick={openNew}>
            <Plus className="w-4 h-4" />新建任务
          </button>
        </div>
      </div>
    )
  }

  return null
}
