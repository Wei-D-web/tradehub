import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import { useToast } from '../components/Toast'
import type { PricingInsight, CustomerPricingDetail, ProductComparison } from '../types'
import { TIER_CONFIG } from '../types'
import {
  Search, Filter, X, Eye, RefreshCw, Loader2, TrendingUp,
  DollarSign, Package, ChevronRight, BarChart3,
} from 'lucide-react'

export default function PricingPage() {
  const toast = useToast()
  const [insights, setInsights] = useState<PricingInsight[]>([])
  const [search, setSearch] = useState('')
  const [tierFilter, setTierFilter] = useState('')
  const [industryFilter, setIndustryFilter] = useState('')
  const [loading, setLoading] = useState(true)

  // Detail panel
  const [detail, setDetail] = useState<CustomerPricingDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api.pricing.insights(tierFilter, industryFilter, search) as PricingInsight[]
      setInsights(d)
    } catch {
      toast.error('加载定价分析失败')
    } finally {
      setLoading(false)
    }
  }, [search, tierFilter, industryFilter, toast])

  useEffect(() => { load() }, [load])

  const openDetail = async (ci: PricingInsight) => {
    setDetailLoading(true)
    try {
      const d = await api.pricing.customer(ci.customer_id) as CustomerPricingDetail
      setDetail(d)
    } catch {
      toast.error('加载客户定价详情失败')
    } finally {
      setDetailLoading(false)
    }
  }

  const getTierBadge = (tier: string) => {
    const config = TIER_CONFIG[tier] || TIER_CONFIG.unknown
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.badgeClass}`}>
        {config.label}
      </span>
    )
  }

  const getRatioColor = (ratio: number) =>
    ratio > 1.1 ? 'text-green-600' : ratio < 0.9 ? 'text-orange-600' : 'text-slate-600'

  const formatPct = (n: number) => `${(n * 100).toFixed(1)}%`
  const formatScore = (s: number | null) => s !== null ? s.toFixed(0) : '-'

  // Stats
  const analyzedCount = insights.filter(i => i.price_tier !== 'unknown').length
  const premiumCount = insights.filter(i => i.price_tier === 'premium').length
  const standardCount = insights.filter(i => i.price_tier === 'standard').length
  const valueCount = insights.filter(i => i.price_tier === 'value').length

  return (
    <div className="page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">定价分析</h1>
          <p className="text-sm text-slate-500 mt-1">
            基于历史报价数据自动分析客户价格耐受度
            · {analyzedCount} 位客户已分析
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card !p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
            <TrendingUp size={20} className="text-green-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">高溢价客户</p>
            <p className="text-xl font-bold text-green-700">{premiumCount}</p>
          </div>
        </div>
        <div className="card !p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
            <BarChart3 size={20} className="text-yellow-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">标准客户</p>
            <p className="text-xl font-bold text-yellow-700">{standardCount}</p>
          </div>
        </div>
        <div className="card !p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
            <DollarSign size={20} className="text-orange-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">价格敏感客户</p>
            <p className="text-xl font-bold text-orange-700">{valueCount}</p>
          </div>
        </div>
        <div className="card !p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
            <Package size={20} className="text-slate-500" />
          </div>
          <div>
            <p className="text-xs text-slate-500">待分析</p>
            <p className="text-xl font-bold text-slate-600">
              {insights.length - analyzedCount}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="搜索客户名称..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input w-[140px]"
          value={tierFilter}
          onChange={e => setTierFilter(e.target.value)}
        >
          <option value="">全部等级</option>
          <option value="premium">高溢价</option>
          <option value="standard">中等</option>
          <option value="value">低溢价</option>
        </select>
        <input
          className="input w-[160px]"
          placeholder="行业筛选..."
          value={industryFilter}
          onChange={e => setIndustryFilter(e.target.value)}
        />
        {((search || tierFilter || industryFilter)) && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => { setSearch(''); setTierFilter(''); setIndustryFilter('') }}
          >
            <X size={14} /> 清除
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <Loader2 size={28} className="animate-spin mr-3" />
            正在分析定价数据...
          </div>
        ) : insights.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <TrendingUp size={48} className="mb-3 text-slate-300" />
            <p className="text-sm font-medium mb-1">
              {search || tierFilter || industryFilter ? '没有匹配的客户' : '暂无报价数据'}
            </p>
            <p className="text-xs">
              {search || tierFilter || industryFilter
                ? '请调整筛选条件'
                : '完成客户报价并接受后，系统会自动分析客户定价偏好'}
            </p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>客户名称</th>
                <th>价格等级</th>
                <th>耐受度评分</th>
                <th>价格比</th>
                <th>平均利润率</th>
                <th>样本量</th>
                <th>行业</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {insights.map(i => (
                <tr
                  key={i.customer_id}
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => openDetail(i)}
                >
                  <td>
                    <span className="font-medium text-slate-900">{i.customer_name}</span>
                  </td>
                  <td>{getTierBadge(i.price_tier)}</td>
                  <td>
                    {i.price_tolerance_score !== null ? (
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${i.price_tolerance_score}%`,
                              backgroundColor:
                                i.price_tolerance_score >= 70 ? '#22c55e' :
                                i.price_tolerance_score >= 40 ? '#eab308' : '#f97316',
                            }}
                          />
                        </div>
                        <span className="text-xs font-mono text-slate-500">{formatScore(i.price_tolerance_score)}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs">-</span>
                    )}
                  </td>
                  <td className={`font-mono text-sm ${getRatioColor(i.price_ratio)}`}>
                    {i.price_ratio.toFixed(2)}x
                  </td>
                  <td className="font-mono text-sm">
                    {formatPct(i.avg_margin)}
                  </td>
                  <td className="text-xs text-slate-500">
                    {i.sample_size > 0
                      ? `${i.sample_size} 条报价`
                      : '-'}
                  </td>
                  <td className="text-xs text-slate-500 max-w-[120px] truncate">
                    {i.industry_tags || '-'}
                  </td>
                  <td>
                    <ChevronRight size={16} className="text-slate-300" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail slide-over */}
      {detail && (
        <div className="slide-overlay" onClick={() => setDetail(null)}>
          <div
            className="slide-panel"
            onClick={e => e.stopPropagation()}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-bold">{detail.customer_name}</h3>
                  {getTierBadge(detail.price_tier)}
                </div>
                <p className="text-xs text-slate-500">
                  基于 {detail.sample_size} 条报价 · {detail.total_orders} 笔订单分析
                </p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setDetail(null)}>
                <X size={18} />
              </button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={24} className="animate-spin text-slate-400" />
              </div>
            ) : (
              <>
                {/* KPI row */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-slate-500 mb-1">价格耐受度</p>
                    <p className="text-xl font-bold text-slate-900">
                      {detail.price_tolerance_score !== null ? detail.price_tolerance_score.toFixed(0) : '-'}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-slate-500 mb-1">价格比</p>
                    <p className={`text-xl font-bold ${getRatioColor(detail.price_ratio)}`}>
                      {detail.price_ratio.toFixed(2)}x
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-slate-500 mb-1">平均利润率</p>
                    <p className="text-xl font-bold text-slate-900">
                      {formatPct(detail.avg_margin)}
                    </p>
                  </div>
                </div>

                {/* Product comparison table */}
                {detail.product_comparisons.length > 0 ? (
                  <>
                    <h4 className="text-sm font-semibold text-slate-700 mb-3">
                      产品价格对比（客户价 vs 市场均价）
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="table text-sm">
                        <thead>
                          <tr>
                            <th>产品</th>
                            <th>客户单价</th>
                            <th>市场均价</th>
                            <th>溢价比</th>
                            <th>数量</th>
                            <th>报价单</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.product_comparisons.map((pc: ProductComparison, idx: number) => (
                            <tr key={idx}>
                              <td className="font-medium">{pc.product_name}</td>
                              <td className="font-mono">¥{pc.customer_price.toLocaleString()}</td>
                              <td className="font-mono text-slate-500">¥{pc.market_avg_price.toLocaleString()}</td>
                              <td className={`font-mono font-medium ${getRatioColor(pc.ratio)}`}>
                                {pc.ratio > 1 ? '↑' : pc.ratio < 1 ? '↓' : '·'} {pc.ratio.toFixed(2)}x
                              </td>
                              <td className="text-slate-500">{pc.quantity}</td>
                              <td className="text-xs text-slate-400 max-w-[160px] truncate">
                                {pc.quotation_title}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-10 text-slate-400 text-sm">
                    暂无产品价格对比数据
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
