'use client'
import { useRef, useEffect, useState } from 'react'
import { useInView } from 'framer-motion'
import { CheckCircle, Send } from 'lucide-react'

const MESSAGES = [
  { from: 'owner', text: "Hey! Does it have a 'Cal Hiking Club' sticker on the side?" },
  { from: 'finder', text: "Yes! And there's a small dent on the bottom." },
  { from: 'owner', text: "That's definitely mine 😭 Can you meet at Sather Gate at 3pm?" },
  { from: 'finder', text: 'Sure, see you there! 👍' },
]

export function DemoMeetup() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: false, margin: '-80px' })
  const [visible, setVisible] = useState(0)
  const [phase, setPhase] = useState(0) // 0=chat building, 1=button glows, 2=paid
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    if (!isInView) { setVisible(0); setPhase(0); return }

    const at = (fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)) }
    at(() => setVisible(1), 400)
    at(() => setVisible(2), 1300)
    at(() => setVisible(3), 2200)
    at(() => setVisible(4), 3000)
    at(() => setPhase(1), 4000)
    at(() => setPhase(2), 5100)

    return () => timers.current.forEach(clearTimeout)
  }, [isInView])

  return (
    <div ref={ref} className="bg-white rounded-2xl border border-mist shadow-lg overflow-hidden select-none">
      <BrowserChrome url="bearhunt.online/messages" />

      {/* Chat header */}
      <div className="border-b border-mist px-4 py-2.5 flex items-center justify-between bg-white">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-berkeley-blue flex items-center justify-center text-white text-xs font-bold">
            A
          </div>
          <div>
            <p className="text-xs font-semibold text-ink">Alex (Finder)</p>
            <p className="text-[10px] text-fog">Blue Hydro Flask · Dwinelle Hall</p>
          </div>
        </div>
        <span className="bg-gold text-ink text-[10px] font-bold px-2.5 py-1 rounded-full">$5</span>
      </div>

      {/* Messages */}
      <div className="bg-snow px-3 py-3 space-y-2 min-h-[152px]">
        {MESSAGES.slice(0, visible).map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.from === 'owner' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-1 duration-300`}
          >
            <div className={`max-w-[82%] rounded-2xl px-3 py-1.5 text-[11px] leading-relaxed ${msg.from === 'owner' ? 'bg-berkeley-blue text-white rounded-br-sm' : 'bg-white border border-mist text-ink rounded-bl-sm'}`}>
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      {/* Confirm receipt */}
      {phase === 1 && (
        <div className="border-t border-mist bg-green-50 px-3 py-2 animate-in fade-in duration-300">
          <button className="w-full h-8 rounded-lg bg-success text-white text-xs font-semibold animate-pulse">
            I Got My Item ✓
          </button>
        </div>
      )}

      {phase >= 2 && (
        <div className="border-t border-mist px-3 py-2.5 flex items-center gap-2.5 bg-green-50 animate-in fade-in duration-300">
          <CheckCircle size={18} className="text-success flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-ink">Item received — bounty released!</p>
            <p className="text-[10px] text-fog mt-0.5">$4.25 sent to Alex · $0.75 platform fee</p>
          </div>
        </div>
      )}

      {/* Input bar */}
      {phase < 2 && (
        <div className="border-t border-mist bg-white px-3 py-2 flex gap-2">
          <div className="flex-1 rounded-xl border border-mist bg-snow text-[11px] px-3 py-1.5 text-fog">
            Message…
          </div>
          <div className="w-8 h-8 rounded-xl bg-berkeley-blue flex items-center justify-center flex-shrink-0">
            <Send size={13} strokeWidth={2} className="text-white" />
          </div>
        </div>
      )}
    </div>
  )
}

function BrowserChrome({ url }: { url: string }) {
  return (
    <div className="bg-snow border-b border-mist px-3 py-2 flex items-center gap-2">
      <div className="flex gap-1.5">
        <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
        <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
        <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
      </div>
      <div className="flex-1 bg-white rounded border border-mist text-[10px] text-fog px-2 py-0.5 text-center truncate">
        {url}
      </div>
    </div>
  )
}
