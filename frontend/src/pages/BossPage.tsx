import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { BarChart3, TrendingUp, DollarSign, ShoppingCart } from 'lucide-react'

export default function BossPage() {
  const [kpi, setKpi] = useState<Record<string, number>>({})
  const [trend, setTrend] = useState<Array<Record<string, unknown>>>([])
  const [statusDist, setStatusDist] = useState<Array<Record<string, unknown>>>([])

  useEffect(() => {
    api.dashboard.kpi().then(d => setKpi(d as Record<string, number>)).catch(() => {})
    api.dashboard.trend(12).then(d => setTrend(d as Array<Record<string, unknown>>)).catch(() => {})
    api.dashboard.orderStatus().then(d => setStatusDist(d as Array<Record<string, unknown>>)).catch(() => {})
  }, [])

  const formatMoney = (v: number) => {
    if (Math.abs(v) >= 1000000) return `${(v / 1000000).toFixed(1)}M`
    if (Math.abs(v) >= 10000) return `${(v / 10000).toFixed(1)}万`
    return v.toLocaleString()
  }

  const STATUS_LABELS: Record<string, string> = {
    inquiry: '询价', quoted: '报价', ordered: '下单',
    shipped: '发货', customs: '清关', delivered: '交付', completed: '完成', cancelled: '取消',
  }

  const STATUS_COLORS: Record<string, string> = {
    inquiry: '#94a3b8', quoted: '#3b82f6', ordered: '#f59e0b', shipped: '#8b5cf6',
    customs: '#ec4899', delivered: '#6366f1', completed: '#22c55e', cancelled: '#ef4444',
  }

  const totalOrders = statusDist.reduce((sum, s) => sum + (s.count as number), 0)

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Boss看板</h2>

      {/* Big Numbers */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: '总收入', value: `¥${formatMoney(kpi.total_revenue || 0)}`, icon: DollarSign, color: '#3b82f6', bg: '#eff6ff' },
          { label: '净利润', value: `¥${formatMoney(kpi.total_profit || 0)}`, icon: TrendingUp, color: '#22c55e', bg: '#f0fdf4' },
          { label: '总订单', value: kpi.total_orders || 0, icon: ShoppingCart, color: '#f59e0b', bg: '#fffbeb' },
          { label: '活跃订单', value: kpi.active_orders || 0, icon: BarChart3, color: '#8b5cf6', bg: '#f5f3ff' },
        ].map(c => {
          const Icon = c.icon
          return (
            <div key={c.label} className="card p-5" style={{ background: c.bg }}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4" style={{ color: c.color }} />
                <span className="text-xs text-slate-500">{c.label}</span>
              </div>
              <div className="text-2xl font-bold" style={{ color: c.color }}>{c.value}</div>
            </div>
          )
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Yearly Trend */}
        <div className="card p-5">
          <h3 className="font-semibold mb-4 text-sm text-slate-600">12个月收入趋势</h3>
          <div className="space-y-2">
            {(trend as Array<{ month: string; revenue: number; profit: number; order_count: number }>).map(t => {
              const maxR = Math.max(...(trend as Array<{ revenue: number }>).map(x => x.revenue), 1)
              return (
                <div key={t.month} className="flex items-center gap-2 text-xs">
                  <span className="w-16 text-slate-500 shrink-0">{t.month}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-5 relative overflow-hidden">
                    <div className="absolute inset-y-0 left-0 bg-blue-500 rounded-full flex items-center justify-end pr-1 text-white text-[10px]"
                      style={{ width: `${Math.max((t.revenue / maxR) * 100, 2)}%` }}>
                      {t.revenue > 0 ? `¥${formatMoney(t.revenue)}` : ''}
                    </div>
                  </div>
                  <span className={`w-10 text-right ${t.profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {t.profit !== 0 ? `¥${formatMoney(t.profit)}` : ''}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Order Status Distribution */}
        <div className="card p-5">
          <h3 className="font-semibold mb-4 text-sm text-slate-600">订单状态分布</h3>
          <div className="space-y-3">
            {statusDist.map((s: Record<string, unknown>) => {
              const pct = totalOrders > 0 ? ((s.count as number) / totalOrders) * 100 : 0
              return (
                <div key={s.status as string}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{STATUS_LABELS[s.status as string] || (s.status as string)}</span>
                    <span className="font-medium">{s.count as number} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{
                      width: `${pct}%`,
                      background: STATUS_COLORS[s.status as string] || '#94a3b8',
                    }} />
                  </div>
                </div>
              )
            })}
            {statusDist.length === 0 && <p className="text-slate-400 text-sm">暂无数据</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
