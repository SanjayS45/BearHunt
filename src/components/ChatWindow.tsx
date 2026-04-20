'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Send, AlertCircle } from 'lucide-react'
import { Button } from './ui/button'
import { BountyBadge } from './BountyBadge'
import { toast } from '@/hooks/use-toast'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import type { MessageThread, Message } from '@/types'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface ChatWindowProps {
  thread: MessageThread & {
    owner: { id: string; name: string; avatarUrl: string | null }
    finder: { id: string; name: string; avatarUrl: string | null }
    claim: {
      id: string
      ticket: { id: string; description: string; bountyAmountCents: number; category: string; status: string }
    }
    messages: (Message & { sender: { id: string; name: string; avatarUrl: string | null } })[]
  }
  currentUserId: string
  initialMessages: (Message & { sender: { id: string; name: string; avatarUrl: string | null } })[]
}

export function ChatWindow({ thread, currentUserId, initialMessages }: ChatWindowProps) {
  const [messages, setMessages] = useState(initialMessages)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const isOwner = currentUserId === thread.ownerId
  const other = isOwner ? thread.finder : thread.owner

  // Poll for new messages every 3s (reliable fallback even if Supabase realtime
  // is not enabled). Supabase realtime channel is kept for instant updates
  // when available.
  useEffect(() => {
    let cancelled = false

    async function refresh() {
      const res = await fetch(`/api/threads/${thread.id}/messages`)
      if (!res.ok || cancelled) return
      const data = await res.json()
      setMessages(prev => {
        const existing = new Set(prev.map(m => m.id))
        const incoming = (data.messages ?? []).filter((m: { id: string }) => !existing.has(m.id))
        return incoming.length > 0 ? [...prev, ...incoming] : prev
      })
    }

    const interval = setInterval(refresh, 3000)

    const channel = supabase
      .channel(`thread-${thread.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `thread_id=eq.${thread.id}`,
      }, () => { refresh() })
      .subscribe()

    return () => {
      cancelled = true
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [thread.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    setSending(true)
    const res = await fetch(`/api/threads/${thread.id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: body.trim() }),
    })
    const data = await res.json()
    if (res.ok) {
      setMessages(prev => [...prev, data.message])
      setBody('')
    } else {
      toast(data.error ?? 'Failed to send', 'error')
    }
    setSending(false)
  }

  async function confirmReceipt() {
    if (!confirm('Confirm you received your item? This will release the bounty payment to the finder.')) return
    setConfirming(true)
    const res = await fetch(`/api/tickets/${thread.claim.ticket.id}/confirm-receipt`, { method: 'POST' })
    const data = await res.json()
    if (res.ok) {
      toast('Receipt confirmed! Bounty released to finder.', 'success')
      window.location.href = `/tickets/${thread.claim.ticket.id}`
    } else {
      toast(data.error ?? 'Error', 'error')
      setConfirming(false)
    }
  }

  async function openDispute() {
    const reason = prompt('Briefly describe the issue:')
    if (!reason) return
    const res = await fetch(`/api/claims/${thread.claim.id}/disputes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    })
    if (res.ok) {
      toast('Dispute opened. Admin will review shortly.', 'success')
    } else {
      const data = await res.json()
      toast(data.error ?? 'Error opening dispute', 'error')
    }
  }

  return (
    <div className="max-w-lg mx-auto flex flex-col h-[calc(100vh-130px)]">
      {/* Header */}
      <div className="bg-white border border-mist rounded-t-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-snow border border-mist flex items-center justify-center text-sm font-bold text-slate">
            {other.name[0]}
          </div>
          <div>
            <p className="font-medium text-sm">{other.name}</p>
            <p className="text-xs text-fog truncate max-w-[180px]">{thread.claim.ticket.description}</p>
          </div>
        </div>
        <BountyBadge cents={thread.claim.ticket.bountyAmountCents} size="sm" />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-snow border-x border-mist p-4 space-y-3">
        {messages.map(msg => {
          const isMe = msg.senderId === currentUserId
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${isMe ? 'bg-berkeley-blue text-white' : 'bg-white border border-mist text-ink'}`}>
                <p>{msg.body}</p>
                <p className={`text-[10px] mt-1 ${isMe ? 'text-white/60' : 'text-fog'}`}>
                  {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Actions */}
      {isOwner && thread.claim.ticket.status === 'found' && (
        <div className="bg-green-50 border-x border-mist px-4 py-3 flex gap-2">
          <Button onClick={confirmReceipt} disabled={confirming} className="flex-1 bg-success hover:bg-green-600">
            {confirming ? 'Confirming…' : 'I Got My Item ✓'}
          </Button>
          <Button variant="ghost" onClick={openDispute} className="text-danger">
            <AlertCircle size={16} strokeWidth={1.5} />
          </Button>
        </div>
      )}

      {!isOwner && (
        <div className="bg-snow border-x border-mist px-4 py-2 flex justify-end">
          <button onClick={openDispute} className="text-xs text-fog hover:text-danger transition-colors flex items-center gap-1">
            <AlertCircle size={12} strokeWidth={1.5} /> Report issue
          </button>
        </div>
      )}

      {/* Input */}
      <form onSubmit={sendMessage} className="bg-white border border-mist rounded-b-xl p-3 flex gap-2">
        <input
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Message…"
          className="flex-1 text-sm px-3 py-2 rounded-lg border border-mist focus:outline-none focus:border-berkeley-blue"
          disabled={thread.status !== 'active'}
        />
        <Button type="submit" size="icon" disabled={sending || !body.trim() || thread.status !== 'active'}>
          <Send size={16} strokeWidth={1.5} />
        </Button>
      </form>
    </div>
  )
}
