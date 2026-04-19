'use client'
import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { Notification } from '@/types'

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    fetch('/api/users/me/notifications')
      .then(r => r.json())
      .then(data => setNotifications(data.notifications ?? []))
      .catch(() => {})
  }, [])

  const unread = notifications.filter(n => !n.isRead).length

  async function markRead(id: string) {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
    await fetch(`/api/users/me/notifications/${id}`, { method: 'PATCH' })
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-lg hover:bg-white/10 transition-colors"
        aria-label="Notifications"
      >
        <Bell size={20} strokeWidth={1.5} className="text-white" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-gold text-ink text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-mist bg-white shadow-lg z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-mist">
              <h3 className="font-semibold text-sm">Notifications</h3>
            </div>
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-fog text-sm">No notifications yet</div>
            ) : (
              <div className="max-h-80 overflow-y-auto divide-y divide-mist">
                {notifications.map(n => (
                  <div
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    className={`px-4 py-3 cursor-pointer hover:bg-snow transition-colors ${!n.isRead ? 'bg-blue-50/50' : ''}`}
                  >
                    <p className={`text-sm ${!n.isRead ? 'font-medium text-ink' : 'text-slate'}`}>{n.title}</p>
                    <p className="text-xs text-fog mt-0.5">{n.body}</p>
                    <p className="text-xs text-fog mt-1">{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
