import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react'
import { CheckCircle, XCircle, AlertTriangle, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning'

interface Toast {
  id: number
  type: ToastType
  message: string
}

interface ToastContextValue {
  success: (msg: string) => void
  error: (msg: string) => void
  warning: (msg: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

let nextId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const add = useCallback((type: ToastType, message: string) => {
    const id = nextId++
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }, [])

  const value: ToastContextValue = useMemo(() => ({
    success: (msg: string) => add('success', msg),
    error: (msg: string) => add('error', msg),
    warning: (msg: string) => add('warning', msg),
  }), [add])

  const icon = (type: ToastType) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'error': return <XCircle className="w-5 h-5 text-red-500" />
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />
    }
  }

  const bg = (type: ToastType) => {
    switch (type) {
      case 'success': return 'border-green-200 bg-green-50'
      case 'error': return 'border-red-200 bg-red-50'
      case 'warning': return 'border-amber-200 bg-amber-50'
    }
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast container */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${bg(t.type)}`}>
            {icon(t.type)}
            <span className="flex-1 text-sm">{t.message}</span>
            <button className="text-slate-400 hover:text-slate-600" onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}>
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
