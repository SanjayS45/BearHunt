'use client'
import { useRef, useEffect, useState } from 'react'
import { useInView } from 'framer-motion'
import { MapPin, Camera, CheckCircle } from 'lucide-react'

const LOCATION = 'Dwinelle 155, under the front-left desk'

const CARDS = [
  { emoji: '🎒', desc: 'Black Nike drawstring bag', area: 'Sproul Plaza', bounty: 8 },
  { emoji: '💧', desc: "Blue Hydro Flask with 'Cal' sticker", area: 'Dwinelle Hall', bounty: 5 },
  { emoji: '🎧', desc: 'AirPods Pro in white case', area: 'Moffitt Library', bounty: 20 },
]

export function DemoClaimBounty() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: false, margin: '-80px' })
  const [phase, setPhase] = useState(0)
  const [typedLoc, setTypedLoc] = useState('')
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    if (!isInView) { setPhase(0); setTypedLoc(''); return }

    const at = (fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)) }
    at(() => setPhase(1), 400)   // card highlights
    at(() => setPhase(2), 1100)  // claim form slides in
    at(() => setPhase(3), 1800)  // photo 1 fills
    at(() => setPhase(4), 2200)  // photo 2 fills
    at(() => setPhase(5), 2500)  // start typing location
    at(() => setPhase(6), 4000)  // submit glows
    at(() => setPhase(7), 4700)  // success

    return () => timers.current.forEach(clearTimeout)
  }, [isInView])

  useEffect(() => {
    if (phase !== 5) { if (phase < 5) setTypedLoc(''); return }
    let i = 0
    const iv = setInterval(() => {
      if (i < LOCATION.length) setTypedLoc(LOCATION.slice(0, ++i))
      else clearInterval(iv)
    }, 42)
    return () => clearInterval(iv)
  }, [phase])

  return (
    <div ref={ref} className="bg-white rounded-2xl border border-mist shadow-lg overflow-hidden select-none">
      <BrowserChrome url="bearhunt.online" />

      <div className="p-4">
        {phase < 2 ? (
          <>
            <p className="text-[11px] font-semibold text-fog uppercase tracking-wider mb-3">Bounty Board · 3 active items</p>
            <div className="grid grid-cols-3 gap-2">
              {CARDS.map((card, i) => (
                <div
                  key={i}
                  className={`rounded-xl border overflow-hidden transition-all duration-500 cursor-pointer ${phase >= 1 && i === 1 ? 'border-berkeley-blue shadow-md ring-2 ring-berkeley-blue/20 scale-[1.04]' : 'border-mist'}`}
                >
                  <div className={`aspect-square flex items-center justify-center text-2xl ${i === 1 ? 'bg-berkeley-blue/5' : 'bg-snow'}`}>
                    {card.emoji}
                  </div>
                  <div className="p-1.5">
                    <p className="text-[10px] font-medium text-ink line-clamp-2 leading-tight">{card.desc}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[9px] text-fog truncate">{card.area}</span>
                      <span className="bg-gold text-ink text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0">${card.bounty}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : phase < 7 ? (
          <div className="animate-in fade-in duration-300">
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-mist">
              <div className="w-8 h-8 rounded-xl bg-berkeley-blue/5 border border-mist flex items-center justify-center text-lg">💧</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-ink truncate">Blue Hydro Flask</p>
                <p className="text-[10px] text-fog">Dwinelle Hall · <span className="text-gold font-semibold">$5 bounty</span></p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-medium text-ink">Proof photos *</label>
                <div className="grid grid-cols-4 gap-1.5 mt-1">
                  {[0, 1, 2, 3].map(i => (
                    <div
                      key={i}
                      className={`aspect-square rounded-lg border-2 flex items-center justify-center transition-all duration-400 ${phase >= 3 + i ? 'border-success bg-success/10' : 'border-dashed border-mist bg-snow'}`}
                    >
                      {phase >= 3 + i
                        ? <CheckCircle size={16} className="text-success" />
                        : <Camera size={13} strokeWidth={1.5} className="text-fog" />}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-ink flex items-center gap-1">
                  <MapPin size={10} strokeWidth={2} /> Where did you find it? *
                </label>
                <div className={`mt-1 w-full rounded-lg border text-[11px] px-3 py-2 transition-colors ${phase >= 5 ? 'border-berkeley-blue text-ink' : 'border-mist text-fog bg-snow'}`}>
                  {phase < 5 ? 'e.g. Dwinelle 155…' : (typedLoc || 'e.g. Dwinelle 155…')}
                  {phase === 5 && <span className="inline-block w-px h-3 bg-berkeley-blue ml-px animate-pulse" />}
                </div>
              </div>

              <button
                className={`w-full h-9 rounded-lg text-xs font-semibold transition-all duration-300 ${phase >= 6 ? 'bg-berkeley-blue text-white' : 'bg-mist text-fog'}`}
                style={phase >= 6 ? { boxShadow: '0 4px 14px rgba(0,50,98,0.35)' } : {}}
              >
                Submit Claim
              </button>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in duration-300 flex flex-col items-center justify-center py-4 text-center">
            <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mb-3">
              <CheckCircle size={26} className="text-success" />
            </div>
            <p className="font-semibold text-sm text-ink">Claim submitted!</p>
            <p className="text-[11px] text-fog mt-1 max-w-[180px]">The owner has been notified and will review your proof.</p>
            <div className="mt-3 px-3 py-2 rounded-lg bg-gold/10 border border-gold/30">
              <span className="text-xs font-semibold text-ink">$5 bounty pending your way</span>
            </div>
          </div>
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
