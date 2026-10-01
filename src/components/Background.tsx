// Decorative sky (aria-hidden). Star positions are deterministic so they don't
// jump between screens. Hash (not i*k % 100) so the mobile subsets don't line up.
const rand = (n: number) => {
  const x = Math.sin(n * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

const STARS = Array.from({ length: 52 }, (_, i) => ({
  left: rand(i + 1) * 100,
  top: rand(i + 101) * 78,
  size: (i % 4) === 0 ? 3 : (i % 2) === 0 ? 2 : 1.5,
  delay: ((i * 3) % 12) * 0.35,
  opacity: (i % 3 === 0) ? 0.9 : 0.6,
}))

const EXTRA_STARS = Array.from({ length: 70 }, (_, i) => ({
  left: rand(i + 201) * 100,
  top: rand(i + 301) * 84,
  size: (i % 3 === 0) ? 2 : 1.5,
  appearAt: (i + 1) / 71,
  opacity: (i % 3 === 0) ? 0.85 : 0.5,
}))

// Soft blob via gradient instead of filter: blur(), which is very costly on mobile GPUs.
const glow = (rgba: string) => `radial-gradient(closest-side, rgba(${rgba}), transparent)`

export default function Background({ level = 0, paused = false }: { level?: number; paused?: boolean }) {
  const starGlow = (base: number) =>
    `0 0 ${Math.round(6 + level * 14)}px rgba(255,255,255,${Math.min(1, base + level * 0.5).toFixed(2)})`
  return (
    <div aria-hidden className={`pointer-events-none fixed inset-0 overflow-hidden select-none ${paused ? 'sky-paused' : ''}`}>
      <div
        className="animate-nebula absolute -top-24 left-1/4 h-96 w-96 transition-opacity duration-[1500ms]"
        style={{ background: glow('124,58,237,0.2'), opacity: 0.8 + level * 0.4 }}
      />
      <div
        className="animate-nebula absolute top-1/3 -right-20 h-[30rem] w-[30rem] transition-opacity duration-[1500ms]"
        style={{ background: glow('79,70,229,0.2'), opacity: 0.8 + level * 0.4 }}
      />
      <div
        className="animate-nebula absolute -bottom-20 left-10 h-80 w-80 transition-opacity duration-[1500ms]"
        style={{ background: glow('192,38,211,0.15'), opacity: 0.7 + level * 0.5 }}
      />

      {STARS.map((s, i) => (
        <span
          key={i}
          className={`star absolute rounded-full bg-white ${i % 2 ? 'hidden sm:block' : ''}`}
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            opacity: s.opacity,
            animationDelay: `${s.delay}s`,
            boxShadow: starGlow(0.55),
          }}
        />
      ))}

      {EXTRA_STARS.map((s, i) => (
        <span
          key={`x${i}`}
          className={`absolute rounded-full bg-white transition-opacity duration-[1500ms] ease-out ${i % 3 ? 'hidden sm:block' : ''}`}
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            opacity: level >= s.appearAt ? Math.min(1, s.opacity + level * 0.3) : 0,
            boxShadow: starGlow(0.45),
          }}
        />
      ))}

      <div
        className="absolute -right-12 -top-12 h-64 w-64 rounded-full"
        style={{
          background:
            'radial-gradient(circle at 40% 40%, rgba(255,255,255,0.95) 0%, rgba(237,233,254,0.4) 40%, rgba(139,92,246,0) 70%)',
        }}
      />
      <div className="absolute right-8 top-8 h-28 w-28 rounded-full bg-white/95 shadow-[0_0_80px_30px_rgba(192,132,252,0.45)] border border-purple-100/50" />

      <svg className="planet absolute left-8 top-24 h-24 w-24 opacity-85 filter drop-shadow-[0_0_12px_rgba(167,139,250,0.4)]" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="planet-fill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#c4b5fd" />
            <stop offset="60%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#4f46e5" />
          </linearGradient>
        </defs>
        <ellipse cx="50" cy="52" rx="46" ry="12" fill="none" stroke="#e9d5ff" strokeWidth="3.5" opacity="0.75" />
        <circle cx="50" cy="50" r="22" fill="url(#planet-fill)" />
      </svg>

      <div className="cloud-a absolute bottom-20 left-[-8%] h-28 w-80" style={{ background: glow('165,180,252,0.15') }} />
      <div className="cloud-b absolute bottom-36 right-[-10%] h-32 w-96" style={{ background: glow('216,180,254,0.15') }} />
      <div className="cloud-c absolute bottom-4 left-[20%] h-24 w-72" style={{ background: glow('255,255,255,0.1') }} />

      <div
        className="cloud-b absolute top-1/2 left-[-10%] h-24 w-80 transition-opacity duration-[2000ms]"
        style={{ background: glow('196,181,253,0.12'), opacity: level > 0.3 ? 1 : 0 }}
      />
      <div
        className="cloud-a absolute top-1/3 right-[-12%] h-28 w-96 transition-opacity duration-[2000ms]"
        style={{ background: glow('255,255,255,0.1'), opacity: level > 0.6 ? 1 : 0 }}
      />

      <span className="shooting" />
    </div>
  )
}

