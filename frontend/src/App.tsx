import { useState, Suspense, lazy, useEffect } from 'react'
import {
  LayoutDashboard, Users, Building2, Truck, Package,
  FileText, ShoppingCart, FileCheck, Ship,
  Wrench, RotateCcw, UserCog, BookOpen,
  Landmark, BarChart3, Menu, X, LogOut,
} from 'lucide-react'
import { ToastProvider } from './components/Toast'
import LoginScreen from './components/LoginScreen'

const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const CustomersPage = lazy(() => import('./pages/CustomersPage'))
const SuppliersPage = lazy(() => import('./pages/SuppliersPage'))
const ForwardersPage = lazy(() => import('./pages/ForwardersPage'))
const ProductsPage = lazy(() => import('./pages/ProductsPage'))
const QuotationsPage = lazy(() => import('./pages/QuotationsPage'))
const OrdersPage = lazy(() => import('./pages/OrdersPage'))
const ContractsPage = lazy(() => import('./pages/ContractsPage'))
const LogisticsPage = lazy(() => import('./pages/LogisticsPage'))
const TicketsPage = lazy(() => import('./pages/TicketsPage'))
const RMAPage = lazy(() => import('./pages/RMAPage'))
const TechniciansPage = lazy(() => import('./pages/TechniciansPage'))
const KnowledgePage = lazy(() => import('./pages/KnowledgePage'))
const FinancePage = lazy(() => import('./pages/FinancePage'))
const BossPage = lazy(() => import('./pages/BossPage'))

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-3 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
    </div>
  )
}

type NavItem = {
  key: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}

const nav: NavItem[] = [
  { key: 'dashboard', label: '工作台', icon: LayoutDashboard, color: '#6366f1' },
  { key: 'customers', label: '客户', icon: Users, color: '#3b82f6' },
  { key: 'suppliers', label: '供应商', icon: Building2, color: '#10b981' },
  { key: 'forwarders', label: '货代', icon: Truck, color: '#f59e0b' },
  { key: 'products', label: '产品', icon: Package, color: '#8b5cf6' },
  { key: 'quotations', label: '报价', icon: FileText, color: '#f97316' },
  { key: 'orders', label: '订单', icon: ShoppingCart, color: '#ef4444' },
  { key: 'contracts', label: '合同', icon: FileCheck, color: '#06b6d4' },
  { key: 'logistics', label: '物流', icon: Ship, color: '#3b82f6' },
  { key: 'tickets', label: '售后工单', icon: Wrench, color: '#ec4899' },
  { key: 'rma', label: 'RMA退货', icon: RotateCcw, color: '#f97316' },
  { key: 'technicians', label: '技术员', icon: UserCog, color: '#22c55e' },
  { key: 'knowledge', label: '知识库', icon: BookOpen, color: '#a855f7' },
  { key: 'finance', label: '财务', icon: Landmark, color: '#64748b' },
  { key: 'boss', label: 'Boss看板', icon: BarChart3, color: '#0f172a' },
]

export default function App() {
  const [active, setActive] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [authenticated, setAuthenticated] = useState<boolean | null>(null) // null = checking

  useEffect(() => {
    fetch('/api/health')
      .then(r => r.json())
      .then(d => setAuthenticated(d.authenticated === true))
      .catch(() => setAuthenticated(false))
  }, [])

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' })
    setAuthenticated(false)
  }

  // ── Not authenticated: show login ──
  if (authenticated === false) {
    return <LoginScreen onLogin={() => setAuthenticated(true)} />
  }

  // ── Checking auth: show spinner ──
  if (authenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-3 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
      </div>
    )
  }

  const renderPage = () => {
    const fallback = <Spinner />
    switch (active) {
      case 'dashboard': return <Suspense fallback={fallback}><DashboardPage /></Suspense>
      case 'customers': return <Suspense fallback={fallback}><CustomersPage /></Suspense>
      case 'suppliers': return <Suspense fallback={fallback}><SuppliersPage /></Suspense>
      case 'forwarders': return <Suspense fallback={fallback}><ForwardersPage /></Suspense>
      case 'products': return <Suspense fallback={fallback}><ProductsPage /></Suspense>
      case 'quotations': return <Suspense fallback={fallback}><QuotationsPage /></Suspense>
      case 'orders': return <Suspense fallback={fallback}><OrdersPage /></Suspense>
      case 'contracts': return <Suspense fallback={fallback}><ContractsPage /></Suspense>
      case 'logistics': return <Suspense fallback={fallback}><LogisticsPage /></Suspense>
      case 'tickets': return <Suspense fallback={fallback}><TicketsPage /></Suspense>
      case 'rma': return <Suspense fallback={fallback}><RMAPage /></Suspense>
      case 'technicians': return <Suspense fallback={fallback}><TechniciansPage /></Suspense>
      case 'knowledge': return <Suspense fallback={fallback}><KnowledgePage /></Suspense>
      case 'finance': return <Suspense fallback={fallback}><FinancePage /></Suspense>
      case 'boss': return <Suspense fallback={fallback}><BossPage /></Suspense>
      default: return <DashboardPage />
    }
  }

  return (
    <ToastProvider>
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-60 bg-white border-r border-slate-200
        flex flex-col transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">进</div>
          <div>
            <h1 className="text-base font-bold text-slate-800">进贸通</h1>
            <p className="text-[10px] text-slate-400">TradeHub</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {nav.map((item) => {
            const Icon = item.icon
            const isActive = active === item.key
            return (
              <button
                key={item.key}
                onClick={() => { setActive(item.key); setSidebarOpen(false) }}
                className={`
                  w-full flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-colors text-left
                  ${isActive ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600' : 'text-slate-600 hover:bg-slate-50'}
                `}
              >
                <Icon className="w-4 h-4" style={{ color: isActive ? item.color : undefined }} />
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">TradeHub v1.0</span>
          <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 transition-colors" title="退出登录">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-slate-200 px-4 lg:px-6 py-3 flex items-center justify-between">
          <button className="lg:hidden btn btn-ghost btn-sm" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="text-sm font-medium text-slate-700">
            {nav.find(n => n.key === active)?.label || '进贸通'}
          </div>
          <div className="w-8" />{/* spacer */}
        </header>

        <div className="p-4 lg:p-6">
          {renderPage()}
        </div>
      </main>
    </div>
    </ToastProvider>
  )
}
