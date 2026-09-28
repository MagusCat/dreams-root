// Decorative sky (aria-hidden). Star positions are deterministic so they don't
// jump between screens.
const STARS = Array.from({ length: 52 }, (_, i) => ({
  left: (i * 97 + 13) % 100,
  top: (i * 41 + 7) % 78,
  size: (i % 4) === 0 ? 3 : (i % 2) === 0 ? 2 : 1.5,
  delay: ((i * 3) % 12) * 0.35,
  opacity: (i % 3 === 0) ? 0.9 : 0.6,
}))

// Extra stars that fade in as the form progresses (level 0→1): the sky fills up.
// Static (no twinkle) so the inline opacity gate is not overridden by animation.
const EXTRA_STARS = Array.from({ length: 70 }, (_, i) => ({
  left: (i * 73 + 29) % 100,
  top: (i * 57 + 11) % 84,
  size: (i % 3 === 0) ? 2 : 1.5,
  appearAt: (i + 1) / 71, // spread across the whole progress
  opacity: (i % 3 === 0) ? 0.85 : 0.5,
}))

// level: 0 at the start of the flow → 1 at the end. Drives how "full" the sky is.
export default function Background({ level = 0 }: { level?: number }) {
  // Stars glow brighter as the flow advances, so the closing screen feels warmer.
  const starGlow = (base: number) =>
    `0 0 ${Math.round(6 + level * 14)}px rgba(255,255,255,${Math.min(1, base + level * 0.5).toFixed(2)})`
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden select-none">
      {/* Nebulas: soft luminous cosmic dust; glow a bit more as the form advances. */}
      <div
        className="animate-nebula absolute -top-24 left-1/4 h-96 w-96 rounded-full bg-violet-600/20 blur-[120px] transition-opacity duration-[1500ms]"
        style={{ opacity: 0.8 + level * 0.4 }}
      />
      <div
        className="animate-nebula absolute top-1/3 -right-20 h-[30rem] w-[30rem] rounded-full bg-indigo-600/20 blur-[140px] transition-opacity duration-[1500ms]"
        style={{ opacity: 0.8 + level * 0.4 }}
      />
      <div
        className="animate-nebula absolute -bottom-20 left-10 h-80 w-80 rounded-full bg-fuchsia-600/15 blur-[100px] transition-opacity duration-[1500ms]"
        style={{ opacity: 0.7 + level * 0.5 }}
      />

      {STARS.map((s, i) => (
        <span
          key={i}
          className="star absolute rounded-full bg-white"
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

      {/* Extra stars: fade in progressively with the form's progress. */}
      {EXTRA_STARS.map((s, i) => (
        <span
          key={`x${i}`}
          className="absolute rounded-full bg-white transition-opacity duration-[1500ms] ease-out"
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
      <div className="absolute right-8 top-8 h-28 w-28 rounded-full bg-white/95 shadow-[0_0_80px_30px_rgba(192,132,252,0.45)] border border-purple-100/50 backdrop-blur-sm" />

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

      <div className="cloud-a absolute bottom-20 left-[-8%] h-28 w-80 rounded-full bg-indigo-300/15 blur-3xl" />
      <div className="cloud-b absolute bottom-36 right-[-10%] h-32 w-96 rounded-full bg-purple-300/15 blur-3xl" />
      <div className="cloud-c absolute bottom-4 left-[20%] h-24 w-72 rounded-full bg-white/10 blur-3xl" />

      {/* Extra clouds that roll in as the form advances. */}
      <div
        className="cloud-b absolute top-1/2 left-[-10%] h-24 w-80 rounded-full bg-violet-300/12 blur-3xl transition-opacity duration-[2000ms]"
        style={{ opacity: level > 0.3 ? 1 : 0 }}
      />
      <div
        className="cloud-a absolute top-1/3 right-[-12%] h-28 w-96 rounded-full bg-white/10 blur-3xl transition-opacity duration-[2000ms]"
        style={{ opacity: level > 0.6 ? 1 : 0 }}
      />

      <span className="shooting" />
    </div>
  )
}

