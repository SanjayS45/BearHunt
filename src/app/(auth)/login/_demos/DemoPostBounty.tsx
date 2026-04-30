'use client'
import { useRef, useEffect, useState } from 'react'
import { useInView } from 'framer-motion'
import { MapPin } from 'lucide-react'

const DESCRIPTION = "Blue Hydro Flask with 'Cal' sticker, dent on bottom"
const AREA = 'Dwinelle Hall'

export function DemoPostBounty() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: false, margin: '-80px' })
  const [phase, setPhase] = useState(0)
  const [typedDesc, setTypedDesc] = useState('')
  const [typedArea, setTypedArea] = useState('')
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    if (!isInView) { setPhase(0); setTypedDesc(''); setTypedArea(''); return }

    const at = (fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)) }
    at(() => setPhase(1), 400)
    at(() => setPhase(2), 2600)
    at(() => setPhase(3), 3000)
    at(() => setPhase(4), 4200)
    at(() => setPhase(5), 4800)
    at(() => setPhase(6), 5800)

    return () => timers.current.forEach(clearTimeout)
  }, [isInView])

  useEffect(() => {
    if (phase !== 1) { if (phase === 0) setTypedDesc(''); return }
    let i = 0
    const iv = setInterval(() => {
      if (i < DESCRIPTION.length) setTypedDesc(DESCRIPTION.slice(0, ++i))
      else clearInterval(iv)
    }, 38)
    return () => clearInterval(iv)
  }, [phase])

  useEffect(() => {
    if (phase !== 3) { if (phase < 3) setTypedArea(''); return }
    let i = 0
    const iv = setInterval(() => {
      if (i < AREA.length) setTypedArea(AREA.slice(0, ++i))
      else clearInterval(iv)
    }, 65)
    return () => clearInterval(iv)
  }, [phase])

  return (
    <div ref={ref} className="bg-white rounded-2xl border border-mist shadow-lg overflow-hidden select-none">
      <BrowserChrome url="bearhunt.online/tickets/new" />

      <div className="p-4">
        {phase < 5 ? (
          <>
            <p className="font-bold text-sm text-ink">Post a Lost Item</p>
            <p className="text-xs text-fog mb-3">Step 1 of 3</p>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-medium text-ink">Item description *</label>
                <div className={`mt-1 w-full rounded-lg border text-xs px-3 py-2 min-h-[52px] leading-relaxed transition-colors ${phase >= 1 ? 'border-berkeley-blue text-ink' : 'border-mist text-fog bg-snow'}`}>
                  {phase === 0 ? 'e.g. Blue Hydro Flask with Cal Hiking Club sticker…' : typedDesc}
                  {phase === 1 && <span className="inline-block w-px h-3 bg-berkeley-blue ml-px animate-pulse" />}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-ink">Category *</label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {['Water Bottle', 'Phone', 'Wallet', 'Keys', 'Bag', 'Other'].map(cat => (
                    <span
                      key={cat}
                      className={`px-2.5 py-1 rounded-full text-[11px] border transition-all duration-300 ${phase >= 2 && cat === 'Water Bottle' ? 'bg-berkeley-blue text-white border-berkeley-blue shadow-sm' : 'border-mist text-slate'}`}
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-ink flex items-center gap-1">
                  <MapPin size={10} strokeWidth={2} />
                  Where do you think you lost it? *
                </label>
                <div className={`mt-1 w-full rounded-lg border text-xs px-3 py-2 transition-colors ${phase >= 3 ? 'border-berkeley-blue text-ink' : 'border-mist text-fog bg-snow'}`}>
                  {phase < 3 ? 'e.g. Dwinelle Hall' : typedArea}
                  {phase === 3 && <span className="inline-block w-px h-3 bg-berkeley-blue ml-px animate-pulse" />}
                </div>
              </div>
            </div>

            <button
              className={`mt-4 w-full h-9 rounded-lg text-xs font-semibold transition-all duration-300 ${phase >= 4 ? 'bg-berkeley-blue text-white shadow-md' : 'bg-mist text-fog'}`}
              style={phase >= 4 ? { boxShadow: '0 4px 14px rgba(0,50,98,0.35)' } : {}}
            >
              {phase >= 4 ? 'Next →' : 'Next'}
            </button>
          </>
        ) : (
          <>
            <p className="font-bold text-sm text-ink">Set Your Bounty</p>
            <p className="text-xs text-fog mb-3">Step 2 of 3</p>

            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-snow border border-mist text-xs text-slate">
                <span className="font-medium text-ink">Blue Hydro Flask</span> · Dwinelle Hall
              </div>

              <div>
                <label className="text-[11px] font-medium text-ink">Bounty amount *</label>
                <p className="text-[11px] text-fog mb-1.5">Most people offer $2–$5 for water bottles</p>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate text-xs font-medium">$</span>
                  <div className={`w-full rounded-lg border text-xs pl-6 pr-3 py-2 transition-all duration-500 ${phase >= 6 ? 'border-berkeley-blue text-ink font-semibold' : 'border-mist text-fog bg-snow'}`}>
                    {phase >= 6 ? '5.00' : ''}
                  </div>
                </div>
              </div>

              {phase >= 6 && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-400 flex items-center justify-between p-3 rounded-xl bg-berkeley-blue/5 border border-berkeley-blue/20">
                  <div>
                    <p className="text-xs font-semibold text-ink">Blue Hydro Flask</p>
                    <p className="text-[10px] text-fog flex items-center gap-0.5 mt-0.5">
                      <MapPin size={9} strokeWidth={2} /> Dwinelle Hall · just now
                    </p>
                  </div>
                  <span className="bg-gold text-ink text-[11px] font-bold px-2.5 py-1 rounded-full">$5</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
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
