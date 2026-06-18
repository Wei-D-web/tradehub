import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { TrendingUp, TrendingDown, ShoppingCart, Users, Wrench, AlertTriangle, Shield, Presentation } from 'lucide-react'
import type { CertAlerts } from '../types'

export default function DashboardPage() {
  const [kpi, setKpi] = useState<Record<string, number>>({})
  const [trend, setTrend] = useState<Array<Record<string, unknown>>>([])
  const [recent, setRecent] = useState<Array<Record<string, unknown>>>([])
  const [certAlerts, setCertAlerts] = useState<CertAlerts | null>(null)
  const [expoSummary, setExpoSummary] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    api.dashboard.kpi().then(setKpi).catch(() => {})
    api.dashboard.trend(6).then(d => setTrend(d as Array<Record<string, unknown>>)).catch(() => {})
    api.dashboard.recent(8).then(setRecent).catch(() => {})
    api.dashboard.certAlerts(90).then(d => setCertAlerts(d as CertAlerts)).catch(() => {})
    api.dashboard.exhibitionSummary().then(d => setExpoSummary(d as Record<string, unknown>)).catch(() => {})
  }, [])

  const formatMoney = (v: number) => {
    if (Math.abs(v) >= 10000) return `${(v / 10000).toFixed(1)}万`
    return v.toLocaleString()
  }

  const cards = [
    { label: '总订单', value: kpi.total_orders || 0, icon: ShoppingCart, color: '#3b82f6', bg: '#eff6ff' },
    { label: '活跃订单', value: kpi.active_orders || 0, icon: TrendingUp, color: '#f59e0b', bg: '#fffbeb' },
    { label: '客户数', value: kpi.total_customers || 0, icon: Users, color: '#10b981', bg: '#ecfdf5' },
    { label: '总收入', value: `¥${formatMoney(kpi.total_revenue || 0)}`, icon: TrendingUp, color: '#6366f1', bg: '#eef2ff' },
    { label: '净利润', value: `¥${formatMoney(kpi.total_profit || 0)}`, icon: TrendingDown, color: '#22c55e', bg: '#f0fdf4' },
    { label: '待处理工单', value: kpi.open_tickets || 0, icon: Wrench, color: '#ec4899', bg: '#fdf2f8' },
    { label: '逾期发票', value: kpi.overdue_invoices || 0, icon: AlertTriangle, color: '#ef4444', bg: '#fef2f2' },
  ]

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">工作台</h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        {cards.map(c => {
          const Icon = c.icon
          return (
            <div key={c.label} className="card p-4" style={{ background: c.bg }}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4" style={{ color: c.color }} />
                <span className="text-xs text-slate-500">{c.label}</span>
              </div>
              <div className="text-xl font-bold" style={{ color: c.color }}>{c.value}</div>
            </div>
          )
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Trend */}
        <div className="card p-5">
          <h3 className="font-semibold mb-3 text-sm text-slate-600">月度趋势</h3>
          <div className="space-y-2">
            {(trend as Array<{ month: string; revenue: number; profit: number }>).map(t => {
              const max = Math.max(...(trend as Array<{ revenue: number }>).map(x => x.revenue), 1)
              return (
                <div key={t.month} className="flex items-center gap-3 text-xs">
                  <span className="w-16 text-slate-500">{t.month.slice(5)}月</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-5 relative overflow-hidden">
                    <div className="absolute inset-y-0 left-0 bg-blue-500 rounded-full transition-all"
                      style={{ width: `${(t.revenue / max) * 100}%` }} />
                  </div>
                  <span className="w-16 text-right font-medium">¥{formatMoney(t.revenue)}</span>
                  <span className={`w-12 text-right ${t.profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    ¥{formatMoney(t.profit)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card p-5">
          <h3 className="font-semibold mb-3 text-sm text-slate-600">最近动态</h3>
          <div className="space-y-2">
            {recent.map((a: Record<string, unknown>, i: number) => (
              <div key={i} className="flex items-center gap-3 text-sm py-1.5 border-b border-slate-50 last:border-0">
                <span className={`badge ${a.type === 'order' ? 'badge-sent' : 'badge-in_progress'}`}>
                  {a.type === 'order' ? '订单' : '工单'}
                </span>
                <span className="flex-1 text-slate-700">{a.title as string}</span>
                <span className={`badge badge-${(a.status as string)}`}>{(a.status as string)}</span>
                <span className="text-xs text-slate-400">{(a.time as string)?.slice(0, 16) || ''}</span>
              </div>
            ))}
            {recent.length === 0 && <p className="text-slate-400 text-sm py-4 text-center">暂无数据</p>}
          </div>
        </div>
      </div>

      {/* Certification Alerts */}
      {certAlerts && (certAlerts.total > 0) && (
        <div className="mt-6">
          <h3 className="font-semibold mb-3 text-sm text-slate-600 flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-500" />认证证书预警
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <div className="card p-3" style={{background: '#fef2f2'}}>
              <div className="text-xs text-red-500 mb-1">已过期</div>
              <div className="text-xl font-bold text-red-600">{certAlerts.expired}</div>
            </div>
            <div className="card p-3" style={{background: '#fff7ed'}}>
              <div className="text-xs text-orange-500 mb-1">30天内到期</div>
              <div className="text-xl font-bold text-orange-600">{certAlerts.expiring_30}</div>
            </div>
            <div className="card p-3" style={{background: '#fffbeb'}}>
              <div className="text-xs text-amber-500 mb-1">60天内到期</div>
              <div className="text-xl font-bold text-amber-600">{certAlerts.expiring_60}</div>
            </div>
            <div className="card p-3" style={{background: '#fefce8'}}>
              <div className="text-xs text-yellow-500 mb-1">90天内到期</div>
              <div className="text-xl font-bold text-yellow-600">{certAlerts.expiring_90}</div>
            </div>
          </div>
          {certAlerts.recent_items.length > 0 && (
            <div className="card p-3">
              <div className="text-xs text-slate-400 mb-2">即将到期/已过期证书</div>
              <div className="space-y-1">
                {certAlerts.recent_items.slice(0, 5).map(item => (
                  <div key={item.id} className="flex items-center gap-2 text-xs py-1 border-b border-slate-50 last:border-0">
                    <span className={item.status === 'expired' ? 'text-red-500' : 'text-amber-500'}>
                      {item.status === 'expired' ? '●' : '○'}
                    </span>
                    <span className="text-slate-700 flex-1">{item.product_name} ({item.cert_type})</span>
                    <span className={item.days_left < 0 ? 'text-red-500' : 'text-amber-500'}>
                      {item.days_left < 0 ? `过期${Math.abs(item.days_left)}天` : `剩余${item.days_left}天`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Exhibition Summary */}
      {expoSummary && ((expoSummary.total_exhibitions as number) > 0) && (
        <div className="mt-6">
          <h3 className="font-semibold mb-3 text-sm text-slate-600 flex items-center gap-2">
            <Presentation className="w-4 h-4 text-blue-500" />展会概览
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="card p-3 text-center">
              <div className="text-xs text-slate-400">参展场次</div>
              <div className="text-lg font-bold text-indigo-600">{expoSummary.total_exhibitions as number}</div>
            </div>
            <div className="card p-3 text-center">
              <div className="text-xs text-slate-400">展会线索</div>
              <div className="text-lg font-bold text-blue-600">{expoSummary.exhibition_leads as number}</div>
            </div>
            <div className="card p-3 text-center">
              <div className="text-xs text-slate-400">赢单数</div>
              <div className="text-lg font-bold text-green-600">{expoSummary.won_leads as number}</div>
            </div>
            <div className="card p-3 text-center">
              <div className="text-xs text-slate-400">转化率</div>
              <div className="text-lg font-bold text-amber-600">{expoSummary.conversion_rate as string}</div>
            </div>
            <div className="card p-3 text-center">
              <div className="text-xs text-slate-400">线索成本</div>
              <div className="text-lg font-bold text-slate-600">¥{expoSummary.cost_per_lead_cny as number}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
