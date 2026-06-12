import { useState } from 'react'
import { Lock, Loader2 } from 'lucide-react'

export default function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        onLogin()
      } else {
        const data = await res.json().catch(() => ({ detail: '登录失败' }))
        setError(data.detail || '密码错误')
      }
    } catch {
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
            <span className="text-white text-2xl font-bold">进</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">进贸通 TradeHub</h1>
          <p className="text-sm text-slate-400 mt-1">进口贸易全流程管理系统</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-600">请输入访问密码</span>
          </div>

          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError('') }}
            placeholder="输入密码"
            className="input mb-3"
            autoFocus
            disabled={loading}
          />

          {error && (
            <p className="text-sm text-red-500 mb-3">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="btn btn-primary w-full justify-center py-2.5"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            进入系统
          </button>
        </form>

        <p className="text-center text-xs text-slate-300 mt-6">
          TradeHub v1.0 · 小公司自用版
        </p>
      </div>
    </div>
  )
}
