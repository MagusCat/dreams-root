type Scale = { min: number; max: number; labels: string[] }

// One Likert item: statement + a slider (MAAS/PPS). End labels sit at each
// corner; the current choice shows below. Untouched until the user interacts, so
// an unanswered item never counts as the midpoint.
export default function LikertScale({
  index,
  text,
  scale,
  value,
  onChange,
}: {
  index: number
  text: string
  scale: Scale
  value: number | undefined
  onChange: (v: number) => void
}) {
  const answered = typeof value === 'number'
  const mid = Math.round((scale.min + scale.max) / 2)
  const current = answered ? value : mid
  const currentLabel = answered ? scale.labels[value - scale.min] : '— sin responder —'
  const lastLabel = scale.labels[scale.labels.length - 1]

  return (
    <div
      className={`rounded-2xl border bg-white p-4 sm:p-5 transition-colors duration-200 ${
        answered ? 'border-violet-200' : 'border-slate-200 hover:border-violet-200'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-violet-100/80 text-xs font-bold text-violet-700">
          {index < 10 ? `0${index}` : index}
        </span>
        <p className="flex-1 text-sm font-medium leading-relaxed text-slate-800">{text}</p>
      </div>

      <div className="mt-5">
        <input
          type="range"
          min={scale.min}
          max={scale.max}
          step={1}
          value={current}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={text}
          aria-valuetext={currentLabel}
          className={`dreams-range w-full ${answered ? '' : 'dreams-range--empty'}`}
        />

        <div className="mt-2 flex justify-between gap-3 text-[11px] font-medium leading-tight text-slate-500">
          <span className="max-w-[45%] text-left">
            {scale.min} · {scale.labels[0]}
          </span>
          <span className="max-w-[45%] text-right">
            {scale.max} · {lastLabel}
          </span>
        </div>

        <div
          className={`mt-1.5 text-center text-[11px] transition-colors duration-200 ${
            answered ? 'font-medium text-slate-500' : 'text-slate-400'
          }`}
        >
          {answered ? `${value} · ${currentLabel}` : currentLabel}
        </div>
      </div>
    </div>
  )
}
