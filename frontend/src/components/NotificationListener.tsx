import { useEffect, useRef } from 'react'
import { useToast } from './Toast'

/**
 * WebSocket listener bridge — receives server-pushed notifications
 * and shows them as in-app toasts. Must be rendered inside <ToastProvider>.
 */
export default function NotificationListener() {
  const toast = useToast()
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    let stopped = false

    function connect() {
      if (stopped) return
      // Determine WebSocket URL from current page
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const url = `${proto}//${window.location.host}/ws/notifications`

      try {
        const ws = new WebSocket(url)
        wsRef.current = ws

        ws.onopen = () => {
          console.debug('[WS] Connected to notification stream')
        }

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.type === 'notification') {
              toast.success(`${data.title} — ${data.body}`)
            }
          } catch {
            // ignore malformed messages
          }
        }

        ws.onclose = () => {
          if (!stopped) {
            // Reconnect after 3 seconds
            reconnectTimer.current = setTimeout(connect, 3000)
          }
        }

        ws.onerror = () => {
          ws.close() // triggers onclose → reconnect
        }
      } catch {
        // WebSocket not available — retry later
        if (!stopped) {
          reconnectTimer.current = setTimeout(connect, 5000)
        }
      }
    }

    connect()

    return () => {
      stopped = true
      clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
    }
  }, [toast])

  // This component renders nothing — it's purely a side-effect bridge
  return null
}
