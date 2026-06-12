import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { Plus, Trash2 } from 'lucide-react'

export default function FinancePage() {
  const [invoices, setInvoices] = useState<Array<Record<string, unknown>>>([])
  const [payments, setPayments] = useState<Array<Record<string, unknown>>>([])
  const [profit, setProfit] = useState<Record<string, unknown>>({})
  const [tab, setTab] = useState<'invoices' | 'payments' | 'profit'>('invoices')
  const [showInvForm, setShowInvForm] = useState(false)
  const [showPayForm, setShowPayForm] = useState(false)
  const [invForm, setInvForm] = useState({ order_id: 0, type: 'sales', amount: 0, currency: 'CNY', issue_date: new Date().toISOString().slice(0, 10), due_date: '', status: 'issued' })
  const [payForm, setPayForm] = useState({ invoice_id: 0, order_id: 0, amount: 0, currency: 'CNY', method: 'bank_transfer', reference_no: '' })

  const loadInvoices = () => api.finance.invoices.list().then(d => setInvoices(d as Array<Record<string, unknown>>)).catch(() => {})
  const loadPayments = () => api.finance.payments.list().then(d => setPayments(d as Array<Record<string, unknown>>)).catch(() => {})
  const loadProfit = () => api.finance.profit().then(d => setProfit(d as Record<string, unknown>)).catch(() => {})

  useEffect(() => { loadInvoices(); loadPayments(); loadProfit() }, [])

  const statusLabel = (s: string) => ({ issued: '已开出', paid: '已付款', overdue: '逾期', cancelled: '已取消' }[s] || s)

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">财务管理</h2>

      <div className="flex gap-0 border-b border-slate-200 mb-4">
        {[
          { key: 'invoices' as const, label: '发票' },
          { key: 'payments' as const, label: '收付款' },
          { key: 'profit' as const, label: '利润' },
        ].map(t => (
          <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {tab === 'invoices' && (
        <div>
          <div className="flex justify-end mb-3">
            <button className="btn btn-primary btn-sm" onClick={() => setShowInvForm(true)}><Plus className="w-3 h-3" />开发票</button>
          </div>
          <div className="card overflow-x-auto">
            <table className="table">
              <thead><tr><th>发票号</th><th>类型</th><th>金额</th><th>开出日期</th><th>到期日</th><th>状态</th><th>操作</th></tr></thead>
              <tbody>
                {invoices.map((inv: Record<string, unknown>) => (
                  <tr key={inv.id as number}>
                    <td className="font-mono text-sm">{inv.invoice_no as string}</td>
                    <td><span className="badge badge-sent">{inv.type === 'sales' ? '销售' : '采购'}</span></td>
                    <td className="font-bold">¥{(inv.amount as number).toLocaleString()}</td>
                    <td className="text-sm">{(inv.issue_date as string)}</td>
                    <td className="text-sm">{(inv.due_date as string) || '-'}</td>
                    <td><span className={`badge badge-${inv.status as string}`}>{statusLabel(inv.status as string)}</span></td>
                    <td>
                      <button className="btn btn-ghost btn-sm text-red-500" onClick={async () => { if (!confirm('确定删除？')) return; await api.finance.invoices.delete(inv.id as number); loadInvoices() }}><Trash2 className="w-3 h-3" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'payments' && (
        <div>
          <div className="flex justify-end mb-3">
            <button className="btn btn-primary btn-sm" onClick={() => setShowPayForm(true)}><Plus className="w-3 h-3" />记录付款</button>
          </div>
          <div className="card overflow-x-auto">
            <table className="table">
              <thead><tr><th>金额</th><th>方式</th><th>参考号</th><th>付款时间</th><th>操作</th></tr></thead>
              <tbody>
                {payments.map((p: Record<string, unknown>) => (
                  <tr key={p.id as number}>
                    <td className="font-bold">¥{(p.amount as number).toLocaleString()}</td>
                    <td>{p.method as string}</td>
                    <td className="text-sm">{p.reference_no as string || '-'}</td>
                    <td className="text-sm">{(p.paid_at as string)?.slice(0, 19)}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm text-red-500" onClick={async () => { if (!confirm('确定删除？')) return; await api.finance.payments.delete(p.id as number); loadPayments() }}><Trash2 className="w-3 h-3" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'profit' && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: '总收入', value: `¥${(profit.total_revenue as number || 0).toLocaleString()}`, color: '#3b82f6' },
              { label: '总成本', value: `¥${(profit.total_cost as number || 0).toLocaleString()}`, color: '#ef4444' },
              { label: '净利润', value: `¥${(profit.total_profit as number || 0).toLocaleString()}`, color: '#22c55e' },
              { label: '订单数', value: profit.order_count as number || 0, color: '#6366f1' },
            ].map(c => (
              <div key={c.label} className="card p-5 text-center">
                <div className="text-xs text-slate-500 mb-1">{c.label}</div>
                <div className="text-2xl font-bold" style={{ color: c.color }}>{c.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invoice Form Modal */}
      {showInvForm && (
        <div className="modal-backdrop" onClick={() => setShowInvForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold mb-4">开发票</h3>
            <div className="space-y-3">
              <input className="input" type="number" placeholder="金额" value={invForm.amount || ''} onChange={e => setInvForm({ ...invForm, amount: Number(e.target.value) })} />
              <div className="grid grid-cols-2 gap-2">
                <input className="input" type="date" value={invForm.issue_date} onChange={e => setInvForm({ ...invForm, issue_date: e.target.value })} />
                <input className="input" type="date" placeholder="到期日" value={invForm.due_date} onChange={e => setInvForm({ ...invForm, due_date: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <button className="btn btn-ghost" onClick={() => setShowInvForm(false)}>取消</button>
              <button className="btn btn-primary" onClick={async () => { await api.finance.invoices.create(invForm); setShowInvForm(false); loadInvoices() }}>保存</button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Form Modal */}
      {showPayForm && (
        <div className="modal-backdrop" onClick={() => setShowPayForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold mb-4">记录付款</h3>
            <div className="space-y-3">
              <input className="input" type="number" placeholder="发票ID" value={payForm.invoice_id || ''} onChange={e => setPayForm({ ...payForm, invoice_id: Number(e.target.value) })} />
              <input className="input" type="number" placeholder="金额" value={payForm.amount || ''} onChange={e => setPayForm({ ...payForm, amount: Number(e.target.value) })} />
              <div className="grid grid-cols-2 gap-2">
                <select className="select" value={payForm.method} onChange={e => setPayForm({ ...payForm, method: e.target.value })}>
                  <option value="bank_transfer">银行转账</option>
                  <option value="alipay">支付宝</option>
                  <option value="wechat">微信</option>
                  <option value="cash">现金</option>
                </select>
                <input className="input" placeholder="参考号" value={payForm.reference_no} onChange={e => setPayForm({ ...payForm, reference_no: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <button className="btn btn-ghost" onClick={() => setShowPayForm(false)}>取消</button>
              <button className="btn btn-primary" onClick={async () => { await api.finance.payments.create(payForm); setShowPayForm(false); loadPayments(); loadInvoices() }}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
